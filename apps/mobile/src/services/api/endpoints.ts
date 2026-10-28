import type {
  CauseStatus,
  CreateDonationInput,
  DonationStatus,
  DonationSummary,
  Locale,
  PaymentOperator,
  UpdateDonationSummaryInput,
} from '@lawhi/shared';
import { config } from '../../constants/config';
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
  /** Collected so far in MRU, entered by an admin. */
  collectedAmount: number;
  status: CauseStatus;
  /** ISO date-time at midnight UTC, or null. */
  eventDate: string | null;
  imageUrl: string | null;
  featured: boolean;
  active: boolean;
  sortOrder: number;
}

/** What an admin sends to create or edit a cause (date as YYYY-MM-DD). */
export type CauseInput = Pick<
  Cause,
  | 'titleAr'
  | 'titleFr'
  | 'titleEn'
  | 'descriptionAr'
  | 'descriptionFr'
  | 'descriptionEn'
  | 'goalAmount'
  | 'collectedAmount'
  | 'status'
  | 'featured'
  | 'active'
  | 'sortOrder'
> & { eventDate: string | null };

/** Images stored on the API's disk (development) come back as relative paths. */
export function mediaUrl(url: string): string {
  return url.startsWith('/') ? `${config.apiUrl}${url}` : url;
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
  donationSummary: () => apiRequest<DonationSummary>('/donations/summary'),
  admin: {
    causes: () => apiRequest<Cause[]>('/admin/causes', { auth: true }),
    createCause: (input: CauseInput & { slug: string }) =>
      apiRequest<Cause>('/admin/causes', { method: 'POST', body: input, auth: true }),
    updateCause: (id: string, input: Partial<CauseInput>) =>
      apiRequest<Cause>(`/admin/causes/${id}`, { method: 'PATCH', body: input, auth: true }),
    deleteCause: (id: string) =>
      apiRequest<{ deleted: boolean; archived: boolean }>(`/admin/causes/${id}`, {
        method: 'DELETE',
        auth: true,
      }),
    uploadCauseImage: (id: string, form: FormData) =>
      apiRequest<Cause>(`/admin/causes/${id}/image`, {
        method: 'POST',
        form,
        auth: true,
        timeoutMs: 60000,
      }),
    removeCauseImage: (id: string) =>
      apiRequest<Cause>(`/admin/causes/${id}/image`, { method: 'DELETE', auth: true }),
    updateSummary: (input: UpdateDonationSummaryInput) =>
      apiRequest<DonationSummary>('/admin/donations-summary', {
        method: 'PUT',
        body: input,
        auth: true,
      }),
  },
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
