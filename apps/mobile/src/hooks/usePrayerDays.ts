import { computePrayerDays, localDateString, nextPrayer, type PrayerDay } from '@lawhi/shared';
import { useEffect, useMemo, useState } from 'react';
import { useLocationStore } from '../stores/locationStore';
import { useSettingsStore } from '../stores/settingsStore';

/** Ticks every 30 s so "next prayer" and countdowns stay current. */
export function useNow(intervalMs = 30_000): Date {
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), intervalMs);
    return () => clearInterval(id);
  }, [intervalMs]);
  return now;
}

/** Prayer times for today and tomorrow at the saved place — computed offline. */
export function usePrayerDays(): {
  days: PrayerDay[] | null;
  next: ReturnType<typeof nextPrayer>;
  now: Date;
} {
  const place = useLocationStore((s) => s.place);
  const method = useSettingsStore((s) => s.prayerMethod);
  const madhab = useSettingsStore((s) => s.madhab);
  const now = useNow();
  const today = localDateString(now);

  const days = useMemo(
    () =>
      place
        ? computePrayerDays({
            latitude: place.latitude,
            longitude: place.longitude,
            date: today,
            days: 2,
            method,
            madhab,
          })
        : null,
    [place, method, madhab, today],
  );
  return { days, next: days ? nextPrayer(days, now) : null, now };
}
