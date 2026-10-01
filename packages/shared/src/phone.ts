import { z } from 'zod';

/**
 * Mauritanian mobile numbers: 8 digits, starting with 2 (Chinguitel),
 * 3 (Mattel) or 4 (Mauritel). An optional +222 / 00222 prefix is accepted
 * on input and stripped.
 */
const MAURITANIAN_MOBILE = /^[234]\d{7}$/;

export function normalizeMauritanianPhone(input: string): string | null {
  const compact = input.replace(/[\s.-]/g, '').replace(/^(\+|00)222/, '');
  return MAURITANIAN_MOBILE.test(compact) ? compact : null;
}

export const mauritanianPhoneSchema = z
  .string()
  .trim()
  .transform((value, ctx) => {
    const normalized = normalizeMauritanianPhone(value);
    if (!normalized) {
      ctx.addIssue({ code: 'custom', message: 'invalid_mauritanian_phone' });
      return z.NEVER;
    }
    return normalized;
  });
