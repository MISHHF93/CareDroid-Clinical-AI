import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { RetrievedChunk } from '../dto/rag-context.dto';

/**
 * Reranker Service
 *
 * Reranks retrieved chunks locally to avoid creating a second external AI API client.
 */

@Injectable()
export class CohereRankerService {
  private readonly logger = new Logger(CohereRankerService.name);
  private readonly model: string;
  private readonly enabled: boolean;

  constructor(private readonly configService: ConfigService) {
    const ragConfig = this.configService.get<any>('rag') || {};
    const rerankingConfig = ragConfig.reranking || {};

    this.model = rerankingConfig.model || 'local-keyword-reranker';
    this.enabled = rerankingConfig.enabled === true;

    if (this.enabled) {
      this.logger.log(`Local reranking enabled with model: ${this.model}`);
    } else {
      this.logger.warn('Reranking disabled. Set RERANK_ENABLED=true to enable local reranking.');
    }
  }

  /**
   * Rerank retrieved chunks using local lexical overlap.
   * @param query Original search query
   * @param chunks Retrieved chunks to rerank
   * @param topK Number of top results to return after reranking
   * @returns Reranked chunks sorted by relevance
   */
  async rerank(
    query: string,
    chunks: RetrievedChunk[],
    topK: number = 5,
  ): Promise<RetrievedChunk[]> {
    if (!this.enabled) {
      this.logger.warn('Reranking disabled, returning original order');
      return chunks.slice(0, topK);
    }

    if (chunks.length === 0) {
      return [];
    }

    try {
      this.logger.debug(
        `Reranking ${chunks.length} chunks for query: "${query.substring(0, 50)}..."`,
      );

      const queryTerms = this.termSet(query);
      const rerankedChunks: RetrievedChunk[] = chunks
        .map((chunk) => {
          const chunkTerms = this.termSet(chunk.text);
          const overlap = [...queryTerms].filter((term) => chunkTerms.has(term)).length;
          const lexicalScore = queryTerms.size ? overlap / queryTerms.size : 0;
          return {
            ...chunk,
            score: Number((chunk.score * 0.7 + lexicalScore * 0.3).toFixed(6)),
            _reranked: true,
          };
        })
        .sort((a, b) => b.score - a.score)
        .slice(0, topK);

      this.logger.debug(`Reranked to top ${rerankedChunks.length} results`);
      return rerankedChunks;
    } catch (error) {
      const err = error instanceof Error ? error : new Error(String(error));
      this.logger.error(`Reranking failed: ${err.message}`, err.stack);
      // Graceful fallback: return original chunks sorted by score
      return chunks.sort((a, b) => b.score - a.score).slice(0, topK);
    }
  }

  /**
   * Batch rerank multiple queries
   * Useful for reranking multiple sets of chunks
   */
  async rerankBatch(
    queries: Array<{ query: string; chunks: RetrievedChunk[] }>,
    topK: number = 5,
  ): Promise<Array<RetrievedChunk[]>> {
    return Promise.all(queries.map((q) => this.rerank(q.query, q.chunks, topK)));
  }

  /**
   * Check if reranking is enabled
   */
  isEnabled(): boolean {
    return this.enabled;
  }

  /**
   * Health check for local reranking.
   */
  async healthCheck(): Promise<boolean> {
    return true;
  }

  private termSet(text: string): Set<string> {
    return new Set(
      String(text || '')
        .toLowerCase()
        .replace(/[^a-z0-9\s-]/g, ' ')
        .split(/\s+/)
        .filter((term) => term.length > 2),
    );
  }
}
