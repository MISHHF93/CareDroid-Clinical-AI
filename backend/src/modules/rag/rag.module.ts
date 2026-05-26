import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { RAGService } from './rag.service';
import { OpenAIEmbeddingsService } from './embeddings/openai-embeddings.service';
import { PineconeService } from './vector-db/pinecone.service';
import { CohereRankerService } from './reranking/cohere-ranker.service';
import { MetricsModule } from '../metrics/metrics.module';
import { CacheModule } from '../cache/cache.module';
import { EmbeddingService } from './embedding.service';
import { RetrievalService } from './retrieval.service';
import { RerankingService } from './reranking.service';
import { ClinicalContextService } from './clinical-context.service';
import { CitationService } from './citation.service';

/**
 * RAG Module
 *
 * Provides Retrieval-Augmented Generation capabilities using:
 * - OpenAI embeddings for semantic encoding
 * - Pinecone vector database for similarity search
 * - Document chunking for optimal retrieval
 */

@Module({
  imports: [ConfigModule, MetricsModule, CacheModule],
  providers: [
    RAGService,
    EmbeddingService,
    RetrievalService,
    RerankingService,
    ClinicalContextService,
    CitationService,
    OpenAIEmbeddingsService,
    PineconeService,
    CohereRankerService,
  ],
  exports: [
    RAGService,
    EmbeddingService,
    RetrievalService,
    CitationService,
    RerankingService,
    CohereRankerService,
  ],
})
export class RAGModule {}
