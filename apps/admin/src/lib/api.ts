import type {
  CauseStatus,
  DonationStatus,
  DonationSummary,
  PaymentOperator,
  UpdateDonationSummaryInput,
} from '@lawhi/shared';
import { createClient } from '@supabase/supabase-js';

const API_URL = (import.meta.env.VITE_API_URL ?? '').replace(/\/$/, '');
const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL ?? '';
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY ?? '';

export const isConfigured = Boolean(API_URL && SUPABASE_URL && SUPABASE_ANON_KEY);

/** Authentication only (public key). Every admin action is authorised by the API. */
export const supabase = isConfigured ? createClient(SUPABASE_URL, SUPABASE_ANON_KEY) : null;

export class ApiError extends Error {
  constructor(
    readonly status: number,
    readonly code: string,
  ) {
    super(code);
  }
}

/** Image URLs stored on disk in development are relative to the API. */
export function mediaUrl(url: string): string {
  return url.startsWith('/') ? `${API_URL}${url}` : url;
}

async function request<T>(
  path: string,
  init: { method?: string; body?: unknown; form?: FormData } = {},
): Promise<T> {
  const session = (await supabase?.auth.getSession())?.data.session;
  if (!session) throw new ApiError(401, 'unauthenticated');
  let response: Response;
  try {
    response = await fetch(`${API_URL}/api${path}`, {
      method: init.method ?? 'GET',
      headers: {
        Authorization: `Bearer ${session.access_token}`,
        ...(init.body !== undefined ? { 'Content-Type': 'application/json' } : {}),
      },
      body: init.form ?? (init.body !== undefined ? JSON.stringify(init.body) : undefined),
    });
  } catch {
    throw new ApiError(0, 'network_error');
  }
  const payload = (await response.json().catch(() => null)) as { error?: string } | null;
  if (!response.ok) throw new ApiError(response.status, payload?.error ?? 'unknown_error');
  return payload as T;
}

export interface AdminDonation {
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
  reviewedAt: string | null;
  cause: { id: string; titleFr: string };
  paymentMethod: {
    id: string;
    name: string;
    operator: PaymentOperator;
    phoneNumber: string | null;
  };
  user: { id: string; email: string | null };
}

export interface DonationDetail extends AdminDonation {
  reviewedBy: { email: string | null } | null;
  events: {
    fromStatus: DonationStatus | null;
    toStatus: DonationStatus;
    note: string | null;
    createdAt: string;
    actor: { email: string | null } | null;
  }[];
}

export interface PaymentMethodRow {
  id: string;
  name: string;
  operator: PaymentOperator;
  phoneNumber: string | null;
  instructions: string | null;
  enabled: boolean;
  sortOrder: number;
}

export interface CauseRow {
  id: string;
  slug: string;
  titleAr: string;
  titleFr: string;
  titleEn: string;
  descriptionAr: string;
  descriptionFr: string;
  descriptionEn: string;
  goalAmount: number | null;
  collectedAmount: number;
  status: CauseStatus;
  /** ISO date-time at midnight UTC, or null. */
  eventDate: string | null;
  imageUrl: string | null;
  featured: boolean;
  active: boolean;
  sortOrder: number;
}

/** What the API accepts when creating or editing a cause (date as YYYY-MM-DD). */
export type CauseInput = Omit<CauseRow, 'id' | 'slug' | 'imageUrl' | 'eventDate'> & {
  eventDate: string | null;
};

export interface Stats {
  currency: 'MRU';
  byStatus: { status: DonationStatus; count: number; amount: number }[];
  confirmedByCause: {
    causeId: string;
    title: string | null;
    goalAmount: number | null;
    count: number;
    amount: number;
  }[];
  confirmedByMethod: {
    paymentMethodId: string;
    name: string | null;
    count: number;
    amount: number;
  }[];
}

export interface DonationFilters {
  status?: DonationStatus;
  q?: string;
  page: number;
}

