import { z } from 'zod';
import { CURRENCY, MAX_DONATION_AMOUNT } from './money';
import { mauritanianPhoneSchema } from './phone';

export const DONATION_STATUSES = [
  'pending',
  'submitted',
  'confirmed',
  'rejected',
  'cancelled',
] as const;
export type DonationStatus = (typeof DONATION_STATUSES)[number];

/**
 * pending   → created, the donor has not sent proof yet
 * submitted → the donor attached a reference or a proof
 * confirmed / rejected → decided by an admin only
 * cancelled → withdrawn by the donor before an admin decision
 */
const ALLOWED_TRANSITIONS: Record<DonationStatus, readonly DonationStatus[]> = {
  pending: ['submitted', 'confirmed', 'rejected', 'cancelled'],
  submitted: ['confirmed', 'rejected', 'cancelled'],
  confirmed: [],
  rejected: [],
  cancelled: [],
};

export const ADMIN_ONLY_STATUSES: readonly DonationStatus[] = ['confirmed', 'rejected'];

export function canTransition(from: DonationStatus, to: DonationStatus): boolean {
  return ALLOWED_TRANSITIONS[from].includes(to);
}

export function isFinalStatus(status: DonationStatus): boolean {
  return ALLOWED_TRANSITIONS[status].length === 0;
}

export const PAYMENT_OPERATORS = [
  'bankily',
  'masrivi',
  'bimbank',
  'click',
  'sedad',
  'bamis_digital',
  'bci_pay',
] as const;
export type PaymentOperator = (typeof PAYMENT_OPERATORS)[number];

const reference = z.string().trim().min(3).max(64);

export const createDonationSchema = z.object({
  causeId: z.string().min(1),
  paymentMethodId: z.string().min(1),
  amount: z.number().int().positive().max(MAX_DONATION_AMOUNT),
  currency: z.literal(CURRENCY).default(CURRENCY),
  donorName: z.string().trim().min(2).max(80).optional(),
  donorPhone: mauritanianPhoneSchema.optional(),
  reference: reference.optional(),
});
export type CreateDonationInput = z.input<typeof createDonationSchema>;

export const submitDonationProofSchema = z.object({
  reference: reference.optional(),
  proofPath: z.string().min(1).max(512).optional(),
});

export const rejectDonationSchema = z.object({
  reason: z.string().trim().min(3).max(500),
});

export const paymentMethodSchema = z.object({
  name: z.string().trim().min(2).max(60),
  operator: z.enum(PAYMENT_OPERATORS),
  phoneNumber: mauritanianPhoneSchema.nullable(),
  instructions: z.string().trim().max(1000).nullable(),
  enabled: z.boolean(),
});

/** A method can only be enabled once it has a real number to pay to. */
export const updatePaymentMethodSchema = paymentMethodSchema
  .partial()
  .refine((m) => !(m.enabled === true && m.phoneNumber === null), {
    message: 'enabled_method_requires_phone',
    path: ['phoneNumber'],
  });

/** Life cycle of a project or event shown to donors. */
export const CAUSE_STATUSES = ['upcoming', 'ongoing', 'completed'] as const;
export type CauseStatus = (typeof CAUSE_STATUSES)[number];

/** Upper bound for admin-entered totals (all donations, all projects), in MRU. */
export const MAX_TOTAL_AMOUNT = 1_000_000_000;

/**
 * Admin update of the public donations summary: the running total (its date is
 * set by the server) and the Bankily number donors send money to.
 */
export const updateDonationSummarySchema = z
  .object({
    totalAmount: z.number().int().min(0).max(MAX_TOTAL_AMOUNT).optional(),
    bankilyPhone: mauritanianPhoneSchema.optional(),
  })
  .refine((s) => s.totalAmount !== undefined || s.bankilyPhone !== undefined, {
    message: 'nothing_to_update',
  });
export type UpdateDonationSummaryInput = z.input<typeof updateDonationSummarySchema>;

export interface DonationSummary {
  totalAmount: number;
  currency: typeof CURRENCY;
  /** When an admin last set the total (ISO date-time), or null if never. */
  updatedAt: string | null;
  /** Number to send donations to, or null until an admin sets it. */
  bankilyPhone: string | null;
}

/** Lower-case ASCII slug from the French title, e.g. "Repas pour orphelins" → "repas-pour-orphelins". */
export function slugify(title: string): string {
  return title
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 60);
}
