import type { Session } from '@supabase/supabase-js';
import { useEffect, useState } from 'react';
import { supabase } from '../services/supabase';

export interface AuthState {
  configured: boolean;
  loading: boolean;
  session: Session | null;
}

/** Current Supabase session, kept in sync with sign-in/out and token refresh. */
export function useAuth(): AuthState {
  const [state, setState] = useState<AuthState>({
    configured: supabase !== null,
    loading: supabase !== null,
    session: null,
  });

  useEffect(() => {
    if (!supabase) return;
    let active = true;
    void supabase.auth.getSession().then(({ data }) => {
      if (active) setState({ configured: true, loading: false, session: data.session });
    });
    const { data } = supabase.auth.onAuthStateChange((_event, session) => {
      setState({ configured: true, loading: false, session });
    });
    return () => {
      active = false;
      data.subscription.unsubscribe();
    };
  }, []);

  return state;
}
