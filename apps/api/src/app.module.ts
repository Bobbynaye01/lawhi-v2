import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { APP_FILTER, APP_GUARD, APP_INTERCEPTOR } from '@nestjs/core';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';
import { AllExceptionsFilter } from './common/filters/all-exceptions.filter';
import { LoggingInterceptor } from './common/interceptors/logging.interceptor';
import { validateEnv } from './config/env';
import { PrismaModule } from './database/prisma.module';
import { AdhkarModule } from './modules/adhkar/adhkar.module';
import { AuthModule } from './modules/auth/auth.module';
import { DonationsModule } from './modules/donations/donations.module';
import { HealthModule } from './modules/health/health.controller';
import { LibraryModule } from './modules/library/library.module';
import { PrayerModule } from './modules/prayer/prayer.module';
import { QiblaModule } from './modules/qibla/qibla.controller';
import { QuranModule } from './modules/quran/quran.module';
import { SettingsModule } from './modules/settings/settings.module';
import { StorageModule } from './modules/storage/storage.module';
import { UsersModule } from './modules/users/users.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true, validate: validateEnv, cache: true }),
    // 120 requests / minute / IP by default; sensitive routes set stricter limits.
    ThrottlerModule.forRoot([{ ttl: 60_000, limit: 120 }]),
    PrismaModule,
    StorageModule,
    AuthModule,
    HealthModule,
    SettingsModule,
    QuranModule,
    PrayerModule,
    QiblaModule,
    AdhkarModule,
    LibraryModule,
    UsersModule,
    DonationsModule,
  ],
  providers: [
    // Throttling runs before authentication so floods are rejected cheaply.
    { provide: APP_GUARD, useClass: ThrottlerGuard },
    { provide: APP_FILTER, useClass: AllExceptionsFilter },
    { provide: APP_INTERCEPTOR, useClass: LoggingInterceptor },
  ],
})
export class AppModule {}
