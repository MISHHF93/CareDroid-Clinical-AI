import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { CacheService } from '../cache/cache.service';
import { OpenAIEmbeddingsService } from './embeddings/openai-embeddings.service';

@Injectable()
export class EmbeddingService {
  private readonly cacheTtlSeconds: number;

  constructor(
    private readonly openAiEmbeddings: OpenAIEmbeddingsService,
    private readonly cacheService: CacheService,
    private readonly configService: ConfigService,
  ) {
    const ragConfig = this.configService.get<any>('rag') || {};
    this.cacheTtlSeconds = ragConfig.embeddings?.cacheTtlSeconds || 600;
  }

  async embedQuery(query: string): Promise<number[]> {
    const text = this.normalizeText(query);
    const embedding = await this.cacheService.getOrSet(
      this.cacheKey(text),
      () => this.openAiEmbeddings.embed(text),
      this.cacheTtlSeconds,
    );
    return [...embedding];
  }

  async embedDocuments(texts: string[]): Promise<number[][]> {
    const normalizedTexts = texts.map((text) => this.normalizeText(text));
    const results: number[][] = new Array(normalizedTexts.length);
    const missing = new Map<string, { text: string; indexes: number[] }>();

    for (const [index, text] of normalizedTexts.entries()) {
      const key = this.cacheKey(text);
      const cached = await this.cacheService.get<number[]>(key);
      if (cached) {
        results[index] = [...cached];
        continue;
      }

      const entry = missing.get(key) || { text, indexes: [] };
      entry.indexes.push(index);
      missing.set(key, entry);
    }

    if (missing.size > 0) {
      const missingEntries = [...missing.entries()];
      const embeddings = await this.openAiEmbeddings.embedBatch(
        missingEntries.map(([, entry]) => entry.text),
      );

      await Promise.all(
        missingEntries.map(async ([key, entry], batchIndex) => {
          const embedding = embeddings[batchIndex] || [];
          await this.cacheService.set(key, embedding, this.cacheTtlSeconds);
          for (const originalIndex of entry.indexes) {
            results[originalIndex] = [...embedding];
          }
        }),
      );
    }

    return results;
  }

  getModel(): string {
    return this.openAiEmbeddings.getModel();
  }

  getDimension(): number {
    return this.openAiEmbeddings.getDimension();
  }

  healthCheck(): Promise<boolean> {
    return this.openAiEmbeddings.healthCheck();
  }

  private normalizeText(text: string): string {
    return String(text || '')
      .trim()
      .replace(/\s+/g, ' ');
  }

  private cacheKey(text: string): string {
    return `rag:embedding:${this.getModel()}:${text.toLowerCase()}`;
  }
}
