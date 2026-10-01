import {
  Body,
  Controller,
  Get,
  Injectable,
  NotFoundException,
  Param,
  Patch,
  Post,
  Put,
  UnprocessableEntityException,
} from '@nestjs/common';
import { updatePaymentMethodSchema } from '@lawhi/shared';
import type { z } from 'zod';
import { Roles } from '../../common/decorators/auth.decorators';
import { ZodValidationPipe } from '../../common/pipes/zod-validation.pipe';
import { PrismaService } from '../../database/prisma.service';
import { DONATION_PRESETS_KEY } from '../settings/settings.module';
import {
  createCauseSchema,
  donationPresetsSchema,
  updateCauseSchema,
  uuidSchema,
  type CreateCauseInput,
  type UpdateCauseInput,
} from './donations.schemas';

type UpdatePaymentMethod = z.output<typeof updatePaymentMethodSchema>;

@Injectable()
export class DonationConfigService {
  constructor(private readonly prisma: PrismaService) {}

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

  createCause(input: CreateCauseInput) {
    return this.prisma.donationCause.create({ data: input });
  }

  async updateCause(id: string, input: UpdateCauseInput) {
    const exists = await this.prisma.donationCause.findUnique({ where: { id }, select: { id: true } });
    if (!exists) throw new NotFoundException({ error: 'cause_not_found' });
    return this.prisma.donationCause.update({ where: { id }, data: input });
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

  @Put('donation-presets')
  presets(@Body(new ZodValidationPipe(donationPresetsSchema)) body: { presets: number[] }) {
    return this.config.setPresets(body.presets);
  }
}
