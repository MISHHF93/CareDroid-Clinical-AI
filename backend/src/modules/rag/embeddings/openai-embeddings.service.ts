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

    try {
      const response = await this.openai.embeddings.create({
        model: this.model,
        input: text,
      });

      return response.data[0].embedding;
    } catch (error) {
      const err = error instanceof Error ? error : new Error(String(error));
      this.logger.error(`Failed to generate embedding: ${err.message}`, err.stack);
      throw new Error(`Embedding generation failed: ${err.message}`);
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
      // Split into batches if needed
      const batches: string[][] = [];
      for (let i = 0; i < texts.length; i += this.maxBatchSize) {
        batches.push(texts.slice(i, i + this.maxBatchSize));
      }

      this.logger.log(
        `Generating embeddings for ${texts.length} texts in ${batches.length} batch(es)`,
      );

      // Process batches sequentially to avoid rate limits
      const allEmbeddings: number[][] = [];

      for (let i = 0; i < batches.length; i++) {
        const batch = batches[i];
        this.logger.debug(`Processing batch ${i + 1}/${batches.length} (${batch.length} texts)`);

        const response = await this.openai.embeddings.create({
          model: this.model,
          input: batch,
        });

        const embeddings = response.data.map((item) => item.embedding);
        allEmbeddings.push(...embeddings);

        // Add small delay between batches to avoid rate limiting
        if (i < batches.length - 1) {
          await this.sleep(100);
        }
      }

      return allEmbeddings;
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
    try {
      // Generate a test embedding
      await this.embed('test');
      return true;
    } catch (error) {
      const err = error instanceof Error ? error : new Error(String(error));
      this.logger.error(`OpenAI embeddings health check failed: ${err.message}`);
      return false;
    }
  }

  /**
   * Sleep utility for rate limiting
   */
  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}
