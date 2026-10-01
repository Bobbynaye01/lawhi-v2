import { Controller, Get, Query } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import {
  computePrayerDays,
  DEFAULT_MADHAB,
  DEFAULT_PRAYER_METHOD,
  PRAYER_METHODS,
  type Locale,
} from '@lawhi/shared';
import { Public } from '../../common/decorators/auth.decorators';
import { ZodValidationPipe } from '../../common/pipes/zod-validation.pipe';
import { NominatimClient } from './nominatim.client';
import {
  citySearchQuerySchema,
  prayerTimesQuerySchema,
  type PrayerTimesQuery,
} from './prayer.schemas';

@Public()
@Controller('prayer')
export class PrayerController {
  constructor(private readonly nominatim: NominatimClient) {}

  @Get('methods')
  methods() {
    return {
      defaultMethod: DEFAULT_PRAYER_METHOD,
      defaultMadhab: DEFAULT_MADHAB,
      methods: PRAYER_METHODS,
    };
  }

  @Get('times')
  times(@Query(new ZodValidationPipe(prayerTimesQuerySchema)) query: PrayerTimesQuery) {
    const method = query.method ?? DEFAULT_PRAYER_METHOD;
    const madhab = query.madhab ?? DEFAULT_MADHAB;
    return {
      latitude: query.lat,
      longitude: query.lon,
      method,
      madhab,
      days: computePrayerDays({
        latitude: query.lat,
        longitude: query.lon,
        date: query.date,
        days: query.days,
        method,
        madhab,
      }),
    };
  }

  @Throttle({ default: { limit: 20, ttl: 60_000 } })
  @Get('cities')
  cities(@Query(new ZodValidationPipe(citySearchQuerySchema)) query: { q: string; lang: Locale }) {
    return this.nominatim.searchCities(query.q, query.lang);
  }
}
