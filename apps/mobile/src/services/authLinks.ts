import { supabase } from './supabase';

export type AuthLinkResult = 'recovery' | 'signed-in' | 'ignored' | 'invalid';

/** Reads params from both the query string and the #fragment (Supabase uses either). */
function linkParams(url: string): URLSearchParams {
  const params = new URLSearchParams();
  const [beforeHash, hash] = url.split('#');
  const query = beforeHash?.split('?')[1];
  for (const part of [query, hash]) {
    if (!part) continue;
    new URLSearchParams(part).forEach((value, key) => params.set(key, value));
  }
  return params;
}

/**
 * Completes e-mail links (sign-up confirmation, password recovery) opened in
 * the app via lawhi://. Tokens are only handed to Supabase, never stored by us.
 */
export async function handleAuthLink(url: string): Promise<AuthLinkResult> {
  if (!supabase) return 'ignored';
  const params = linkParams(url);
  const type = params.get('type');
  const code = params.get('code');
  const accessToken = params.get('access_token');
  const refreshToken = params.get('refresh_token');
  if (params.get('error_description') || params.get('error')) return 'invalid';

  if (code) {
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (error) return 'invalid';
  } else if (accessToken && refreshToken) {
    const { error } = await supabase.auth.setSession({ access_token: accessToken, refresh_token: refreshToken });
    if (error) return 'invalid';
  } else {
    return 'ignored';
  }
  return type === 'recovery' ? 'recovery' : 'signed-in';
}
