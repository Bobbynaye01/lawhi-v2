import { describe, expect, it } from 'vitest';
import {
  canTransition,
  createDonationSchema,
  isFinalStatus,
  slugify,
  updateDonationSummarySchema,
  updatePaymentMethodSchema,
} from '../src/donations';
import { formatMRU } from '../src/money';
import { normalizeMauritanianPhone } from '../src/phone';

describe('formatMRU', () => {
  it('formats with thousands separators and the MRU suffix', () => {
    expect(formatMRU(100)).toBe('100 MRU');
    expect(formatMRU(1000)).toBe('1 000 MRU');
    expect(formatMRU(5000000)).toBe('5 000 000 MRU');
  });
});

describe('donation status transitions', () => {
  it('never leaves a final state', () => {
    expect(isFinalStatus('confirmed')).toBe(true);
    expect(canTransition('confirmed', 'rejected')).toBe(false);
    expect(canTransition('rejected', 'confirmed')).toBe(false);
  });

  it('allows the manual payment flow', () => {
    expect(canTransition('pending', 'submitted')).toBe(true);
    expect(canTransition('submitted', 'confirmed')).toBe(true);
    expect(canTransition('submitted', 'pending')).toBe(false);
  });
});

describe('createDonationSchema', () => {
  const valid = { causeId: 'c1', paymentMethodId: 'p1', amount: 500 };

  it('defaults the currency to MRU and rejects any other', () => {
    expect(createDonationSchema.parse(valid).currency).toBe('MRU');
    expect(createDonationSchema.safeParse({ ...valid, currency: 'EUR' }).success).toBe(false);
  });

  it('rejects non-integer, zero and negative amounts', () => {
    for (const amount of [0, -5, 10.5]) {
      expect(createDonationSchema.safeParse({ ...valid, amount }).success).toBe(false);
    }
  });

  it('normalizes the donor phone', () => {
    expect(
      createDonationSchema.parse({ ...valid, donorPhone: '+222 34 99 83 70' }).donorPhone,
    ).toBe('34998370');
  });
});

describe('phone numbers', () => {
  it('accepts Mauritanian mobiles only', () => {
    expect(normalizeMauritanianPhone('00222 46 12 34 56')).toBe('46123456');
    expect(normalizeMauritanianPhone('12345678')).toBeNull();
    expect(normalizeMauritanianPhone('3499837')).toBeNull();
  });
});

describe('updatePaymentMethodSchema', () => {
  it('refuses to enable a method without a phone number', () => {
    expect(updatePaymentMethodSchema.safeParse({ enabled: true, phoneNumber: null }).success).toBe(
      false,
    );
  });
});

describe('donation summary update', () => {
  it('accepts a total, a Bankily number, or both — and normalises the number', () => {
    expect(updateDonationSummarySchema.parse({ totalAmount: 150000 })).toEqual({
      totalAmount: 150000,
    });
    expect(updateDonationSummarySchema.parse({ bankilyPhone: '+222 22 33 44 55' })).toEqual({
      bankilyPhone: '22334455',
    });
  });

  it('refuses an empty update, negative or fractional totals, and invalid numbers', () => {
    expect(updateDonationSummarySchema.safeParse({}).success).toBe(false);
    expect(updateDonationSummarySchema.safeParse({ totalAmount: -1 }).success).toBe(false);
    expect(updateDonationSummarySchema.safeParse({ totalAmount: 10.5 }).success).toBe(false);
    expect(updateDonationSummarySchema.safeParse({ bankilyPhone: '12345678' }).success).toBe(false);
  });
});

describe('slugify', () => {
  it('turns a French title into a URL-safe identifier', () => {
    expect(slugify('Repas pour orphelins — Ramadan 2026')).toBe(
      'repas-pour-orphelins-ramadan-2026',
    );
    expect(slugify('Construction d’une mosquée')).toBe('construction-d-une-mosquee');
    expect(slugify('مسجد')).toBe('');
  });
});
