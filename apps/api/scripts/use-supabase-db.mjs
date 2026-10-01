// Switches apps/api/.env to the Supabase database.
//
//   node scripts/use-supabase-db.mjs
//
// Reads SUPABASE_URL and SUPABASE_DB_PASSWORD from .env, builds the Session
// pooler URL (password URL-encoded), checks the connection, then writes
// DATABASE_URL. The previous value is kept as DATABASE_URL_LOCAL. The password
// is never printed.
import { readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import pg from 'pg';

const POOLER_HOST = process.env.SUPABASE_POOLER_HOST ?? 'aws-0-eu-west-2.pooler.supabase.com';
const envPath = join(import.meta.dirname, '..', '.env');
const lines = readFileSync(envPath, 'utf8').split(/\r?\n/);
const get = (key) => {
  const line = lines.find((l) => l.startsWith(`${key}=`));
  return line ? line.slice(key.length + 1).replace(/^"|"$/g, '') : '';
};

const ref = new URL(get('SUPABASE_URL')).hostname.split('.')[0];
const password = get('SUPABASE_DB_PASSWORD');
if (!password) {
  console.error('SUPABASE_DB_PASSWORD est vide dans apps/api/.env');
  process.exit(1);
}

const url = `postgresql://postgres.${ref}:${encodeURIComponent(password)}@${POOLER_HOST}:5432/postgres?schema=public&sslmode=require`;
const client = new pg.Client({ connectionString: url, ssl: { rejectUnauthorized: false } });
try {
  await client.connect();
  const { rows } = await client.query('select current_database() as db, version() as v');
  console.warn(`Connexion OK : ${rows[0].db} — ${rows[0].v.split(' on ')[0]}`);
} catch (error) {
  console.error(`Connexion refusée : ${error.message}`);
  process.exit(1);
} finally {
  await client.end().catch(() => undefined);
}

const current = get('DATABASE_URL');
const next = lines
  .filter((l) => !l.startsWith('DATABASE_URL=') && !l.startsWith('DATABASE_URL_LOCAL='))
  .concat(current && !current.includes('supabase.com') ? [`DATABASE_URL_LOCAL="${current}"`] : [])
  .concat([`DATABASE_URL="${url}"`]);
writeFileSync(envPath, next.join('\n').replace(/\n{3,}/g, '\n\n') + '\n');
console.warn(
  'DATABASE_URL pointe maintenant vers Supabase (ancienne valeur : DATABASE_URL_LOCAL).',
);
