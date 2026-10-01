import { validateEnv } from './env';

const base = { DATABASE_URL: 'postgresql://u:p@localhost:5432/lawhi' };

describe('validateEnv', () => {
  it('applies defaults in development', () => {
    expect(validateEnv(base)).toMatchObject({ NODE_ENV: 'development', PORT: 3000 });
  });

  it('requires Supabase server credentials in production', () => {
    expect(() => validateEnv({ ...base, NODE_ENV: 'production' })).toThrow(/SUPABASE_URL/);
  });

  it('forbids local proof storage in production', () => {
    expect(() =>
      validateEnv({
        ...base,
        NODE_ENV: 'production',
        SUPABASE_URL: 'https://x.supabase.co',
        SUPABASE_SERVICE_ROLE_KEY: 'service-role-key-0123456789',
        LOCAL_STORAGE_DIR: '/tmp/proofs',
      }),
    ).toThrow(/LOCAL_STORAGE_DIR/);
  });

  it('never echoes secret values in its error', () => {
    try {
      validateEnv({ DATABASE_URL: 'not a url with password hunter2' });
    } catch (error) {
      expect((error as Error).message).not.toContain('hunter2');
    }
  });
});
