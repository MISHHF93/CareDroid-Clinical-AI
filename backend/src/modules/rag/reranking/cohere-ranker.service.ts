import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { RetrievedChunk } from '../dto/rag-context.dto';

/**
 * Cohere Reranker Service
 *
 * Reranks retrieved chunks using Cohere's semantic reranking API
 * Improves retrieval quality by reordering results based on semantic relevance to the query
 */

@Injectable()
export class CohereRankerService {
  private readonly logger = new Logger(CohereRankerService.name);
  private readonly apiKey: string;
  private readonly model: string;
  private readonly enabled: boolean;
  private readonly baseUrl = 'https://api.cohere.ai/v1/rerank';

  constructor(private readonly configService: ConfigService) {
    const ragConfig = this.configService.get<any>('rag') || {};
    const rerankingConfig = ragConfig.reranking || {};

    this.apiKey = rerankingConfig.apiKey || '';
    this.model = rerankingConfig.model || 'rerank-english-v2.0';
    this.enabled = rerankingConfig.enabled === true && !!this.apiKey;

    if (this.enabled) {
      this.logger.log(`Cohere reranking enabled with model: ${this.model}`);
    } else {
      this.logger.warn(
        'Cohere reranking disabled. Set RERANK_ENABLED=true and COHERE_API_KEY to enable.',
      );
    }
  }

  /**
   * Rerank retrieved chunks using Cohere API
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

      // Prepare documents for Cohere
      const documents = chunks.map((chunk, index) => ({
        index,
        text: chunk.text.substring(0, 1000), // Cohere has 1000 char limit per doc
      }));

      // Call Cohere Rerank API
      const response = await fetch(this.baseUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${this.apiKey}`,
        },
        body: JSON.stringify({
          model: this.model,
          query,
          documents,
          top_n: topK,
          return_documents: false, // We already have docs, just need scores
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(
          `Cohere API error: ${response.status} - ${error.message || 'Unknown error'}`,
        );
      }

      const result = await response.json();

      // Map reranked results back to chunks
      const rerankedChunks: RetrievedChunk[] = result.results
        .map((ranking: any) => {
          const originalChunk = chunks[ranking.index];
          return {
            ...originalChunk,
            score: ranking.relevance_score, // Update score from Cohere
            _reranked: true,
          };
        })
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
   * Health check for Cohere API connectivity
   */
  async healthCheck(): Promise<boolean> {
    if (!this.enabled) {
      return true; // Not enabled is considered healthy
    }

    try {
      // Test with a simple rerank call
      const response = await fetch(this.baseUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${this.apiKey}`,
        },
        body: JSON.stringify({
          model: this.model,
          query: 'test',
          documents: [{ index: 0, text: 'test document' }],
          top_n: 1,
        }),
      });

      return response.ok;
    } catch (_error) {
      return false;
    }
  }
}
