import { randomUUID } from 'node:crypto';
import {
  BadRequestException,
  Body,
  ConflictException,
  Controller,
  Delete,
  Get,
  Inject,
  Injectable,
  NotFoundException,
  Param,
  Patch,
  Post,
  Put,
  ServiceUnavailableException,
  UnprocessableEntityException,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { updateDonationSummarySchema, updatePaymentMethodSchema } from '@lawhi/shared';
import type { z } from 'zod';
import { Roles } from '../../common/decorators/auth.decorators';
import { ZodValidationPipe } from '../../common/pipes/zod-validation.pipe';
import { PrismaService } from '../../database/prisma.service';
import { DONATION_PRESETS_KEY } from '../settings/settings.module';
import { CAUSE_IMAGE_STORAGE, type CauseImageStorage } from '../storage/cause-image-storage';
import {
  createCauseSchema,
  donationPresetsSchema,
  updateCauseSchema,
  uuidSchema,
  type CreateCauseInput,
  type UpdateCauseInput,
} from './donations.schemas';
import { DONATION_TOTAL_KEY, DonationsService } from './donations.service';
import { detectImageType, MAX_CAUSE_IMAGE_BYTES } from './proof-file';

type UpdatePaymentMethod = z.output<typeof updatePaymentMethodSchema>;
type UpdateDonationSummary = z.output<typeof updateDonationSummarySchema>;

@Injectable()
export class DonationConfigService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly donations: DonationsService,
    @Inject(CAUSE_IMAGE_STORAGE) private readonly images: CauseImageStorage | null,
  ) {}

  /** Sets the public total (stamped with today's date) and/or the Bankily number. */
  async updateSummary(input: UpdateDonationSummary) {
    await this.prisma.$transaction(async (tx) => {
      if (input.totalAmount !== undefined) {
        const value = { amount: input.totalAmount, updatedAt: new Date().toISOString() };
        await tx.appConfig.upsert({
          where: { key: DONATION_TOTAL_KEY },
          create: { key: DONATION_TOTAL_KEY, value },
          update: { value },
        });
      }
      if (input.bankilyPhone !== undefined) {
        const data = { phoneNumber: input.bankilyPhone, enabled: true };
        await tx.paymentMethod.upsert({
          where: { operator: 'bankily' },
          create: { name: 'Bankily', operator: 'bankily', ...data },
          update: data,
        });
      }
    });
    return this.donations.summary();
  }

  paymentMethods() {
    return this.prisma.paymentMethod.findMany({ orderBy: { sortOrder: 'asc' } });
  }

  async updatePaymentMethod(id: string, input: UpdatePaymentMethod) {
    const current = await this.prisma.paymentMethod.findUnique({ where: { id } });
    if (!current) throw new NotFoundException({ error: 'payment_method_not_found' });
    const phoneNumber = input.phoneNumber !== undefined ? input.phoneNumber : current.phoneNumber;
    const enabled = input.enabled ?? current.enabled;
    if (enabled && !phoneNumber) {
      throw new UnprocessableEntityException({ error: 'enabled_method_requires_phone' });
    }
    return this.prisma.paymentMethod.update({ where: { id }, data: input });
  }

  causes() {
    return this.prisma.donationCause.findMany({ orderBy: { sortOrder: 'asc' } });
  }

  async createCause(input: CreateCauseInput) {
    const taken = await this.prisma.donationCause.findUnique({
      where: { slug: input.slug },
      select: { id: true },
    });
    if (taken) throw new ConflictException({ error: 'cause_slug_taken' });
    return this.prisma.donationCause.create({ data: input });
  }

  async updateCause(id: string, input: UpdateCauseInput) {
    const exists = await this.prisma.donationCause.findUnique({
      where: { id },
      select: { id: true },
    });
    if (!exists) throw new NotFoundException({ error: 'cause_not_found' });
    return this.prisma.donationCause.update({ where: { id }, data: input });
  }

  /**
   * Deletes a cause, or archives it (hidden from donors) when donations already
   * reference it, so their history stays intact.
   */
  async deleteCause(id: string) {
    const cause = await this.prisma.donationCause.findUnique({
      where: { id },
      select: { imageUrl: true, _count: { select: { donations: true } } },
    });
    if (!cause) throw new NotFoundException({ error: 'cause_not_found' });
    if (cause._count.donations > 0) {
      await this.prisma.donationCause.update({ where: { id }, data: { active: false } });
      return { deleted: false, archived: true };
    }
    await this.prisma.donationCause.delete({ where: { id } });
    if (cause.imageUrl) await this.images?.remove(cause.imageUrl).catch(() => undefined);
    return { deleted: true, archived: false };
  }

  async setCauseImage(id: string, file: { buffer: Buffer; size: number } | undefined) {
    if (!this.images) throw new ServiceUnavailableException({ error: 'image_storage_unavailable' });
    if (!file || file.size === 0) throw new BadRequestException({ error: 'image_missing' });
    if (file.size > MAX_CAUSE_IMAGE_BYTES)
      throw new BadRequestException({ error: 'image_too_large' });
    const detected = detectImageType(file.buffer);
    if (!detected) throw new BadRequestException({ error: 'image_type_not_allowed' });

    const cause = await this.prisma.donationCause.findUnique({
      where: { id },
      select: { imageUrl: true },
    });
    if (!cause) throw new NotFoundException({ error: 'cause_not_found' });
    const url = await this.images.save(
      `${id}-${randomUUID()}.${detected.ext}`,
      file.buffer,
      detected.type,
    );
    const updated = await this.prisma.donationCause.update({
      where: { id },
      data: { imageUrl: url },
    });
    if (cause.imageUrl) await this.images.remove(cause.imageUrl).catch(() => undefined);
    return updated;
  }

  async removeCauseImage(id: string) {
    const cause = await this.prisma.donationCause.findUnique({
      where: { id },
      select: { imageUrl: true },
    });
    if (!cause) throw new NotFoundException({ error: 'cause_not_found' });
    const updated = await this.prisma.donationCause.update({
      where: { id },
      data: { imageUrl: null },
    });
    if (cause.imageUrl) await this.images?.remove(cause.imageUrl).catch(() => undefined);
    return updated;
  }

  async setPresets(presets: number[]) {
    const sorted = [...new Set(presets)].sort((a, b) => a - b);
    await this.prisma.appConfig.upsert({
      where: { key: DONATION_PRESETS_KEY },
      create: { key: DONATION_PRESETS_KEY, value: sorted },
      update: { value: sorted },
    });
    return { presets: sorted };
  }
}

