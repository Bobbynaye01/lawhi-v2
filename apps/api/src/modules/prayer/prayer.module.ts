import { Module } from '@nestjs/common';
import { NominatimClient } from './nominatim.client';
import { PrayerController } from './prayer.controller';

@Module({
  controllers: [PrayerController],
  providers: [NominatimClient],
})
export class PrayerModule {}
