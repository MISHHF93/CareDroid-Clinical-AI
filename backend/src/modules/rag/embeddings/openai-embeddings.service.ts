import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import OpenAI from 'openai';

/**
 * OpenAI Embeddings Service
 *
 * Generates embeddings using OpenAI's text-embedding-ada-002 model.
 * Embeddings are 1536-dimensional vectors used for semantic search.
 */

@Injectable()
export class OpenAIEmbeddingsService {
  private readonly logger = new Logger(OpenAIEmbeddingsService.name);
  private readonly openai: OpenAI;
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
    const openaiConfig = this.configService.get<any>('openai');

    this.model = ragEmbeddings.model || 'text-embedding-ada-002';
    this.dimension = ragEmbeddings.dimension || 1536;
    this.maxBatchSize = ragEmbeddings.batchSize || 100;

    const apiKey = openaiConfig?.apiKey;

    if (!apiKey) {
      this.logger.warn('OPENAI_API_KEY is not configured. Embeddings service will not function.');
      // Create a dummy OpenAI client to prevent null errors
      this.openai = null as any;
      return;
    }

    this.openai = new OpenAI({ apiKey });
  }

  /**
   * Generate embedding for a single text
   */
  async embed(text: string): Promise<number[]> {
    if (!this.openai) {
      throw new Error('OpenAI API key not configured. Cannot generate embeddings.');
    }

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
      const response = await this.openai.embeddings.create({
        model: this.model,
        input: text,
      });

      const embedding = response.data[0].embedding;
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
        this.logger.debug(`Processing embedding batch ${i + 1}/${batches.length} (${batch.length} texts)`);

        const response = await this.openai.embeddings.create({
          model: this.model,
          input: batch.map(([, entry]) => entry.text),
        });

        response.data.forEach((item, batchIndex) => {
          const [cacheKey, entry] = batch[batchIndex];
          this.embeddingCache.set(cacheKey, {
            value: item.embedding,
            expiresAt: Date.now() + this.cacheTtlMs,
          });
          for (const originalIndex of entry.indexes) {
            results[originalIndex] = [...item.embedding];
          }
        });

        if (i < batches.length - 1) {
          await this.sleep(100);
        }
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
   * Verify that the OpenAI API is accessible
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
      this.logger.error(`OpenAI embeddings health check failed: ${err.message}`);
      this.healthCheckCache = { value: false, expiresAt: Date.now() + this.healthCheckTtlMs };
      return false;
    }
  }

  private cacheKey(text: string): string {
    return `${this.model}:${String(text || '').trim().replace(/\s+/g, ' ').toLowerCase()}`;
  }

  /**
   * Sleep utility for rate limiting
   */
  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}
