import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PineconeService } from './vector-db/pinecone.service';
import { DocumentChunker } from './utils/document-chunker';
import { RAGContext, RAGRetrievalOptions } from './dto/rag-context.dto';
import { IngestDocumentDto } from './dto/medical-source.dto';
import { VectorRecord } from './vector-db/vector-db.interface';
import { EmbeddingService } from './embedding.service';
import { RetrievalService } from './retrieval.service';
import { RerankingService } from './reranking.service';
import { ClinicalContextService } from './clinical-context.service';
import { CitationService } from './citation.service';

/**
 * RAG Service
 *
 * Main service for Retrieval-Augmented Generation.
 * Orchestrates document ingestion, embedding generation, vector storage, and retrieval.
 */

@Injectable()
export class RAGService {
  private readonly logger = new Logger(RAGService.name);
  private documentChunker: DocumentChunker;
  private readonly enabled: boolean;
  private readonly defaultTopK: number;
  private readonly defaultMinScore: number;
  private corpusVersion = 1;

  constructor(
    private readonly embeddingService: EmbeddingService,
    private readonly retrievalService: RetrievalService,
    private readonly rerankingService: RerankingService,
    private readonly clinicalContextService: ClinicalContextService,
    private readonly citationService: CitationService,
    private readonly vectorDb: PineconeService,
    private readonly configService: ConfigService,
  ) {
    const ragConfig = this.configService.get<any>('rag') || {};
    this.enabled = ragConfig?.enabled !== false;

    // Wire RAG configuration parameters
    const chunkingConfig = ragConfig.chunking || {};
    const retrievalConfig = ragConfig.retrieval || {};

    this.defaultTopK = retrievalConfig.defaultTopK || 5;
    this.defaultMinScore = retrievalConfig.minScore || 0.7;

    const chunkSize = chunkingConfig.chunkSize || 512;
    const chunkOverlap = chunkingConfig.overlap || 50;

    this.documentChunker = new DocumentChunker(chunkSize, chunkOverlap);
    this.logger.log(
      `RAG configured: topK=${this.defaultTopK}, minScore=${this.defaultMinScore}, chunkSize=${chunkSize}, overlap=${chunkOverlap}`,
    );
  }

  /**
   * Retrieve relevant context for a query
   * This is the main method used by AI chat to augment responses
   */
  async retrieve(query: string, options: RAGRetrievalOptions = {}): Promise<RAGContext> {
    if (!this.enabled) {
      this.logger.warn('RAG is disabled. Returning empty context.');
      return this.clinicalContextService.buildEmptyContext(query);
    }

    const startTime = Date.now();

    try {
      const topK = options.topK || this.defaultTopK;
      const minScore = options.minScore || this.defaultMinScore;
      const includeEmbeddings = options.includeEmbeddings || false;
      const filter = this.buildRetrievalFilter(options);

      this.logger.debug(`Retrieving context for query: "${query.substring(0, 100)}..."`);

      const queryEmbedding = await this.embeddingService.embedQuery(query);
      const retrievalResult = await this.retrievalService.retrieve({
        query,
        queryEmbedding,
        topK,
        minScore,
        includeEmbeddings,
        filter,
        corpusVersion: this.corpusVersion,
      });

      const chunks = await this.rerankingService.rerank(
        query,
        retrievalResult.chunks,
        topK,
        options.rerank !== false,
      );
      const sources = this.citationService.extractSources(chunks);
      const references = this.citationService.buildReferences(chunks, sources);

      const latencyMs = Date.now() - startTime;
      const context = this.clinicalContextService.buildContext({
        query,
        chunks,
        sources,
        references,
        totalRetrieved: retrievalResult.totalRetrieved,
        latencyMs,
        retrievalCacheHit: retrievalResult.cacheHit,
        maxTokens: options.maxTokens,
      });

      this.logger.log(
        `Retrieved ${context.chunks.length} chunks from ${context.sources.length} sources (confidence: ${context.confidence.toFixed(2)}, latency: ${latencyMs}ms)`,
      );

      return context;
    } catch (error) {
      const err = error instanceof Error ? error : new Error(String(error));
      this.logger.error(`Retrieval failed: ${err.message}`, err.stack);
      throw new Error(`Failed to retrieve context: ${err.message}`);
    }
  }

