import { Body, Controller, Get, Param, Post, UploadedFile, UseInterceptors } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { FileInterceptor } from '@nestjs/platform-express';
import { createDonationSchema } from '@lawhi/shared';
import type { z } from 'zod';
import { CurrentUser, Public } from '../../common/decorators/auth.decorators';
import { ZodValidationPipe } from '../../common/pipes/zod-validation.pipe';
import type { AuthUser } from '../auth/auth.types';
import { submitReferenceSchema, uuidSchema } from './donations.schemas';
import { DonationsService } from './donations.service';
import { MAX_PROOF_BYTES } from './proof-file';

@Controller('donations')
export class DonationsController {
  constructor(private readonly donations: DonationsService) {}

  @Public()
  @Get('causes')
  causes() {
    return this.donations.listCauses();
  }

  @Public()
  @Get('payment-methods')
  paymentMethods() {
    return this.donations.listPaymentMethods();
  }

  @Throttle({ default: { limit: 10, ttl: 60_000 } })
  @Post()
  create(
    @CurrentUser() user: AuthUser,
    @Body(new ZodValidationPipe(createDonationSchema)) body: z.output<typeof createDonationSchema>,
  ) {
    return this.donations.create(user.id, body);
  }

  @Get('mine')
  mine(@CurrentUser() user: AuthUser) {
    return this.donations.listMine(user.id);
  }

  @Get(':id')
  one(@CurrentUser() user: AuthUser, @Param('id', new ZodValidationPipe(uuidSchema)) id: string) {
    return this.donations.getMine(user.id, id);
  }

  @Post(':id/reference')
  reference(
    @CurrentUser() user: AuthUser,
    @Param('id', new ZodValidationPipe(uuidSchema)) id: string,
    @Body(new ZodValidationPipe(submitReferenceSchema)) body: { reference: string },
  ) {
    return this.donations.submitReference(user.id, id, body.reference);
  }

  @Throttle({ default: { limit: 10, ttl: 60_000 } })
  @Post(':id/proof')
  @UseInterceptors(FileInterceptor('file', { limits: { fileSize: MAX_PROOF_BYTES, files: 1 } }))
  proof(
    @CurrentUser() user: AuthUser,
    @Param('id', new ZodValidationPipe(uuidSchema)) id: string,
    @UploadedFile() file: Express.Multer.File | undefined,
  ) {
    return this.donations.attachProof(user.id, id, file);
  }

  @Post(':id/cancel')
  cancel(
    @CurrentUser() user: AuthUser,
    @Param('id', new ZodValidationPipe(uuidSchema)) id: string,
  ) {
    return this.donations.cancel(user.id, id);
  }
}
