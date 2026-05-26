import { Injectable } from '@nestjs/common';
import { createHash } from 'crypto';
import { CostOptimizerCacheStats } from './cost-optimizer.types';

interface CacheEntry<T> {
  value: T;
  expiresAt: number;
}

@Injectable()
export class CacheService {
  private readonly entries = new Map<string, CacheEntry<unknown>>();
  private hits = 0;
  private misses = 0;

  readonly defaultTtlSeconds = 300;

  get<T>(key: string): T | null {
    const entry = this.entries.get(key);
    if (!entry) {
      this.misses += 1;
      return null;
    }

    if (Date.now() > entry.expiresAt) {
      this.entries.delete(key);
      this.misses += 1;
      return null;
    }

    this.hits += 1;
    return entry.value as T;
  }

  set<T>(key: string, value: T, ttlSeconds = this.defaultTtlSeconds): void {
    this.entries.set(key, {
      value,
      expiresAt: Date.now() + ttlSeconds * 1000,
    });
  }

  buildKey(payload: unknown): string {
    return `cost-optimizer:${createHash('sha256')
      .update(this.stableStringify(payload))
      .digest('hex')
      .slice(0, 32)}`;
  }

  getStats(): CostOptimizerCacheStats {
    const totalLookups = this.hits + this.misses;
    return {
      hits: this.hits,
      misses: this.misses,
      hitRate: totalLookups === 0 ? 0 : this.round(this.hits / totalLookups),
      entryCount: this.entries.size,
    };
  }

  clear(): void {
    this.entries.clear();
    this.hits = 0;
    this.misses = 0;
  }

  private stableStringify(value: unknown): string {
    if (value === null || typeof value !== 'object') {
      return JSON.stringify(value);
    }

    if (Array.isArray(value)) {
      return `[${value.map((item) => this.stableStringify(item)).join(',')}]`;
    }

    return `{${Object.keys(value as Record<string, unknown>)
      .sort()
      .map(
        (key) =>
          `${JSON.stringify(key)}:${this.stableStringify((value as Record<string, unknown>)[key])}`,
      )
      .join(',')}}`;
  }

  private round(value: number): number {
    return Math.round(value * 1000) / 1000;
  }
}
