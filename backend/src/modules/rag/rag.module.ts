import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { RAGService } from './rag.service';
import { RAGController } from './rag.controller';
import { LocalEmbeddingsService } from './embeddings/openai-embeddings.service';
import { PineconeService } from './vector-db/pinecone.service';
import { LocalLexicalRankerService } from './reranking/cohere-ranker.service';
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
 * - Xenova semantic embeddings (default)
 * - Vector backends: pgvector (Postgres), Pinecone, or in-memory local store
 * - Document chunking for optimal retrieval
 *
 * Backend selection (RAG_VECTOR_BACKEND): pgvector | pinecone | memory
 * Default: pgvector when DataSource is Postgres; else memory; Pinecone when API key set.
 */

@Module({
  imports: [ConfigModule, MetricsModule, CacheModule],
  controllers: [RAGController],
  providers: [
    RAGService,
    EmbeddingService,
    RetrievalService,
    RerankingService,
    ClinicalContextService,
    CitationService,
    LocalEmbeddingsService,
    LocalLexicalRankerService,
    PineconeService,
  ],
  exports: [
    RAGService,
    EmbeddingService,
    RetrievalService,
    CitationService,
    RerankingService,
    LocalLexicalRankerService,
    LocalEmbeddingsService,
    PineconeService,
  ],
})
export class RAGModule {}
