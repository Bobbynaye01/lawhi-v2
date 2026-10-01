// Resolves the e2e database URL: TEST_DATABASE_URL, or the local development
// database (DATABASE_URL_LOCAL, else DATABASE_URL) pointed at the separate
// `lawhi_test` database. Never a remote database implicitly, never the dev DB.
const { readFileSync } = require('node:fs');
const { join } = require('node:path');

const LOCAL_HOSTS = new Set(['localhost', '127.0.0.1', '::1', '[::1]']);

function assertTestDatabase(raw, { allowRemote }) {
  const url = new URL(raw);
  const name = url.pathname.slice(1);
  if (!/_test$/.test(name)) {
    throw new Error(
      `Refusing to run e2e tests on database "${name}": its name must end with _test`,
    );
  }
  if (!allowRemote && !LOCAL_HOSTS.has(url.hostname)) {
    throw new Error(
      `Refusing to run e2e tests on remote host "${url.hostname}": set TEST_DATABASE_URL explicitly`,
    );
  }
  return raw;
}

function testDatabaseUrl() {
  if (process.env.TEST_DATABASE_URL) {
    return assertTestDatabase(process.env.TEST_DATABASE_URL, { allowRemote: true });
  }
  const env = readFileSync(join(__dirname, '..', '.env'), 'utf8');
  const match =
    /^DATABASE_URL_LOCAL="?([^"\n]+)"?/m.exec(env) ?? /^DATABASE_URL="?([^"\n]+)"?/m.exec(env);
  if (!match) throw new Error('DATABASE_URL(_LOCAL) not found in apps/api/.env');
  const url = new URL(match[1]);
  url.pathname = '/lawhi_test';
  return assertTestDatabase(url.toString(), { allowRemote: false });
}

module.exports = { testDatabaseUrl };
