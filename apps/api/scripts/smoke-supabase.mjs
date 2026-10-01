// End-to-end check against the REAL Supabase project (Auth + Storage) and a
// running API. Refuses to run on the Supabase database: it temporarily enables
// a payment method with a test number, which must never happen in production.
//
//   API_URL=http://localhost:3100 node scripts/smoke-supabase.mjs
import { execFileSync } from 'node:child_process';
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { createClient } from '@supabase/supabase-js';

const env = Object.fromEntries(
  readFileSync(join(import.meta.dirname, '..', '.env'), 'utf8')
    .split(/\r?\n/)
    .filter((l) => /^[A-Z_]+=/.test(l))
    .map((l) => [l.slice(0, l.indexOf('=')), l.slice(l.indexOf('=') + 1).replace(/^"|"$/g, '')]),
);
if (env.DATABASE_URL.includes('supabase.com')) {
  console.error(
    'Refus : ce test modifie un moyen de paiement ; il ne tourne que sur la base locale.',
  );
  process.exit(1);
}
const API = process.env.API_URL ?? 'http://localhost:3100';
const PUBLISHABLE = readFileSync(
  join(import.meta.dirname, '..', '..', 'mobile', '.env'),
  'utf8',
).match(/EXPO_PUBLIC_SUPABASE_ANON_KEY=(.+)/)[1];

const admin = createClient(env.SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false },
});
const publicClient = () =>
  createClient(env.SUPABASE_URL, PUBLISHABLE, { auth: { persistSession: false } });

let failures = 0;
const check = (label, ok, detail = '') => {
  console.log(`${ok ? 'OK ' : 'ÉCHEC'} ${label}${detail ? ` — ${detail}` : ''}`);
  if (!ok) failures++;
};
const api = async (path, { token, method = 'GET', body, form } = {}) => {
  const res = await fetch(`${API}/api${path}`, {
    method,
    headers: {
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(body ? { 'Content-Type': 'application/json' } : {}),
    },
    body: form ?? (body ? JSON.stringify(body) : undefined),
  });
  const text = await res.text();
  let json = null;
  try {
    json = JSON.parse(text);
  } catch {
    /* binary */
  }
  return { status: res.status, json, headers: res.headers };
};

const stamp = Date.now().toString(36);
const password = `Lawhi-${stamp}-${Math.random().toString(36).slice(2)}!`;
const emails = {
  donor: `smoke.donor.${stamp}@lawhi-test.dev`,
  admin: `smoke.admin.${stamp}@lawhi-test.dev`,
};

// 1. Registration (server-side, confirmed: no e-mail is sent to a fake address)
const created = {};
for (const [role, email] of Object.entries(emails)) {
  const { data, error } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
  });
  check(`inscription ${role}`, !error, error?.message ?? data.user.id);
  created[role] = data?.user;
}

// 2. Login + session through the public (publishable) key, like the apps
const sessions = {};
for (const [role, email] of Object.entries(emails)) {
  const client = publicClient();
  const { data, error } = await client.auth.signInWithPassword({ email, password });
  check(`connexion ${role}`, !error && Boolean(data.session), error?.message);
  sessions[role] = {
    client,
    token: data.session?.access_token,
    refresh: data.session?.refresh_token,
  };
}
const user = await sessions.donor.client.auth.getUser();
check('session valide (getUser)', user.data.user?.email === emails.donor);
const refreshed = await sessions.donor.client.auth.refreshSession();
check(
  'rafraîchissement de session',
  Boolean(refreshed.data.session?.access_token),
  refreshed.error?.message,
);
sessions.donor.token = refreshed.data.session?.access_token ?? sessions.donor.token;
const wrong = await publicClient().auth.signInWithPassword({
  email: emails.donor,
  password: 'mauvais',
});
check('mauvais mot de passe refusé', Boolean(wrong.error));

// 3. API token verification
check(
  'faux JWT rejeté',
  (await api('/me', { token: 'eyJhbGciOiJFUzI1NiJ9.e30.ZmFrZQ' })).status === 401,
);
const meDonor = await api('/me', { token: sessions.donor.token });
check(
  'JWT Supabase accepté par l’API',
  meDonor.status === 200 && meDonor.json.role === 'user',
  `${meDonor.status}`,
);
check(
  'admin refusé à un utilisateur',
  (await api('/admin/donations', { token: sessions.donor.token })).status === 403,
);
await api('/me', { token: sessions.admin.token });

