import { Inject, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createRemoteJWKSet, jwtVerify, type JWTVerifyGetKey } from 'jose';
import type { Env } from '../../config/env';

/** Key resolver used to verify Supabase access tokens. Overridable in tests. */
export const JWT_KEY_RESOLVER = Symbol('JWT_KEY_RESOLVER');

export interface VerifiedToken {
  sub: string;
  email: string | null;
}

export function supabaseJwksResolver(config: ConfigService<Env, true>): JWTVerifyGetKey | null {
  const url = config.get('SUPABASE_URL', { infer: true });
  return url ? createRemoteJWKSet(new URL('/auth/v1/.well-known/jwks.json', url)) : null;
}

@Injectable()
export class TokenVerifier {
  private readonly issuer: string | undefined;

  constructor(
    @Inject(JWT_KEY_RESOLVER) private readonly keys: JWTVerifyGetKey | null,
    config: ConfigService<Env, true>,
  ) {
    const url = config.get('SUPABASE_URL', { infer: true });
    this.issuer = url ? new URL('/auth/v1', url).toString() : undefined;
  }

  /** Returns null for any invalid, expired or foreign token. */
  async verify(token: string): Promise<VerifiedToken | null> {
    if (!this.keys) return null;
    try {
      const { payload } = await jwtVerify(token, this.keys, {
        audience: 'authenticated',
        ...(this.issuer ? { issuer: this.issuer } : {}),
      });
      if (typeof payload.sub !== 'string') return null;
      return {
        sub: payload.sub,
        email: typeof payload.email === 'string' ? payload.email.toLowerCase() : null,
      };
    } catch {
      return null;
    }
  }
}
