import { CalculationMethod, Coordinates, Madhab as AdhanMadhab, PrayerTimes } from 'adhan';
import {
  DEFAULT_MADHAB,
  DEFAULT_PRAYER_METHOD,
  type Madhab,
  type Prayer,
  type PrayerMethodId,
} from '@lawhi/shared';

export interface PrayerDay {
  date: string;
  times: Record<Prayer | 'sunrise', string>;
}

export interface PrayerOptions {
  latitude: number;
  longitude: number;
  /** First local calendar date, YYYY-MM-DD. */
  date: string;
  days: number;
  method?: PrayerMethodId;
  madhab?: Madhab;
}

function addDays(isoDate: string, days: number) {
  const [y, m, d] = isoDate.split('-').map(Number) as [number, number, number];
  const utc = new Date(Date.UTC(y, m - 1, d + days));
  return {
    y: utc.getUTCFullYear(),
    m: utc.getUTCMonth() + 1,
    d: utc.getUTCDate(),
    iso: utc.toISOString().slice(0, 10),
  };
}

/** Computes prayer times locally (no network) — same engine as the mobile app. */
export function computePrayerDays(options: PrayerOptions): PrayerDay[] {
  const coordinates = new Coordinates(options.latitude, options.longitude);
  const params = CalculationMethod[options.method ?? DEFAULT_PRAYER_METHOD]();
  params.madhab =
    (options.madhab ?? DEFAULT_MADHAB) === 'hanafi' ? AdhanMadhab.Hanafi : AdhanMadhab.Shafi;

  return Array.from({ length: options.days }, (_, offset) => {
    const day = addDays(options.date, offset);
    // adhan reads the calendar fields of this Date (local getters); 12:00 keeps
    // the same calendar day in every timezone from UTC-11 to UTC+11.
    const times = new PrayerTimes(coordinates, new Date(day.y, day.m - 1, day.d, 12), params);
    return {
      date: day.iso,
      times: {
        fajr: times.fajr.toISOString(),
        sunrise: times.sunrise.toISOString(),
        dhuhr: times.dhuhr.toISOString(),
        asr: times.asr.toISOString(),
        maghrib: times.maghrib.toISOString(),
        isha: times.isha.toISOString(),
      },
    };
  });
}