// 4. Grant admin through the server-only script
execFileSync('node', ['--env-file=.env', 'dist/scripts/grant-admin.js', emails.admin], {
  cwd: join(import.meta.dirname, '..'),
  stdio: 'ignore',
});
check(
  'rôle admin attribué côté serveur',
  (await api('/me', { token: sessions.admin.token })).json?.role === 'admin',
);

// 5. Temporarily enable one method with a test number (local DB only)
const methods = await api('/admin/payment-methods', { token: sessions.admin.token });
const bankily = methods.json.find((m) => m.operator === 'bankily');
const before = {
  phoneNumber: bankily.phoneNumber,
  enabled: bankily.enabled,
  instructions: bankily.instructions,
};
await api(`/admin/payment-methods/${bankily.id}`, {
  token: sessions.admin.token,
  method: 'PATCH',
  body: { phoneNumber: '22334455', enabled: true },
});
const cause = (await api('/donations/causes')).json[0];

try {
  // 6. Pending donation
  const donation = await api('/donations', {
    token: sessions.donor.token,
    method: 'POST',
    body: { causeId: cause.id, paymentMethodId: bankily.id, amount: 1000, donorName: 'Test smoke' },
  });
  check(
    'don créé en attente',
    donation.status === 201 &&
      donation.json.status === 'pending' &&
      donation.json.currency === 'MRU',
    `${donation.status} ${donation.json?.status}`,
  );
  const id = donation.json.id;

  // 7. Proof upload → Supabase Storage
  const png = new Blob(
    [new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0, 0, 0, 0])],
    { type: 'image/png' },
  );
  const form = new FormData();
  form.append('file', png, 'recu.png');
  const proof = await api(`/donations/${id}/proof`, {
    token: sessions.donor.token,
    method: 'POST',
    form,
  });
  check(
    'preuve envoyée',
    proof.status === 201 && proof.json.hasProof && proof.json.status === 'submitted',
    `${proof.status} ${proof.json?.error ?? ''}`,
  );
  const listed = await admin.storage.from('donation-proofs').list(`${created.donor.id}/${id}`);
  check(
    'preuve présente dans Supabase Storage',
    (listed.data ?? []).length === 1,
    listed.error?.message,
  );
  check(
    'aucune preuve sur le disque local',
    !existsSync(join(import.meta.dirname, '..', 'uploads')),
  );
  const anonRead = await fetch(
    `${env.SUPABASE_URL}/storage/v1/object/public/donation-proofs/${created.donor.id}/${id}/${listed.data?.[0]?.name}`,
  );
  check('preuve inaccessible publiquement', anonRead.status >= 400, `${anonRead.status}`);

  // 8. Proof retrieval (admin only, signed URL)
  check(
    'preuve refusée au donateur',
    (await api(`/admin/donations/${id}/proof`, { token: sessions.donor.token })).status === 403,
  );
  const signed = await api(`/admin/donations/${id}/proof`, { token: sessions.admin.token });
  const file = signed.json?.url ? await fetch(signed.json.url) : null;
  check(
    'preuve récupérée par l’admin (URL signée 5 min)',
    file?.status === 200 && file.headers.get('content-type') === 'image/png',
    `${file?.status}`,
  );

  // 9. Admin validation
  check(
    'le donateur ne peut pas confirmer',
    (
      await api(`/admin/donations/${id}/confirm`, {
        token: sessions.donor.token,
        method: 'PATCH',
        body: {},
      })
    ).status === 403,
  );
  const confirmed = await api(`/admin/donations/${id}/confirm`, {
    token: sessions.admin.token,
    method: 'PATCH',
    body: { note: 'smoke test' },
  });
  check('don confirmé par l’admin', confirmed.json?.status === 'confirmed', `${confirmed.status}`);
  const detail = await api(`/admin/donations/${id}`, { token: sessions.admin.token });
  check(
    'historique complet',
    detail.json?.events.map((e) => e.toStatus).join('>') === 'pending>submitted>confirmed',
  );
} finally {
  // Restore the payment method exactly as it was.
  await api(`/admin/payment-methods/${bankily.id}`, {
    token: sessions.admin.token,
    method: 'PATCH',
    body: before,
  });
  const after = (await api('/admin/payment-methods', { token: sessions.admin.token })).json.find(
    (m) => m.id === bankily.id,
  );
  check(
    'moyen de paiement restauré',
    after.enabled === before.enabled && after.phoneNumber === before.phoneNumber,
  );
}

console.log(`\nComptes de test créés dans Supabase Auth : ${Object.values(emails).join(', ')}`);
console.log(failures === 0 ? 'TOUS LES CONTRÔLES SONT PASSÉS' : `${failures} contrôle(s) en échec`);
process.exitCode = failures === 0 ? 0 : 1;
