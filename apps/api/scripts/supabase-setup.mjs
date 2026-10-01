// One-shot, non-destructive setup of the Supabase database:
//   1. switch DATABASE_URL to Supabase (use-supabase-db.mjs, connection test)
//   2. inspect what already exists — abort on unknown tables (no baseline guessing)
//   3. prisma migrate deploy (never reset)
//   4. idempotent seed (upserts; admin-controlled rows are never overwritten)
//   5. verify counts, RLS, foreign keys, indexes and the private proof bucket
//
//   node scripts/supabase-setup.mjs
import { execSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { createClient } from '@supabase/supabase-js';
import pg from 'pg';

const root = join(import.meta.dirname, '..');
const run = (cmd) => execSync(cmd, { cwd: root, stdio: 'inherit' });
const readEnv = () =>
  Object.fromEntries(
    readFileSync(join(root, '.env'), 'utf8')
      .split(/\r?\n/)
      .filter((l) => /^[A-Z_]+=/.test(l))
      .map((l) => [l.slice(0, l.indexOf('=')), l.slice(l.indexOf('=') + 1).replace(/^"|"$/g, '')]),
  );

const OUR_TABLES = new Set([
  'User',
  'UserSettings',
  'Surah',
  'Verse',
  'Reciter',
  'ReadingPosition',
  'Bookmark',
  'DhikrCategory',
  'Dhikr',
  'Book',
  'BookChapter',
  'BookEntry',
  'DonationCause',
  'PaymentMethod',
  'Donation',
  'DonationEvent',
  'AppConfig',
  '_prisma_migrations',
]);

async function query(sql) {
  const client = new pg.Client({
    connectionString: readEnv().DATABASE_URL,
    ssl: { rejectUnauthorized: false },
  });
  await client.connect();
  try {
    return (await client.query(sql)).rows;
  } finally {
    await client.end();
  }
}

console.log('== 1. Connexion');
if (!readEnv().DATABASE_URL.includes('supabase.com')) run('node scripts/use-supabase-db.mjs');

console.log('== 2. Existant');
const tables = (await query(`select tablename from pg_tables where schemaname = 'public'`)).map(
  (r) => r.tablename,
);
const unknown = tables.filter((t) => !OUR_TABLES.has(t));
console.log(`tables publiques existantes : ${tables.length ? tables.join(', ') : 'aucune'}`);
if (unknown.length > 0) {
  console.error(
    `Arrêt : tables inconnues dans "public" (${unknown.join(', ')}). Aucune modification faite.`,
  );
  process.exit(1);
}
if (tables.length > 0 && !tables.includes('_prisma_migrations')) {
  console.error(
    'Arrêt : tables Lawhi présentes sans historique de migrations. Aucune modification faite.',
  );
  process.exit(1);
}
const before = tables.includes('Verse')
  ? (
      await query(
        `select (select count(*) from "Verse")::int v, (select count(*) from "PaymentMethod")::int pm, (select count(*) from "Donation")::int d`,
      )
    )[0]
  : null;
console.log(`avant : ${before ? JSON.stringify(before) : 'base vide'}`);

console.log('== 3. Migrations (deploy, jamais reset)');
run('npx prisma migrate deploy');

console.log('== 4. Données initiales (idempotent)');
run('npx prisma generate');
run('npx nest build');
run('node dist/database/seed/seed.js');

console.log('== 5. Vérifications');
const [counts] = await query(`select
  (select count(*) from "Surah")::int surahs,
  (select count(*) from "Verse" where riwaya = 'hafs')::int hafs,
  (select count(*) from "Verse" where riwaya = 'warsh')::int warsh,
  (select count(*) from "Reciter" where enabled)::int reciters,
  (select count(*) from "Dhikr")::int adhkar,
  (select count(*) from "Book")::int books,
  (select count(*) from "BookEntry")::int entries,
  (select count(*) from "DonationCause")::int causes,
  (select count(*) from "PaymentMethod")::int methods,
  (select count(*) from "PaymentMethod" where enabled or "phoneNumber" is not null)::int methods_configured,
  (select count(*) from "Donation")::int donations`);
console.log(counts);
const [schema] = await query(`select
  (select count(*) from pg_class where relnamespace = 'public'::regnamespace and relkind = 'r')::int tables,
  (select count(*) from pg_class where relnamespace = 'public'::regnamespace and relkind = 'r' and relrowsecurity)::int rls,
  (select count(*) from pg_constraint where connamespace = 'public'::regnamespace and contype = 'f')::int foreign_keys,
  (select count(*) from pg_indexes where schemaname = 'public')::int indexes,
  (select count(*) from pg_extension where extname = 'pg_trgm')::int trgm,
  (select count(*) from _prisma_migrations where finished_at is not null and rolled_back_at is null)::int migrations`);
console.log(schema);

const env = readEnv();
const storage = createClient(env.SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false },
});
const bucket = (await storage.storage.getBucket('donation-proofs')).data;
console.log({ bucket: bucket?.id, public: bucket?.public });

const ok =
  counts.surahs === 114 &&
  counts.hafs === 6236 &&
  counts.warsh === 6213 &&
  counts.reciters === 20 &&
  counts.adhkar === 85 &&
  counts.books === 7 &&
  counts.methods === 7 &&
  counts.causes >= 6 &&
  schema.rls === schema.tables &&
  schema.trgm === 1 &&
  schema.migrations === 4 &&
  bucket &&
  !bucket.public &&
  (before ? counts.donations >= before.d : true);
console.log(ok ? 'SUPABASE PRÊT' : 'VÉRIFICATION EN ÉCHEC');
process.exit(ok ? 0 : 1);
