import { Controller, Get, Injectable, Module } from '@nestjs/common';
import {
  CURRENCY,
  DEFAULT_LOCALE,
  DEFAULT_MADHAB,
  DEFAULT_PRAYER_METHOD,
  LOCALES,
  MAX_DONATION_AMOUNT,
} from '@lawhi/shared';
import { z } from 'zod';
import { Public } from '../../common/decorators/auth.decorators';
import { PrismaService } from '../../database/prisma.service';

export const DONATION_PRESETS_KEY = 'donation.presets';
const presetsSchema = z.array(z.number().int().positive().max(MAX_DONATION_AMOUNT)).min(1).max(8);

@Injectable()
export class AppSettingsService {
  constructor(private readonly prisma: PrismaService) {}

  /** Donation amount presets, stored server-side (AppConfig) — never hardcoded in clients. */
  async donationPresets(): Promise<number[]> {
    const row = await this.prisma.appConfig.findUnique({ where: { key: DONATION_PRESETS_KEY } });
    const parsed = presetsSchema.safeParse(row?.value);
    return parsed.success ? parsed.data : [];
  }

  async publicConfig() {
    return {
      currency: CURRENCY,
      locales: LOCALES,
      defaultLocale: DEFAULT_LOCALE,
      prayer: { defaultMethod: DEFAULT_PRAYER_METHOD, defaultMadhab: DEFAULT_MADHAB },
      donations: { presets: await this.donationPresets(), maxAmount: MAX_DONATION_AMOUNT },
    };
  }
}

@Public()
@Controller('settings')
export class SettingsController {
  constructor(private readonly settings: AppSettingsService) {}

  @Get()
  get() {
    return this.settings.publicConfig();
  }
}

@Module({
  controllers: [SettingsController],
  providers: [AppSettingsService],
  exports: [AppSettingsService],
})
export class SettingsModule {}
