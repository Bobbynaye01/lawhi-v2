import {
  PRAYERS,
  type Madhab,
  type NotificationMode,
  type Prayer,
  type PrayerMethodId,
} from './prayer';
import { computePrayerDays, type PrayerDay } from './prayer-times';

/** iOS keeps at most 64 pending local notifications per app; 12 days × 5 prayers stays below. */
export const NOTIFICATION_DAYS = 12;
export const MAX_PENDING_NOTIFICATIONS = 60;

export interface ScheduleInput {
  latitude: number;
  longitude: number;
  method: PrayerMethodId;
  madhab: Madhab;
  mode: NotificationMode;
  /** Device-local calendar date of `now`, YYYY-MM-DD. */
  today: string;
  now: Date;
  days?: number;
}

export interface PlannedNotification {
  /** Deterministic: the same prayer with the same settings always gets the same id. */
  id: string;
  prayer: Prayer;
  fireAt: Date;
}

/** Short stable fingerprint of everything that changes the times or the sound. */
export function scheduleFingerprint(
  input: Pick<ScheduleInput, 'latitude' | 'longitude' | 'method' | 'madhab' | 'mode'>,
): string {
  const raw = `${input.latitude.toFixed(3)}|${input.longitude.toFixed(3)}|${input.method}|${input.madhab}|${input.mode}`;
  let hash = 5381;
  for (let i = 0; i < raw.length; i++) hash = ((hash << 5) + hash + raw.charCodeAt(i)) >>> 0;
  return hash.toString(36);
}

/**
 * Plans the next prayer notifications. Renewal strategy: the app calls this on
 * every launch, on any settings/location change and from a daily background
 * task; the caller cancels ids that are no longer planned and schedules the
 * missing ones, so there are never duplicates and the window keeps sliding.
 */
export function planPrayerNotifications(input: ScheduleInput): PlannedNotification[] {
  if (input.mode === 'off') return [];
  const fingerprint = scheduleFingerprint(input);
  const days = computePrayerDays({
    latitude: input.latitude,
    longitude: input.longitude,
    date: input.today,
    days: input.days ?? NOTIFICATION_DAYS,
    method: input.method,
    madhab: input.madhab,
  });

  const planned: PlannedNotification[] = [];
  for (const day of days) {
    for (const prayer of PRAYERS) {
      const fireAt = new Date(day.times[prayer]);
      if (fireAt.getTime() <= input.now.getTime()) continue;
      planned.push({ id: `prayer:${day.date}:${prayer}:${fingerprint}`, prayer, fireAt });
    }
  }
  return planned.slice(0, MAX_PENDING_NOTIFICATIONS);
}

/** Splits current vs desired notification ids into what to cancel and what to schedule. */
export function diffSchedule(existingIds: string[], planned: PlannedNotification[]) {
  const wanted = new Set(planned.map((p) => p.id));
  const existing = new Set(existingIds);
  return {
    toCancel: existingIds.filter((id) => !wanted.has(id)),
    toSchedule: planned.filter((p) => !existing.has(p.id)),
  };
}

/** The next prayer after `now` across the given days, or null. */
export function nextPrayer(days: PrayerDay[], now: Date): { prayer: Prayer; at: Date } | null {
  for (const day of days) {
    for (const prayer of PRAYERS) {
      const at = new Date(day.times[prayer]);
      if (at.getTime() > now.getTime()) return { prayer, at };
    }
  }
  return null;
}

/** Device-local YYYY-MM-DD (not UTC) for a given instant. */
export function localDateString(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}
