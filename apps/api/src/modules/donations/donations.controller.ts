import {
  Body,
  Controller,
  Get,
  Inject,
  NotFoundException,
  Param,
  Post,
  Res,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import type { Response } from 'express';
import { Throttle } from '@nestjs/throttler';
import { FileInterceptor } from '@nestjs/platform-express';
import { createDonationSchema } from '@lawhi/shared';
import type { z } from 'zod';
import { CurrentUser, Public } from '../../common/decorators/auth.decorators';
import { ZodValidationPipe } from '../../common/pipes/zod-validation.pipe';
import type { AuthUser } from '../auth/auth.types';
import { CAUSE_IMAGE_STORAGE, type CauseImageStorage } from '../storage/cause-image-storage';
import { submitReferenceSchema, uuidSchema } from './donations.schemas';
import { DonationsService } from './donations.service';
import { MAX_PROOF_BYTES } from './proof-file';

@Controller('donations')
export class DonationsController {
  constructor(
    private readonly donations: DonationsService,
    @Inject(CAUSE_IMAGE_STORAGE) private readonly images: CauseImageStorage | null,
  ) {}

  @Public()
  @Get('summary')
  summary() {
    return this.donations.summary();
  }

  /** Cover images when stored on disk (development); Supabase serves them directly otherwise. */
  @Public()
  @Get('cause-images/:name')
  async causeImage(@Param('name') name: string, @Res() res: Response) {
    const image = await this.images?.read(name);
    if (!image) throw new NotFoundException({ error: 'image_not_found' });
    res.setHeader('Content-Type', image.contentType);
    res.setHeader('Cache-Control', 'public, max-age=86400, immutable');
    res.setHeader('Cross-Origin-Resource-Policy', 'cross-origin');
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.send(image.content);
  }

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
