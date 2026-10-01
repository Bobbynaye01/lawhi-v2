import {
  LOCALES,
  MADHABS,
  NOTIFICATION_MODES,
  PRAYER_METHODS,
  RIWAYAT,
  TOTAL_SURAHS,
  type PrayerMethodId,
} from '@lawhi/shared';
import { z } from 'zod';

const methodIds = PRAYER_METHODS.map((m) => m.id) as [PrayerMethodId, ...PrayerMethodId[]];

export const updateProfileSchema = z.object({
  displayName: z.string().trim().min(2).max(60).nullable(),
});

export const updateSettingsSchema = z
  .object({
    locale: z.enum(LOCALES),
    riwaya: z.enum(RIWAYAT),
    reciterId: z.string().max(60).nullable(),
    fontScale: z.number().min(0.8).max(2),
    theme: z.enum(['system', 'light', 'dark']),
    prayerMethod: z.enum(methodIds),
    madhab: z.enum(MADHABS),
    notificationMode: z.enum(NOTIFICATION_MODES),
  })
  .partial();
export type UpdateSettingsInput = z.infer<typeof updateSettingsSchema>;

const verseRef = {
  surah: z.number().int().min(1).max(TOTAL_SURAHS),
  verse: z.number().int().min(1).max(286),
};

export const riwayaParamSchema = z.enum(RIWAYAT);

export const readingPositionSchema = z.object(verseRef);

export const createBookmarkSchema = z.object({
  riwaya: z.enum(RIWAYAT),
  ...verseRef,
  note: z.string().trim().max(500).optional(),
});
export type CreateBookmarkInput = z.infer<typeof createBookmarkSchema>;

export const uuidSchema = z.string().uuid();
