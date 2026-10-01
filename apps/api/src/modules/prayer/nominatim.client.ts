import { Injectable, Logger, ServiceUnavailableException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { Env } from '../../config/env';

export interface CityResult {
  name: string;
  displayName: string;
  country: string | null;
  countryCode: string | null;
  latitude: number;
  longitude: number;
}

interface NominatimItem {
  name?: string;
  display_name: string;
  lat: string;
  lon: string;
  address?: {
    country?: string;
    country_code?: string;
    city?: string;
    town?: string;
    village?: string;
  };
}

const CACHE_TTL_MS = 24 * 60 * 60 * 1000;
const MIN_INTERVAL_MS = 1100;
const MAX_CACHE_ENTRIES = 500;

/**
 * Nominatim usage policy: identify the app, at most 1 request per second, cache
 * results. Requests are serialized through one queue for the whole process.
 */
@Injectable()
export class NominatimClient {
  private readonly logger = new Logger(NominatimClient.name);
  private readonly cache = new Map<string, { at: number; results: CityResult[] }>();
  private queue: Promise<unknown> = Promise.resolve();
  private lastRequestAt = 0;

  constructor(private readonly config: ConfigService<Env, true>) {}

  async searchCities(query: string, language: string): Promise<CityResult[]> {
    const key = `${language}:${query.toLowerCase()}`;
    const cached = this.cache.get(key);
    if (cached && Date.now() - cached.at < CACHE_TTL_MS) return cached.results;

    const results = await this.enqueue(() => this.fetchCities(query, language));
    if (this.cache.size >= MAX_CACHE_ENTRIES) {
      const oldest = this.cache.keys().next().value;
      if (oldest !== undefined) this.cache.delete(oldest);
    }
    this.cache.set(key, { at: Date.now(), results });
    return results;
  }

  private enqueue<T>(task: () => Promise<T>): Promise<T> {
    const run = this.queue.then(async () => {
      const wait = this.lastRequestAt + MIN_INTERVAL_MS - Date.now();
      if (wait > 0) await new Promise((resolve) => setTimeout(resolve, wait));
      this.lastRequestAt = Date.now();
      return task();
    });
    this.queue = run.catch(() => undefined);
    return run;
  }

  private async fetchCities(query: string, language: string): Promise<CityResult[]> {
    const url = new URL('https://nominatim.openstreetmap.org/search');
    url.search = new URLSearchParams({
      q: query,
      format: 'jsonv2',
      addressdetails: '1',
      limit: '8',
      featureType: 'settlement',
      'accept-language': language,
    }).toString();

    let response: Response;
    try {
      response = await fetch(url, {
        headers: { 'User-Agent': this.config.get('NOMINATIM_USER_AGENT', { infer: true }) },
        signal: AbortSignal.timeout(8000),
      });
    } catch (error) {
      this.logger.warn(`Nominatim unreachable: ${(error as Error).message}`);
      throw new ServiceUnavailableException({ error: 'geocoding_unavailable' });
    }
    if (!response.ok) {
      this.logger.warn(`Nominatim returned ${response.status}`);
      throw new ServiceUnavailableException({ error: 'geocoding_unavailable' });
    }

    const items = (await response.json()) as NominatimItem[];
    return items.map((item) => ({
      name:
        item.address?.city ??
        item.address?.town ??
        item.address?.village ??
        item.name ??
        item.display_name,
      displayName: item.display_name,
      country: item.address?.country ?? null,
      countryCode: item.address?.country_code?.toUpperCase() ?? null,
      latitude: Number(item.lat),
      longitude: Number(item.lon),
    }));
  }
}
