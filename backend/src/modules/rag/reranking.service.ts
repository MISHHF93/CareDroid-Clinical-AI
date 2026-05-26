import { Injectable } from '@nestjs/common';
import { RetrievedChunk } from './dto/rag-context.dto';
import { CohereRankerService } from './reranking/cohere-ranker.service';

@Injectable()
export class RerankingService {
  constructor(private readonly cohereRanker: CohereRankerService) {}

  async rerank(
    query: string,
    chunks: RetrievedChunk[],
    topK: number,
    enabled = true,
  ): Promise<RetrievedChunk[]> {
    if (!enabled || chunks.length === 0) {
      return chunks.slice(0, topK);
    }

    return this.cohereRanker.rerank(query, chunks, topK);
  }

  isEnabled(): boolean {
    return this.cohereRanker.isEnabled();
  }

  healthCheck(): Promise<boolean> {
    return this.cohereRanker.healthCheck();
  }
}
