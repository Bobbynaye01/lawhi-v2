/** Lawhi only handles Mauritanian ouguiya. Never display another currency. */
export const CURRENCY = 'MRU' as const;
export type Currency = typeof CURRENCY;

/** Upper bound for a single donation, to reject obvious input errors. */
export const MAX_DONATION_AMOUNT = 10_000_000;

/**
 * Formats an integer amount as "1 000 MRU".
 * Latin digits and a fixed suffix in every language so amounts read the same
 * on receipts, in the admin and in the app.
 */
export function formatMRU(amount: number): string {
  if (!Number.isFinite(amount)) throw new RangeError('Amount must be finite');
  const sign = amount < 0 ? '-' : '';
  const digits = Math.abs(Math.trunc(amount)).toString();
  const grouped = digits.replace(/\B(?=(\d{3})+(?!\d))/g, ' ');
  return `${sign}${grouped} ${CURRENCY}`;
}
