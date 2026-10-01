import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import type { ConfigService } from '@nestjs/config';
import type { Env } from '../../config/env';

export const SUPABASE_ADMIN = Symbol('SUPABASE_ADMIN');

/** Server-side Supabase client (service role). Null when not configured (dev without Supabase). */
export function createSupabaseAdmin(config: ConfigService<Env, true>): SupabaseClient | null {
  const url = config.get('SUPABASE_URL', { infer: true });
  const key = config.get('SUPABASE_SERVICE_ROLE_KEY', { infer: true });
  if (!url || !key) return null;
  return createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
}
