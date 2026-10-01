// Applies migrations and the seed to the dedicated test database before e2e tests.
const { execSync } = require('node:child_process');
const { join } = require('node:path');
const { testDatabaseUrl } = require('./test-db');

module.exports = async () => {
  const env = { ...process.env, DATABASE_URL: testDatabaseUrl() };
  const cwd = join(__dirname, '..');
  execSync('npx prisma migrate deploy', { cwd, env, stdio: 'ignore' });
  execSync('node dist/database/seed/seed.js', { cwd, env, stdio: 'ignore' });
};