  /**
   * Ingest a document into the RAG system
   * Chunks the document, generates embeddings, and stores in vector DB
   */
  async ingest(dto: IngestDocumentDto): Promise<{
    success: boolean;
    chunksIngested: number;
    sourceId: string;
  }> {
    if (!this.enabled) {
      throw new Error('RAG is disabled. Ingestion is not available.');
    }
    try {
      this.logger.log(`Ingesting document: ${dto.source.title}`);

      // 1. Chunk the document
      const chunks = this.documentChunker.chunkDocument(dto);
      this.logger.debug(`Split document into ${chunks.length} chunks`);

      if (chunks.length === 0) {
        throw new Error('Document chunking produced no chunks');
      }

      // 2. Generate embeddings for all chunks
      const texts = chunks.map((chunk) => chunk.text);
      const embeddings = await this.embeddingService.embedDocuments(texts);
      this.logger.debug(`Generated ${embeddings.length} embeddings`);

      // 3. Create vector records
      const vectorRecords: VectorRecord[] = chunks.map((chunk, index) => ({
        id: `${dto.source.id}_chunk_${chunk.chunkIndex}`,
        vector: embeddings[index],
        text: chunk.text,
        metadata: chunk.metadata,
      }));

      // 4. Upsert to vector database
      await this.vectorDb.upsertBatch(vectorRecords);
      this.invalidateRetrievalCache();
      this.logger.log(`Successfully ingested ${chunks.length} chunks for: ${dto.source.title}`);

      return {
        success: true,
        chunksIngested: chunks.length,
        sourceId: dto.source.id,
      };
    } catch (error) {
      const err = error instanceof Error ? error : new Error(String(error));
      this.logger.error(`Ingestion failed for ${dto.source.title}: ${err.message}`, err.stack);
      throw new Error(`Failed to ingest document: ${err.message}`);
    }
  }

  /**
   * Ingest multiple documents in batch
   */
  async ingestBatch(documents: IngestDocumentDto[]): Promise<{
    successful: number;
    failed: number;
    totalChunks: number;
  }> {
    if (!this.enabled) {
      throw new Error('RAG is disabled. Batch ingestion is not available.');
    }
    let successful = 0;
    let failed = 0;
    let totalChunks = 0;

    for (const doc of documents) {
      try {
        const result = await this.ingest(doc);
        successful++;
        totalChunks += result.chunksIngested;
      } catch (error) {
        const err = error instanceof Error ? error : new Error(String(error));
        this.logger.error(`Failed to ingest ${doc.source.title}: ${err.message}`);
        failed++;
      }
    }

    this.logger.log(
      `Batch ingestion complete: ${successful} successful, ${failed} failed, ${totalChunks} total chunks`,
    );

    return { successful, failed, totalChunks };
  }

  /**
   * Delete a document and all its chunks from the system
   */
  async deleteDocument(sourceId: string): Promise<void> {
    try {
      await this.vectorDb.deleteByFilter({ sourceId });
      this.invalidateRetrievalCache();
      this.logger.log(`Deleted all chunks for source: ${sourceId}`);
    } catch (error) {
      const err = error instanceof Error ? error : new Error(String(error));
      this.logger.error(`Failed to delete document ${sourceId}: ${err.message}`, err.stack);
      throw new Error(`Failed to delete document: ${err.message}`);
    }
  }

  private buildRetrievalFilter(options: RAGRetrievalOptions): Record<string, any> {
    const filter: Record<string, any> = {};
    if (options.documentTypes?.length) {
      filter.type = options.documentTypes;
    } else if (options.documentType) {
      filter.type = options.documentType;
    }
    if (options.specialty) {
      filter.specialty = options.specialty;
    }
    return filter;
  }

  private invalidateRetrievalCache(): void {
    this.corpusVersion += 1;
    this.retrievalService.clearInFlight();
  }

  /**
   * Get statistics about the RAG system
   */
  async getStats(): Promise<{
    totalVectors: number;
    indexName: string;
    embeddingModel: string;
    embeddingDimension: number;
  }> {
    if (!this.enabled) {
      return {
        totalVectors: 0,
        indexName: 'disabled',
        embeddingModel: this.embeddingService.getModel(),
        embeddingDimension: this.embeddingService.getDimension(),
      };
    }

    const indexStats = await this.vectorDb.getStats();

    return {
      totalVectors: indexStats.totalVectors,
      indexName: indexStats.indexName,
      embeddingModel: this.embeddingService.getModel(),
      embeddingDimension: this.embeddingService.getDimension(),
    };
  }

  /**
   * Health check for RAG system components
   */
  async healthCheck(): Promise<{
    healthy: boolean;
    components: {
      embeddings: boolean;
      vectorDb: boolean;
    };
  }> {
    if (!this.enabled) {
      return {
        healthy: true,
        components: {
          embeddings: true,
          vectorDb: true,
        },
      };
    }

    const [embeddingsHealthy, vectorDbHealthy] = await Promise.all([
      this.embeddingService.healthCheck(),
      this.vectorDb.healthCheck(),
    ]);

    return {
      healthy: embeddingsHealthy && vectorDbHealthy,
      components: {
        embeddings: embeddingsHealthy,
        vectorDb: vectorDbHealthy,
      },
    };
  }

  /**
   * Clean up resources
   */
  onModuleDestroy() {
    if (this.documentChunker) {
      this.documentChunker.dispose();
    }
  }
}
