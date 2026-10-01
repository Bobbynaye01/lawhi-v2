const { mkdtempSync } = require('node:fs');
const { tmpdir } = require('node:os');
const { join } = require('node:path');
const { testDatabaseUrl } = require('./test-db');

process.env.NODE_ENV = 'test';
process.env.DATABASE_URL = testDatabaseUrl();
process.env.SUPABASE_URL = 'https://lawhi-test.supabase.co';
delete process.env.SUPABASE_SERVICE_ROLE_KEY;
process.env.LOCAL_STORAGE_DIR = mkdtempSync(join(tmpdir(), 'lawhi-proofs-'));
process.env.CORS_ORIGINS = 'http://localhost:5173';
