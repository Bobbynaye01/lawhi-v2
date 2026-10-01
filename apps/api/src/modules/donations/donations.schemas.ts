import { DONATION_STATUSES, MAX_DONATION_AMOUNT } from '@lawhi/shared';
import { z } from 'zod';

export const uuidSchema = z.string().uuid();

export const submitReferenceSchema = z.object({
  reference: z.string().trim().min(3).max(64),
});

export const adminDonationsQuerySchema = z.object({
  status: z.enum(DONATION_STATUSES).optional(),
  causeId: z.string().uuid().optional(),
  paymentMethodId: z.string().uuid().optional(),
  /** Matches code, reference, donor name or phone. */
  q: z.string().trim().min(1).max(64).optional(),
  from: z.coerce.date().optional(),
  to: z.coerce.date().optional(),
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(25),
});
export type AdminDonationsQuery = z.infer<typeof adminDonationsQuerySchema>;

export const confirmDonationSchema = z.object({
  note: z.string().trim().max(500).optional(),
});

const localized = {
  titleAr: z.string().trim().min(2).max(120),
  titleFr: z.string().trim().min(2).max(120),
  titleEn: z.string().trim().min(2).max(120),
  descriptionAr: z.string().trim().min(2).max(2000),
  descriptionFr: z.string().trim().min(2).max(2000),
  descriptionEn: z.string().trim().min(2).max(2000),
};

export const createCauseSchema = z.object({
  slug: z.string().regex(/^[a-z0-9-]{2,60}$/),
  ...localized,
  goalAmount: z.number().int().positive().max(1_000_000_000).nullable().default(null),
  featured: z.boolean().default(false),
  active: z.boolean().default(true),
  sortOrder: z.number().int().min(0).max(1000).default(0),
});
export type CreateCauseInput = z.infer<typeof createCauseSchema>;

export const updateCauseSchema = createCauseSchema.omit({ slug: true }).partial();
export type UpdateCauseInput = z.infer<typeof updateCauseSchema>;

export const donationPresetsSchema = z.object({
  presets: z.array(z.number().int().positive().max(MAX_DONATION_AMOUNT)).min(1).max(8),
});
