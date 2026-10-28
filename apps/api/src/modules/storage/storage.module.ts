import { Global, Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { SupabaseClient } from '@supabase/supabase-js';
import type { Env } from '../../config/env';
import {
  CAUSE_IMAGE_STORAGE,
  LocalCauseImageStorage,
  SupabaseCauseImageStorage,
} from './cause-image-storage';
import { LocalProofStorage, PROOF_STORAGE, SupabaseProofStorage } from './proof-storage';
import { createSupabaseAdmin, SUPABASE_ADMIN } from './supabase-admin';

@Global()
@Module({
  providers: [
    { provide: SUPABASE_ADMIN, useFactory: createSupabaseAdmin, inject: [ConfigService] },
    {
      provide: PROOF_STORAGE,
      inject: [ConfigService, SUPABASE_ADMIN],
      useFactory: (config: ConfigService<Env, true>, supabase: SupabaseClient | null) => {
        const localDir = config.get('LOCAL_STORAGE_DIR', { infer: true });
        if (localDir) return new LocalProofStorage(localDir);
        if (supabase) {
          return new SupabaseProofStorage(
            supabase,
            config.get('SUPABASE_PROOFS_BUCKET', { infer: true }),
          );
        }
        return null;
      },
    },
    {
      provide: CAUSE_IMAGE_STORAGE,
      inject: [ConfigService, SUPABASE_ADMIN],
      useFactory: (config: ConfigService<Env, true>, supabase: SupabaseClient | null) => {
        const localDir = config.get('LOCAL_STORAGE_DIR', { infer: true });
        if (localDir) return new LocalCauseImageStorage(localDir);
        if (supabase) {
          return new SupabaseCauseImageStorage(
            supabase,
            config.get('SUPABASE_CAUSE_IMAGES_BUCKET', { infer: true }),
          );
        }
        return null;
      },
    },
  ],
  exports: [PROOF_STORAGE, CAUSE_IMAGE_STORAGE, SUPABASE_ADMIN],
})
export class StorageModule {}
