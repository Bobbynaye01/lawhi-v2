/**
 * Calculation methods supported by Lawhi. Ids match the `adhan` library's
 * CalculationMethod names (used for offline computation); `aladhanId` is the
 * equivalent `method` parameter of api.aladhan.com.
 */
export const PRAYER_METHODS = [
  { id: 'MuslimWorldLeague', aladhanId: 3, fajrAngle: 18, ishaAngle: 17 },
  { id: 'UmmAlQura', aladhanId: 4, fajrAngle: 18.5, ishaAngle: null },
  { id: 'Egyptian', aladhanId: 5, fajrAngle: 19.5, ishaAngle: 17.5 },
  { id: 'Karachi', aladhanId: 1, fajrAngle: 18, ishaAngle: 18 },
  { id: 'NorthAmerica', aladhanId: 2, fajrAngle: 15, ishaAngle: 15 },
  { id: 'Dubai', aladhanId: 16, fajrAngle: 18.2, ishaAngle: 18.2 },
  { id: 'Kuwait', aladhanId: 9, fajrAngle: 18, ishaAngle: 17.5 },
  { id: 'Qatar', aladhanId: 10, fajrAngle: 18, ishaAngle: null },
  { id: 'Singapore', aladhanId: 11, fajrAngle: 20, ishaAngle: 18 },
  { id: 'Turkey', aladhanId: 13, fajrAngle: 18, ishaAngle: 17 },
  { id: 'Tehran', aladhanId: 7, fajrAngle: 17.7, ishaAngle: 14 },
  { id: 'MoonsightingCommittee', aladhanId: 15, fajrAngle: 18, ishaAngle: 18 },
] as const;

export type PrayerMethodId = (typeof PRAYER_METHODS)[number]['id'];

/**
 * Default for Lawhi (decided 2026-10-01): Muslim World League — Fajr 18°, Isha 17°,
 * the closest to common practice in Mauritania. Users can change it in settings.
 */
export const DEFAULT_PRAYER_METHOD: PrayerMethodId = 'MuslimWorldLeague';

export const MADHABS = ['shafi', 'hanafi'] as const;
export type Madhab = (typeof MADHABS)[number];
/** Maliki practice (Mauritania) uses the standard (Shafi'i) Asr shadow ratio. */
export const DEFAULT_MADHAB: Madhab = 'shafi';

export const PRAYERS = ['fajr', 'dhuhr', 'asr', 'maghrib', 'isha'] as const;
export type Prayer = (typeof PRAYERS)[number];

export function isPrayerMethodId(value: string): value is PrayerMethodId {
  return PRAYER_METHODS.some((m) => m.id === value);
}

export const NOTIFICATION_MODES = ['off', 'notification', 'adhan'] as const;
export type NotificationMode = (typeof NOTIFICATION_MODES)[number];