@Roles('admin')
@Controller('admin')
export class AdminConfigController {
  constructor(private readonly config: DonationConfigService) {}

  @Get('payment-methods')
  paymentMethods() {
    return this.config.paymentMethods();
  }

  @Patch('payment-methods/:id')
  updatePaymentMethod(
    @Param('id', new ZodValidationPipe(uuidSchema)) id: string,
    @Body(new ZodValidationPipe(updatePaymentMethodSchema)) body: UpdatePaymentMethod,
  ) {
    return this.config.updatePaymentMethod(id, body);
  }

  @Get('causes')
  causes() {
    return this.config.causes();
  }

  @Post('causes')
  createCause(@Body(new ZodValidationPipe(createCauseSchema)) body: CreateCauseInput) {
    return this.config.createCause(body);
  }

  @Patch('causes/:id')
  updateCause(
    @Param('id', new ZodValidationPipe(uuidSchema)) id: string,
    @Body(new ZodValidationPipe(updateCauseSchema)) body: UpdateCauseInput,
  ) {
    return this.config.updateCause(id, body);
  }

  @Delete('causes/:id')
  deleteCause(@Param('id', new ZodValidationPipe(uuidSchema)) id: string) {
    return this.config.deleteCause(id);
  }

  @Post('causes/:id/image')
  @UseInterceptors(
    FileInterceptor('file', { limits: { fileSize: MAX_CAUSE_IMAGE_BYTES, files: 1 } }),
  )
  setCauseImage(
    @Param('id', new ZodValidationPipe(uuidSchema)) id: string,
    @UploadedFile() file: Express.Multer.File | undefined,
  ) {
    return this.config.setCauseImage(id, file);
  }

  @Delete('causes/:id/image')
  removeCauseImage(@Param('id', new ZodValidationPipe(uuidSchema)) id: string) {
    return this.config.removeCauseImage(id);
  }

  @Put('donations-summary')
  updateSummary(
    @Body(new ZodValidationPipe(updateDonationSummarySchema)) body: UpdateDonationSummary,
  ) {
    return this.config.updateSummary(body);
  }

  @Put('donation-presets')
  presets(@Body(new ZodValidationPipe(donationPresetsSchema)) body: { presets: number[] }) {
    return this.config.setPresets(body.presets);
  }
}
