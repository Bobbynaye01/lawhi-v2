import {
  CAUSE_STATUSES,
  DONATION_STATUSES,
  MAX_DONATION_AMOUNT,
  MAX_TOTAL_AMOUNT,
} from '@lawhi/shared';
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

/** Editable fields of a cause, without defaults so a partial update never resets them. */
const causeFields = {
  ...localized,
  goalAmount: z.number().int().positive().max(MAX_TOTAL_AMOUNT).nullable(),
  collectedAmount: z.number().int().min(0).max(MAX_TOTAL_AMOUNT),
  status: z.enum(CAUSE_STATUSES),
  /** Calendar date (YYYY-MM-DD) of the event, or null. */
  eventDate: z.iso
    .date()
    .transform((d) => new Date(`${d}T00:00:00.000Z`))
    .nullable(),
  featured: z.boolean(),
  active: z.boolean(),
  sortOrder: z.number().int().min(0).max(1000),
};

export const createCauseSchema = z.object({
  slug: z.string().regex(/^[a-z0-9-]{2,60}$/),
  ...causeFields,
  goalAmount: causeFields.goalAmount.default(null),
  collectedAmount: causeFields.collectedAmount.default(0),
  status: causeFields.status.default('ongoing'),
  eventDate: causeFields.eventDate.default(null),
  featured: causeFields.featured.default(false),
  active: causeFields.active.default(true),
  sortOrder: causeFields.sortOrder.default(0),
});
export type CreateCauseInput = z.infer<typeof createCauseSchema>;

export const updateCauseSchema = z.object(causeFields).partial();
export type UpdateCauseInput = z.infer<typeof updateCauseSchema>;

export const donationPresetsSchema = z.object({
  presets: z.array(z.number().int().positive().max(MAX_DONATION_AMOUNT)).min(1).max(8),
});
