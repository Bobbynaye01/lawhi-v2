import type { CreateDonationInput, DonationStatus, Locale, PaymentOperator } from '@lawhi/shared';
import { apiRequest } from './client';

export interface PublicConfig {
  currency: 'MRU';
  donations: { presets: number[]; maxAmount: number };
}

export interface Cause {
  id: string;
  slug: string;
  titleAr: string;
  titleFr: string;
  titleEn: string;
  descriptionAr: string;
  descriptionFr: string;
  descriptionEn: string;
  goalAmount: number | null;
  featured: boolean;
  confirmedAmount: number;
  confirmedCount: number;
}

export interface PaymentMethod {
  id: string;
  name: string;
  operator: PaymentOperator;
  phoneNumber: string;
  instructions: string | null;
}

export interface Donation {
  id: string;
  code: string;
  amount: number;
  currency: 'MRU';
  donorName: string | null;
  donorPhone: string | null;
  reference: string | null;
  status: DonationStatus;
  rejectionReason: string | null;
  hasProof: boolean;
  createdAt: string;
  cause: { id: string; slug: string; titleAr: string; titleFr: string; titleEn: string };
  paymentMethod: {
    id: string;
    name: string;
    operator: PaymentOperator;
    phoneNumber: string | null;
  };
}

export interface CitySearchResult {
  name: string;
  displayName: string;
  country: string | null;
  countryCode: string | null;
  latitude: number;
  longitude: number;
}

export interface Me {
  id: string;
  email: string | null;
  displayName: string | null;
  role: 'user' | 'admin';
}

export const api = {
  publicConfig: () => apiRequest<PublicConfig>('/settings'),
  causes: () => apiRequest<Cause[]>('/donations/causes'),
  paymentMethods: () => apiRequest<PaymentMethod[]>('/donations/payment-methods'),
  createDonation: (input: CreateDonationInput) =>
    apiRequest<Donation>('/donations', { method: 'POST', body: input, auth: true }),
  myDonations: () => apiRequest<Donation[]>('/donations/mine', { auth: true }),
  donation: (id: string) => apiRequest<Donation>(`/donations/${id}`, { auth: true }),
  submitReference: (id: string, reference: string) =>
    apiRequest<Donation>(`/donations/${id}/reference`, {
      method: 'POST',
      body: { reference },
      auth: true,
    }),
  uploadProof: (id: string, form: FormData) =>
    apiRequest<Donation>(`/donations/${id}/proof`, {
      method: 'POST',
      form,
      auth: true,
      timeoutMs: 60000,
    }),
  cancelDonation: (id: string) =>
    apiRequest<Donation>(`/donations/${id}/cancel`, { method: 'POST', auth: true }),
  searchCities: (q: string, lang: Locale) =>
    apiRequest<CitySearchResult[]>(`/prayer/cities?q=${encodeURIComponent(q)}&lang=${lang}`),
  me: () => apiRequest<Me>('/me', { auth: true }),
  deleteAccount: () =>
    apiRequest<{ deactivated: boolean; authDeleted: boolean }>('/me', {
      method: 'DELETE',
      auth: true,
    }),
};
