import type { PrayerDay } from '@lawhi/shared';

export type AdhkarMoment = 'morning' | 'evening' | 'sleep' | 'after-prayer';

/** Which adhkar fit this moment of the day, from prayer times when known. */
export function adhkarMoment(days: PrayerDay[] | null, now: Date): AdhkarMoment {
  const today = days?.[0];
  if (today) {
    const at = (p: keyof PrayerDay['times']) => new Date(today.times[p]).getTime();
    const n = now.getTime();
    if (n >= at('fajr') && n < at('dhuhr')) return 'morning';
    if (n >= at('asr') && n < at('isha')) return 'evening';
    if (n >= at('isha') || n < at('fajr')) return 'sleep';
    return 'after-prayer';
  }
  const h = now.getHours();
  if (h >= 4 && h < 12) return 'morning';
  if (h >= 15 && h < 20) return 'evening';
  if (h >= 20 || h < 4) return 'sleep';
  return 'after-prayer';
}
