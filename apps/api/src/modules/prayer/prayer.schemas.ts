import { LOCALES, MADHABS, PRAYER_METHODS, type PrayerMethodId } from '@lawhi/shared';
import { z } from 'zod';

const methodIds = PRAYER_METHODS.map((m) => m.id) as [PrayerMethodId, ...PrayerMethodId[]];

export const prayerTimesQuerySchema = z.object({
  lat: z.coerce.number().min(-90).max(90),
  lon: z.coerce.number().min(-180).max(180),
  date: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .refine((d) => !Number.isNaN(Date.parse(`${d}T00:00:00Z`)), 'invalid_date'),
  days: z.coerce.number().int().min(1).max(31).default(1),
  method: z.enum(methodIds).optional(),
  madhab: z.enum(MADHABS).optional(),
});
export type PrayerTimesQuery = z.infer<typeof prayerTimesQuerySchema>;

export const citySearchQuerySchema = z.object({
  q: z.string().trim().min(2).max(80),
  lang: z.enum(LOCALES).default('ar'),
});
