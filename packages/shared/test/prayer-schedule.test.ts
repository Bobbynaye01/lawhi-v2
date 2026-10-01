import { describe, expect, it } from 'vitest';
import {
  diffSchedule,
  MAX_PENDING_NOTIFICATIONS,
  nextPrayer,
  planPrayerNotifications,
  scheduleFingerprint,
} from '../src/prayer-schedule';
import { computePrayerDays } from '../src/prayer-times';

const base = {
  latitude: 18.0735,
  longitude: -15.9582,
  method: 'MuslimWorldLeague' as const,
  madhab: 'shafi' as const,
  mode: 'notification' as const,
};

describe('planPrayerNotifications', () => {
  it('plans 12 days ahead, only in the future, within the iOS limit', () => {
    const now = new Date('2026-10-01T13:00:00Z'); // after Dhuhr in Nouakchott
    const plan = planPrayerNotifications({ ...base, today: '2026-10-01', now });
    expect(plan.length).toBeLessThanOrEqual(MAX_PENDING_NOTIFICATIONS);
    expect(plan.every((p) => p.fireAt > now)).toBe(true);
    expect(plan[0]!.prayer).toBe('asr');
    expect(plan.at(-1)!.id.startsWith('prayer:2026-10-12:')).toBe(true);
  });

  it('plans nothing when notifications are off', () => {
    expect(
      planPrayerNotifications({ ...base, mode: 'off', today: '2026-10-01', now: new Date() }),
    ).toEqual([]);
  });

  it('gives new ids when the city, method or sound mode changes', () => {
    const a = scheduleFingerprint(base);
    expect(scheduleFingerprint({ ...base, method: 'Egyptian' })).not.toBe(a);
    expect(scheduleFingerprint({ ...base, latitude: 20.94 })).not.toBe(a);
    expect(scheduleFingerprint({ ...base, mode: 'adhan' })).not.toBe(a);
    expect(scheduleFingerprint({ ...base })).toBe(a);
  });
});

describe('diffSchedule', () => {
  it('keeps existing notifications, cancels stale ones and adds missing ones — no duplicates', () => {
    const now = new Date('2026-10-01T00:00:00Z');
    const day1 = planPrayerNotifications({ ...base, today: '2026-10-01', now });
    const nextDay = planPrayerNotifications({
      ...base,
      today: '2026-10-02',
      now: new Date('2026-10-02T00:00:00Z'),
    });
    const { toCancel, toSchedule } = diffSchedule(
      day1.map((p) => p.id),
      nextDay,
    );
    expect(toCancel.every((id) => id.startsWith('prayer:2026-10-01:'))).toBe(true);
    expect(toSchedule.every((p) => p.id.startsWith('prayer:2026-10-13:'))).toBe(true);
    expect(toSchedule).toHaveLength(5);

    const changed = planPrayerNotifications({
      ...base,
      method: 'Egyptian',
      today: '2026-10-01',
      now,
    });
    const resync = diffSchedule(
      day1.map((p) => p.id),
      changed,
    );
    expect(resync.toCancel).toHaveLength(day1.length);
    expect(resync.toSchedule).toHaveLength(changed.length);
  });
});

describe('nextPrayer', () => {
  it('rolls over to the next day after Isha', () => {
    const days = computePrayerDays({ ...base, date: '2026-10-01', days: 2 });
    const next = nextPrayer(days, new Date('2026-10-01T22:00:00Z'));
    expect(next?.prayer).toBe('fajr');
    expect(next?.at.toISOString().startsWith('2026-10-02')).toBe(true);
  });
});
