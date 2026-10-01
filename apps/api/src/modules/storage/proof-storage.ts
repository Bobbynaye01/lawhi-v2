import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname, join, normalize } from 'node:path';
import type { SupabaseClient } from '@supabase/supabase-js';

export const PROOF_STORAGE = Symbol('PROOF_STORAGE');

/** Private storage for donation proofs. Files are never publicly listable. */
export interface ProofStorage {
  save(path: string, content: Buffer, contentType: string): Promise<void>;
  /** Short-lived URL for an admin to view a proof, or null if unsupported. */
  signedUrl(path: string, expiresInSeconds: number): Promise<string | null>;
  read(path: string): Promise<{ content: Buffer; contentType: string } | null>;
}

export class SupabaseProofStorage implements ProofStorage {
  private bucketReady: Promise<void> | null = null;

  constructor(
    private readonly client: SupabaseClient,
    private readonly bucket: string,
  ) {}

  /** Creates the private bucket on first use if it does not exist yet. */
  private ensureBucket(): Promise<void> {
    this.bucketReady ??= (async () => {
      const existing = await this.client.storage.getBucket(this.bucket);
      if (existing.data) {
        if (existing.data.public) throw new Error(`Bucket ${this.bucket} must be private`);
        return;
      }
      const { error } = await this.client.storage.createBucket(this.bucket, {
        public: false,
        fileSizeLimit: 5 * 1024 * 1024,
        allowedMimeTypes: ['image/jpeg', 'image/png', 'image/webp', 'application/pdf'],
      });
      if (error) throw new Error(`Cannot create proof bucket: ${error.message}`);
    })().catch((error: unknown) => {
      this.bucketReady = null; // retry on next upload
      throw error;
    });
    return this.bucketReady;
  }

  async save(path: string, content: Buffer, contentType: string): Promise<void> {
    await this.ensureBucket();
    const { error } = await this.client.storage
      .from(this.bucket)
      .upload(path, content, { contentType, upsert: false });
    if (error) throw new Error(`Proof upload failed: ${error.message}`);
  }

  async signedUrl(path: string, expiresInSeconds: number): Promise<string | null> {
    const { data, error } = await this.client.storage
      .from(this.bucket)
      .createSignedUrl(path, expiresInSeconds);
    if (error) throw new Error(`Signed URL failed: ${error.message}`);
    return data.signedUrl;
  }

  async read(): Promise<null> {
    return null;
  }
}

/** Development/test only — refused in production by env validation. */
export class LocalProofStorage implements ProofStorage {
  constructor(private readonly root: string) {}

  private resolve(path: string): string {
    const full = normalize(join(this.root, path));
    if (!full.startsWith(normalize(this.root))) throw new Error('Invalid proof path');
    return full;
  }

  async save(path: string, content: Buffer, contentType: string): Promise<void> {
    const full = this.resolve(path);
    await mkdir(dirname(full), { recursive: true });
    await writeFile(full, content);
    await writeFile(`${full}.type`, contentType);
  }

  async signedUrl(): Promise<null> {
    return null;
  }

  async read(path: string) {
    try {
      const full = this.resolve(path);
      return {
        content: await readFile(full),
        contentType: (await readFile(`${full}.type`, 'utf8')).trim(),
      };
    } catch {
      return null;
    }
  }
}
