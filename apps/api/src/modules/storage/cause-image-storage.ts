import { mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import { join, normalize } from 'node:path';
import type { SupabaseClient } from '@supabase/supabase-js';

export const CAUSE_IMAGE_STORAGE = Symbol('CAUSE_IMAGE_STORAGE');

/** Path under which locally stored images are served by the API (dev/test only). */
export const LOCAL_CAUSE_IMAGES_ROUTE = '/api/donations/cause-images';

/** Public cover images of donation causes: anyone may read them, only the API writes. */
export interface CauseImageStorage {
  /** Stores the file and returns the URL clients load it from. */
  save(name: string, content: Buffer, contentType: string): Promise<string>;
  /** Removes a file previously returned by save(); unknown URLs are ignored. */
  remove(url: string): Promise<void>;
  /** Local storage only: the file behind LOCAL_CAUSE_IMAGES_ROUTE. */
  read(name: string): Promise<{ content: Buffer; contentType: string } | null>;
}

export class SupabaseCauseImageStorage implements CauseImageStorage {
  private bucketReady: Promise<void> | null = null;

  constructor(
    private readonly client: SupabaseClient,
    private readonly bucket: string,
  ) {}

  /** Creates the public bucket on first use if it does not exist yet. */
  private ensureBucket(): Promise<void> {
    this.bucketReady ??= (async () => {
      const existing = await this.client.storage.getBucket(this.bucket);
      if (existing.data) {
        if (!existing.data.public) throw new Error(`Bucket ${this.bucket} must be public`);
        return;
      }
      const { error } = await this.client.storage.createBucket(this.bucket, {
        public: true,
        fileSizeLimit: 2 * 1024 * 1024,
        allowedMimeTypes: ['image/jpeg', 'image/png', 'image/webp'],
      });
      if (error) throw new Error(`Cannot create cause image bucket: ${error.message}`);
    })().catch((error: unknown) => {
      this.bucketReady = null; // retry on next upload
      throw error;
    });
    return this.bucketReady;
  }

  async save(name: string, content: Buffer, contentType: string): Promise<string> {
    await this.ensureBucket();
    const { error } = await this.client.storage
      .from(this.bucket)
      .upload(name, content, { contentType, upsert: false });
    if (error) throw new Error(`Cause image upload failed: ${error.message}`);
    return this.client.storage.from(this.bucket).getPublicUrl(name).data.publicUrl;
  }

  async remove(url: string): Promise<void> {
    const marker = `/object/public/${this.bucket}/`;
    const at = url.indexOf(marker);
    if (at === -1) return;
    await this.client.storage.from(this.bucket).remove([url.slice(at + marker.length)]);
  }

  async read(): Promise<null> {
    return null;
  }
}

/** Development/test only — refused in production by env validation. */
export class LocalCauseImageStorage implements CauseImageStorage {
  private readonly root: string;

  constructor(root: string) {
    this.root = join(root, 'cause-images');
  }

  private resolve(name: string): string | null {
    const full = normalize(join(this.root, name));
    return full.startsWith(normalize(this.root)) && !name.includes('/') ? full : null;
  }

  async save(name: string, content: Buffer, contentType: string): Promise<string> {
    const full = this.resolve(name);
    if (!full) throw new Error('Invalid image name');
    await mkdir(this.root, { recursive: true });
    await writeFile(full, content);
    await writeFile(`${full}.type`, contentType);
    return `${LOCAL_CAUSE_IMAGES_ROUTE}/${name}`;
  }

  async remove(url: string): Promise<void> {
    if (!url.startsWith(`${LOCAL_CAUSE_IMAGES_ROUTE}/`)) return;
    const full = this.resolve(url.slice(LOCAL_CAUSE_IMAGES_ROUTE.length + 1));
    if (!full) return;
    await rm(full, { force: true });
    await rm(`${full}.type`, { force: true });
  }

  async read(name: string) {
    const full = this.resolve(name);
    if (!full) return null;
    try {
      return {
        content: await readFile(full),
        contentType: (await readFile(`${full}.type`, 'utf8')).trim(),
      };
    } catch {
      return null;
    }
  }
}
