import { RIWAYAT, TOTAL_HIZB, TOTAL_JUZ, TOTAL_RUB, TOTAL_SURAHS } from '@lawhi/shared';
import { z } from 'zod';

export const riwayaQuerySchema = z.object({
  riwaya: z.enum(RIWAYAT).default('hafs'),
});

const intParam = (max: number) => z.coerce.number().int().min(1).max(max);

export const surahParamSchema = intParam(TOTAL_SURAHS);
export const divisionParamSchemas = {
  juz: intParam(TOTAL_JUZ),
  hizb: intParam(TOTAL_HIZB),
  rub: intParam(TOTAL_RUB),
  page: intParam(604),
} as const;

export const searchQuerySchema = riwayaQuerySchema.extend({
  q: z.string().trim().min(2).max(100),
  limit: z.coerce.number().int().min(1).max(100).default(30),
});
