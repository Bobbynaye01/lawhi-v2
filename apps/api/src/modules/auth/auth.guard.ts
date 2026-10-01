import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import type { Request } from 'express';
import { IS_PUBLIC_KEY, ROLES_KEY } from '../../common/decorators/auth.decorators';
import { PrismaService } from '../../database/prisma.service';
import type { AuthUser } from './auth.types';
import { TokenVerifier } from './token-verifier';

/**
 * Global guard — every route requires a valid Supabase token unless marked
 * @Public(). The user row is created on first sight; the role always comes
 * from our database, never from the token.
 */
@Injectable()
export class AuthGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly verifier: TokenVerifier,
    private readonly prisma: PrismaService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const targets = [context.getHandler(), context.getClass()];
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, targets) ?? false;
    const roles = this.reflector.getAllAndOverride<AuthUser['role'][]>(ROLES_KEY, targets);
    const request = context.switchToHttp().getRequest<Request & { user?: AuthUser }>();

    const token = this.extractToken(request);
    const verified = token ? await this.verifier.verify(token) : null;

    if (!verified) {
      if (isPublic && !roles) return true;
      throw new UnauthorizedException({ error: 'unauthenticated' });
    }

    const user = await this.syncUser(verified.sub, verified.email);
    if (user.status !== 'active') throw new ForbiddenException({ error: 'account_deactivated' });

    request.user = { id: user.id, email: user.email, role: user.role };

    if (roles && !roles.includes(user.role)) throw new ForbiddenException({ error: 'forbidden' });
    return true;
  }

  /**
   * Creates the user on first sight and keeps the email in sync with Supabase.
   * Supabase guarantees one identity per email, so if another (older) row still
   * holds this email — e.g. an account deleted from the Supabase dashboard and
   * recreated — the email moves to the current identity.
   * A deactivated account is never modified (it must not get its email back).
   */
  private async syncUser(id: string, email: string | null) {
    const select = { id: true, email: true, role: true, status: true } as const;
    return this.prisma.$transaction(async (tx) => {
      const existing = await tx.user.findUnique({ where: { id }, select });
      if (existing && (existing.status !== 'active' || !email || existing.email === email)) {
        return existing;
      }
      if (email) {
        await tx.user.updateMany({ where: { email, id: { not: id } }, data: { email: null } });
      }
      return existing
        ? tx.user.update({ where: { id }, data: { email }, select })
        : tx.user.upsert({ where: { id }, create: { id, email }, update: { email }, select });
    });
  }

  private extractToken(request: Request): string | null {
    const header = request.headers.authorization;
    if (!header?.startsWith('Bearer ')) return null;
    const token = header.slice(7).trim();
    return token.length > 0 ? token : null;
  }
}
