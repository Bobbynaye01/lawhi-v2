import { Body, Controller, Get, Param, Patch, Query, Res } from '@nestjs/common';
import type { Response } from 'express';
import { rejectDonationSchema } from '@lawhi/shared';
import { CurrentUser, Roles } from '../../common/decorators/auth.decorators';
import { ZodValidationPipe } from '../../common/pipes/zod-validation.pipe';
import type { AuthUser } from '../auth/auth.types';
import {
  adminDonationsQuerySchema,
  confirmDonationSchema,
  uuidSchema,
  type AdminDonationsQuery,
} from './donations.schemas';
import { DonationsService } from './donations.service';

@Roles('admin')
@Controller('admin/donations')
export class AdminDonationsController {
  constructor(private readonly donations: DonationsService) {}

  @Get()
  list(@Query(new ZodValidationPipe(adminDonationsQuerySchema)) query: AdminDonationsQuery) {
    return this.donations.adminList(query);
  }

  @Get('stats')
  stats() {
    return this.donations.stats();
  }

  @Get(':id')
  one(@Param('id', new ZodValidationPipe(uuidSchema)) id: string) {
    return this.donations.adminGet(id);
  }

  /** Redirects to a 5-minute signed URL (Supabase) or streams the file (local dev). */
  @Get(':id/proof')
  async proof(@Param('id', new ZodValidationPipe(uuidSchema)) id: string, @Res() res: Response) {
    const proof = await this.donations.adminProof(id);
    res.setHeader('Cache-Control', 'no-store');
    if (proof.kind === 'url') {
      res.json({ url: proof.url, expiresIn: 300 });
      return;
    }
    res.setHeader('Content-Type', proof.contentType);
    res.setHeader('Content-Disposition', 'inline');
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.send(proof.content);
  }

  @Patch(':id/confirm')
  confirm(
    @CurrentUser() admin: AuthUser,
    @Param('id', new ZodValidationPipe(uuidSchema)) id: string,
    @Body(new ZodValidationPipe(confirmDonationSchema)) body: { note?: string },
  ) {
    return this.donations.review(admin.id, id, 'confirmed', body.note);
  }

  @Patch(':id/reject')
  reject(
    @CurrentUser() admin: AuthUser,
    @Param('id', new ZodValidationPipe(uuidSchema)) id: string,
    @Body(new ZodValidationPipe(rejectDonationSchema)) body: { reason: string },
  ) {
    return this.donations.review(admin.id, id, 'rejected', body.reason);
  }
}