export const adminApi = {
  me: () => request<{ id: string; email: string | null; role: 'user' | 'admin' }>('/me'),
  stats: () => request<Stats>('/admin/donations/stats'),
  donations: (f: DonationFilters) => {
    const params = new URLSearchParams({ page: String(f.page), pageSize: '25' });
    if (f.status) params.set('status', f.status);
    if (f.q) params.set('q', f.q);
    return request<{ total: number; page: number; pageSize: number; items: AdminDonation[] }>(
      `/admin/donations?${params}`,
    );
  },
  donation: (id: string) => request<DonationDetail>(`/admin/donations/${id}`),
  confirm: (id: string, note?: string) =>
    request<AdminDonation>(`/admin/donations/${id}/confirm`, {
      method: 'PATCH',
      body: note ? { note } : {},
    }),
  reject: (id: string, reason: string) =>
    request<AdminDonation>(`/admin/donations/${id}/reject`, { method: 'PATCH', body: { reason } }),
  /** Returns a short-lived URL (Supabase) or a blob URL (local storage in development). */
  proofUrl: async (id: string): Promise<string> => {
    const session = (await supabase?.auth.getSession())?.data.session;
    if (!session) throw new ApiError(401, 'unauthenticated');
    const response = await fetch(`${API_URL}/api/admin/donations/${id}/proof`, {
      headers: { Authorization: `Bearer ${session.access_token}` },
    });
    if (!response.ok) throw new ApiError(response.status, 'proof_not_found');
    if (response.headers.get('content-type')?.includes('application/json')) {
      return ((await response.json()) as { url: string }).url;
    }
    return URL.createObjectURL(await response.blob());
  },
  paymentMethods: () => request<PaymentMethodRow[]>('/admin/payment-methods'),
  updatePaymentMethod: (
    id: string,
    body: Partial<Pick<PaymentMethodRow, 'phoneNumber' | 'instructions' | 'enabled' | 'name'>>,
  ) => request<PaymentMethodRow>(`/admin/payment-methods/${id}`, { method: 'PATCH', body }),
  causes: () => request<CauseRow[]>('/admin/causes'),
  createCause: (body: CauseInput & { slug: string }) =>
    request<CauseRow>('/admin/causes', { method: 'POST', body }),
  updateCause: (id: string, body: Partial<CauseInput>) =>
    request<CauseRow>(`/admin/causes/${id}`, { method: 'PATCH', body }),
  /** Deletes the cause, or archives it when donations already reference it. */
  deleteCause: (id: string) =>
    request<{ deleted: boolean; archived: boolean }>(`/admin/causes/${id}`, { method: 'DELETE' }),
  uploadCauseImage: (id: string, file: File) => {
    const form = new FormData();
    form.append('file', file);
    return request<CauseRow>(`/admin/causes/${id}/image`, { method: 'POST', form });
  },
  removeCauseImage: (id: string) =>
    request<CauseRow>(`/admin/causes/${id}/image`, { method: 'DELETE' }),
  summary: async (): Promise<DonationSummary> => {
    const response = await fetch(`${API_URL}/api/donations/summary`);
    if (!response.ok) throw new ApiError(response.status, 'unknown_error');
    return (await response.json()) as DonationSummary;
  },
  updateSummary: (body: UpdateDonationSummaryInput) =>
    request<DonationSummary>('/admin/donations-summary', { method: 'PUT', body }),
};

const MESSAGES: Record<string, string> = {
  unauthenticated: 'Session expirée : reconnectez-vous.',
  forbidden: 'Ce compte n’a pas les droits d’administration.',
  network_error: 'API injoignable.',
  cannot_review_own_donation: 'Vous ne pouvez pas valider ou refuser votre propre don.',
  invalid_status_transition: 'Ce don a déjà été traité.',
  donation_changed_concurrently:
    'Ce don vient d’être modifié par un autre administrateur. Rechargez.',
  enabled_method_requires_phone: 'Renseignez un numéro avant d’activer ce moyen de paiement.',
  validation_failed:
    'Données invalides (vérifiez le numéro : 8 chiffres commençant par 2, 3 ou 4).',
  rate_limited: 'Trop de requêtes, patientez une minute.',
  cause_not_found: 'Ce projet n’existe plus. Rechargez la page.',
  cause_slug_taken: 'Cet identifiant est déjà utilisé par un autre projet.',
  image_too_large: 'Image trop lourde (2 Mo maximum).',
  image_type_not_allowed: 'Format non accepté : JPG, PNG ou WebP uniquement.',
  image_missing: 'Choisissez une image.',
  image_storage_unavailable: 'Le stockage des images n’est pas configuré sur le serveur.',
};

export function errorMessage(error: unknown): string {
  if (error instanceof ApiError) return MESSAGES[error.code] ?? `Erreur (${error.code}).`;
  return 'Erreur inattendue.';
}
