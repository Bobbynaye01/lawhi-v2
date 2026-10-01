import { config, isApiConfigured } from '../../constants/config';
import { accessToken } from '../supabase';

/** Error carrying the API's `error` code, mapped to translations by the UI (errors.*). */
export class ApiError extends Error {
  constructor(
    readonly status: number,
    readonly code: string,
  ) {
    super(code);
    this.name = 'ApiError';
  }
}

interface RequestOptions {
  method?: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
  body?: unknown;
  form?: FormData;
  auth?: boolean;
  timeoutMs?: number;
}

export async function apiRequest<T>(path: string, options: RequestOptions = {}): Promise<T> {
  if (!isApiConfigured) throw new ApiError(0, 'api_not_configured');

  const headers: Record<string, string> = {};
  if (options.body !== undefined) headers['Content-Type'] = 'application/json';
  if (options.auth) {
    const token = await accessToken();
    if (!token) throw new ApiError(401, 'unauthenticated');
    headers.Authorization = `Bearer ${token}`;
  }

  let response: Response;
  try {
    response = await fetch(`${config.apiUrl}/api${path}`, {
      method: options.method ?? 'GET',
      headers,
      body: options.form ?? (options.body !== undefined ? JSON.stringify(options.body) : undefined),
      signal: AbortSignal.timeout(options.timeoutMs ?? 15000),
    });
  } catch {
    throw new ApiError(0, 'network_error');
  }

  if (response.status === 204) return undefined as T;
  const payload = (await response.json().catch(() => null)) as { error?: string } | null;
  if (!response.ok) throw new ApiError(response.status, payload?.error ?? 'unknown_error');
  return payload as T;
}
