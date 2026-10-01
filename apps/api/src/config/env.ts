import { z } from 'zod';

const envSchema = z
  .object({
    NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
    PORT: z.coerce.number().int().positive().default(3000),
    DATABASE_URL: z.string().url(),
    /** Comma-separated list of allowed browser origins (admin, web app). */
    CORS_ORIGINS: z.string().default(''),
    /** Supabase project URL — JWTs are verified against its public JWKS. */
    SUPABASE_URL: z.string().url().optional(),
    /** Server-only. Used for Storage (donation proofs) and account deletion. */
    SUPABASE_SERVICE_ROLE_KEY: z.string().min(20).optional(),
    SUPABASE_PROOFS_BUCKET: z.string().default('donation-proofs'),
    /** Dev/test only: store proofs on disk instead of Supabase Storage. */
    LOCAL_STORAGE_DIR: z.string().optional(),
    NOMINATIM_USER_AGENT: z.string().default('Lawhi/1.0 (contact: admin@lawhi.app)'),
  })
  .superRefine((env, ctx) => {
    if (env.NODE_ENV === 'production') {
      for (const key of ['SUPABASE_URL', 'SUPABASE_SERVICE_ROLE_KEY'] as const) {
        if (!env[key])
          ctx.addIssue({ code: 'custom', path: [key], message: 'required in production' });
      }
      if (env.LOCAL_STORAGE_DIR) {
        ctx.addIssue({
          code: 'custom',
          path: ['LOCAL_STORAGE_DIR'],
          message: 'not allowed in production',
        });
      }
    }
  });

export type Env = z.infer<typeof envSchema>;

export function validateEnv(raw: Record<string, unknown>): Env {
  const result = envSchema.safeParse(raw);
  if (!result.success) {
    const details = result.error.issues.map((i) => `${i.path.join('.')}: ${i.message}`).join('; ');
    throw new Error(`Invalid environment: ${details}`);
  }
  return result.data;
}
