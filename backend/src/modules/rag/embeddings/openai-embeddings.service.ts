import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createHash } from 'crypto';

/**
 * Embeddings Service
 *
 * Generates deterministic local embeddings for semantic search without creating
 * a second external AI API client.
 */

@Injectable()
export class OpenAIEmbeddingsService {
  private readonly logger = new Logger(OpenAIEmbeddingsService.name);
  private readonly model: string;
  private readonly dimension: number;
  private readonly maxBatchSize: number;
  private readonly cacheTtlMs = 10 * 60 * 1000;
  private readonly healthCheckTtlMs = 60 * 1000;
  private readonly embeddingCache = new Map<string, { value: number[]; expiresAt: number }>();
  private readonly inflightEmbeddings = new Map<string, Promise<number[]>>();
  private healthCheckCache: { value: boolean; expiresAt: number } | null = null;

  constructor(private readonly configService: ConfigService) {
    const ragConfig = this.configService.get<any>('rag');
    const ragEmbeddings = ragConfig?.embeddings || {};

    this.model = ragEmbeddings.model || 'local-deterministic-embedding';
    this.dimension = ragEmbeddings.dimension || 1536;
    this.maxBatchSize = ragEmbeddings.batchSize || 100;
  }

  /**
   * Generate embedding for a single text
   */
  async embed(text: string): Promise<number[]> {
    const cacheKey = this.cacheKey(text);
    const cached = this.embeddingCache.get(cacheKey);
    if (cached && cached.expiresAt > Date.now()) {
      return [...cached.value];
    }
    const inflight = this.inflightEmbeddings.get(cacheKey);
    if (inflight) {
      return inflight.then((embedding) => [...embedding]);
    }

    const promise = this.fetchEmbedding(text, cacheKey);
    this.inflightEmbeddings.set(cacheKey, promise);
    return promise.then((embedding) => [...embedding]);
  }

  private async fetchEmbedding(text: string, cacheKey: string): Promise<number[]> {
    try {
      const embedding = this.generateLocalEmbedding(text);
      this.embeddingCache.set(cacheKey, {
        value: embedding,
        expiresAt: Date.now() + this.cacheTtlMs,
      });
      return embedding;
    } catch (error) {
      const err = error instanceof Error ? error : new Error(String(error));
      this.logger.error(`Failed to generate embedding: ${err.message}`, err.stack);
      throw new Error(`Embedding generation failed: ${err.message}`);
    } finally {
      this.inflightEmbeddings.delete(cacheKey);
    }
  }

  /**
   * Generate embeddings for multiple texts in batch
   * Automatically handles batching if input exceeds API limits
   */
  async embedBatch(texts: string[]): Promise<number[][]> {
    if (texts.length === 0) {
      return [];
    }

    try {
      const results: number[][] = new Array(texts.length);
      const missingByKey = new Map<string, { text: string; indexes: number[] }>();

      texts.forEach((text, index) => {
        const cacheKey = this.cacheKey(text);
        const cached = this.embeddingCache.get(cacheKey);
        if (cached && cached.expiresAt > Date.now()) {
          results[index] = [...cached.value];
          return;
        }
        if (!missingByKey.has(cacheKey)) {
          missingByKey.set(cacheKey, { text, indexes: [] });
        }
        missingByKey.get(cacheKey)!.indexes.push(index);
      });

      const missing = [...missingByKey.entries()];
      if (missing.length === 0) {
        return results;
      }

      const batches: Array<Array<[string, { text: string; indexes: number[] }]>> = [];
      for (let i = 0; i < missing.length; i += this.maxBatchSize) {
        batches.push(missing.slice(i, i + this.maxBatchSize));
      }

      this.logger.log(
        `Generating embeddings for ${missing.length} uncached texts in ${batches.length} batch(es)`,
      );

      for (let i = 0; i < batches.length; i++) {
        const batch = batches[i];
        this.logger.debug(
          `Processing embedding batch ${i + 1}/${batches.length} (${batch.length} texts)`,
        );

        batch.forEach(([cacheKey, entry]) => {
          const embedding = this.generateLocalEmbedding(entry.text);
          this.embeddingCache.set(cacheKey, {
            value: embedding,
            expiresAt: Date.now() + this.cacheTtlMs,
          });
          for (const originalIndex of entry.indexes) {
            results[originalIndex] = [...embedding];
          }
        });
      }

      return results;
    } catch (error) {
      const err = error instanceof Error ? error : new Error(String(error));
      this.logger.error(`Failed to generate batch embeddings: ${err.message}`, err.stack);
      throw new Error(`Batch embedding generation failed: ${err.message}`);
    }
  }

  /**
   * Get the dimension of embeddings produced by this service
   */
  getDimension(): number {
    return this.dimension;
  }

  /**
   * Get the model name used for embeddings
   */
  getModel(): string {
    return this.model;
  }

  /**
   * Verify that local embedding generation is available.
   */
  async healthCheck(): Promise<boolean> {
    if (this.healthCheckCache && this.healthCheckCache.expiresAt > Date.now()) {
      return this.healthCheckCache.value;
    }

    try {
      await this.embed('test');
      this.healthCheckCache = { value: true, expiresAt: Date.now() + this.healthCheckTtlMs };
      return true;
    } catch (error) {
      const err = error instanceof Error ? error : new Error(String(error));
      this.logger.error(`Embeddings health check failed: ${err.message}`);
      this.healthCheckCache = { value: false, expiresAt: Date.now() + this.healthCheckTtlMs };
      return false;
    }
  }

  private generateLocalEmbedding(text: string): number[] {
    const vector = new Array(this.dimension).fill(0);
    const tokens = String(text || '')
      .toLowerCase()
      .replace(/[^a-z0-9\s-]/g, ' ')
      .split(/\s+/)
      .filter(Boolean);

    for (const token of tokens.length ? tokens : ['empty']) {
      const digest = createHash('sha256').update(token).digest();
      const index = digest.readUInt32BE(0) % this.dimension;
      const sign = digest.readUInt32BE(4) % 2 === 0 ? 1 : -1;
      const weight = 1 + (digest.readUInt32BE(8) % 1000) / 1000;
      vector[index] += sign * weight;
    }

    const magnitude = Math.sqrt(vector.reduce((sum, value) => sum + value * value, 0)) || 1;
    return vector.map((value) => Number((value / magnitude).toFixed(6)));
  }

  private cacheKey(text: string): string {
    return `${this.model}:${String(text || '')
      .trim()
      .replace(/\s+/g, ' ')
      .toLowerCase()}`;
  }
}
