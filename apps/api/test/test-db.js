// Resolves the e2e database URL: TEST_DATABASE_URL, or the dev DATABASE_URL
// pointed at the separate `lawhi_test` database. Never the dev database itself.
const { readFileSync } = require('node:fs');
const { join } = require('node:path');

function assertTestDatabase(raw) {
  const name = new URL(raw).pathname.slice(1);
  if (!/_test$/.test(name)) {
    throw new Error(
      `Refusing to run e2e tests on database "${name}": its name must end with _test`,
    );
  }
  return raw;
}

function testDatabaseUrl() {
  if (process.env.TEST_DATABASE_URL) return assertTestDatabase(process.env.TEST_DATABASE_URL);
  const env = readFileSync(join(__dirname, '..', '.env'), 'utf8');
  const match = /^DATABASE_URL="?([^"\n]+)"?/m.exec(env);
  if (!match) throw new Error('DATABASE_URL not found in apps/api/.env');
  const url = new URL(match[1]);
  url.pathname = '/lawhi_test';
  return assertTestDatabase(url.toString());
}

module.exports = { testDatabaseUrl };
