import { Injectable } from '@nestjs/common';
import { RetrievedChunk } from './dto/rag-context.dto';
import { LocalLexicalRankerService } from './reranking/cohere-ranker.service';

@Injectable()
export class RerankingService {
  constructor(private readonly localRanker: LocalLexicalRankerService) {}

  async rerank(
    query: string,
    chunks: RetrievedChunk[],
    topK: number,
    enabled = true,
  ): Promise<RetrievedChunk[]> {
    if (!enabled || chunks.length === 0) {
      return chunks.slice(0, topK);
    }

    return this.localRanker.rerank(query, chunks, topK);
  }

  isEnabled(): boolean {
    return this.localRanker.isEnabled();
  }

  healthCheck(): Promise<boolean> {
    return this.localRanker.healthCheck();
  }
}
