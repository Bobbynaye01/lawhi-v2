import type { Session } from '@supabase/supabase-js';
import { useQuery } from '@tanstack/react-query';
import { useEffect, useState } from 'react';
import { NavLink, Route, Routes } from 'react-router';
import { adminApi, errorMessage, isConfigured, supabase } from './lib/api';
import { CausesPage } from './pages/CausesPage';
import { DashboardPage } from './pages/DashboardPage';
import { DonationDetailPage } from './pages/DonationDetailPage';
import { DonationsPage } from './pages/DonationsPage';
import { LoginPage } from './pages/LoginPage';
import { PaymentMethodsPage } from './pages/PaymentMethodsPage';

function useSession() {
  const [session, setSession] = useState<Session | null | undefined>(undefined);
  useEffect(() => {
    if (!supabase) return;
    void supabase.auth.getSession().then(({ data }) => setSession(data.session));
    const { data } = supabase.auth.onAuthStateChange((_e, s) => setSession(s));
    return () => data.subscription.unsubscribe();
  }, []);
  return supabase ? session : null;
}

export function App() {
  const session = useSession();
  const me = useQuery({
    queryKey: ['me', session?.user.id],
    queryFn: adminApi.me,
    enabled: Boolean(session),
  });

  if (!isConfigured) {
    return (
      <main className="centered">
        <h1>Lawhi — Administration</h1>
        <p className="error">
          Configuration manquante : VITE_API_URL, VITE_SUPABASE_URL et VITE_SUPABASE_ANON_KEY (voir
          .env.example).
        </p>
      </main>
    );
  }
  if (session === undefined) return <main className="centered">Chargement…</main>;
  if (!session) return <LoginPage />;
  if (me.isPending) return <main className="centered">Vérification des droits…</main>;
  if (me.isError || me.data.role !== 'admin') {
    return (
      <main className="centered">
        <h1>Accès refusé</h1>
        <p>{me.isError ? errorMessage(me.error) : 'Ce compte n’a pas le rôle administrateur.'}</p>
        <p className="muted">
          Le rôle est attribué côté serveur :{' '}
          <code>pnpm --filter @lawhi/api admin:grant {session.user.email}</code>
        </p>
        <button onClick={() => void supabase?.auth.signOut()}>Se déconnecter</button>
      </main>
    );
  }

  return (
    <div className="layout">
      <nav className="sidebar" aria-label="Navigation principale">
        <strong className="brand">Lawhi · لوحي</strong>
        <NavLink to="/" end>
          Tableau de bord
        </NavLink>
        <NavLink to="/donations">Dons</NavLink>
        <NavLink to="/payment-methods">Moyens de paiement</NavLink>
        <NavLink to="/causes">Projets & montants</NavLink>
        <div className="spacer" />
        <span className="muted small">{session.user.email}</span>
        <button className="link" onClick={() => void supabase?.auth.signOut()}>
          Se déconnecter
        </button>
      </nav>
      <main className="content">
        <Routes>
          <Route path="/" element={<DashboardPage />} />
          <Route path="/donations" element={<DonationsPage />} />
          <Route
            path="/donations/:id"
            element={<DonationDetailPage currentUserId={session.user.id} />}
          />
          <Route path="/payment-methods" element={<PaymentMethodsPage />} />
          <Route path="/causes" element={<CausesPage />} />
          <Route path="*" element={<p>Page introuvable.</p>} />
        </Routes>
      </main>
    </div>
  );
}
