import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { OpenAIEmbeddingsService } from './embeddings/openai-embeddings.service';
import { PineconeService } from './vector-db/pinecone.service';
import { CohereRankerService } from './reranking/cohere-ranker.service';
import { DocumentChunker } from './utils/document-chunker';
import { ToolMetricsService } from '../metrics/tool-metrics.service';
import { RAGContext, RAGRetrievalOptions, RetrievedChunk } from './dto/rag-context.dto';
import { MedicalSource, IngestDocumentDto, DocumentChunk } from './dto/medical-source.dto';
import { VectorRecord } from './vector-db/vector-db.interface';
import { v4 as uuidv4 } from 'uuid';

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
  private readonly retrievalCacheTtlMs = 5 * 60 * 1000;
  private readonly retrievalCache = new Map<string, { value: RAGContext; expiresAt: number }>();
  private readonly retrievalInflight = new Map<string, Promise<RAGContext>>();
  private corpusVersion = 1;

  constructor(
    private readonly embeddingsService: OpenAIEmbeddingsService,
    private readonly vectorDb: PineconeService,
    private readonly configService: ConfigService,
    private readonly toolMetrics: ToolMetricsService,
    private readonly rankerService?: CohereRankerService,
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
      return {
        chunks: [],
        sources: [],
        confidence: 0,
        query,
        timestamp: new Date(),
        totalRetrieved: 0,
        latencyMs: 0,
      };
    }

    const startTime = Date.now();

    try {
      // Set defaults from config
      const topK = options.topK || this.defaultTopK;
      const minScore = options.minScore || this.defaultMinScore;
      const includeEmbeddings = options.includeEmbeddings || false;
      const filter = this.buildRetrievalFilter(options);
      const cacheKey = this.retrievalCacheKey(query, {
        topK,
        minScore,
        includeEmbeddings,
        filter,
        rerankerEnabled: Boolean(this.rankerService?.isEnabled()),
      });
      const cached = this.retrievalCache.get(cacheKey);
      if (cached && cached.expiresAt > Date.now()) {
        return this.cloneCachedContext(cached.value, Date.now() - startTime);
      }
      const inflight = this.retrievalInflight.get(cacheKey);
      if (inflight) {
        const result = await inflight;
        return this.cloneCachedContext(result, Date.now() - startTime);
      }

      this.logger.debug(`Retrieving context for query: "${query.substring(0, 100)}..."`);

      const retrievalPromise = this.retrieveUncached(query, {
        topK,
        minScore,
        includeEmbeddings,
        filter,
        startTime,
      });
      this.retrievalInflight.set(cacheKey, retrievalPromise);
      const context = await retrievalPromise;
      this.retrievalCache.set(cacheKey, {
        value: context,
        expiresAt: Date.now() + this.retrievalCacheTtlMs,
      });
      return context;
    } catch (error) {
      const err = error instanceof Error ? error : new Error(String(error));
      this.logger.error(`Retrieval failed: ${err.message}`, err.stack);
      throw new Error(`Failed to retrieve context: ${err.message}`);
    }
  }

  private async retrieveUncached(
    query: string,
    options: {
      topK: number;
      minScore: number;
      includeEmbeddings: boolean;
      filter: Record<string, any>;
      startTime: number;
    },
  ): Promise<RAGContext> {
    try {
      // 1. Generate query embedding
      const queryEmbedding = await this.embeddingsService.embed(query);

      // 3. Query vector database
      const queryResult = await this.vectorDb.query(queryEmbedding, {
        topK: options.topK,
        minScore: options.minScore,
        filter: options.filter,
        includeVectors: options.includeEmbeddings,
        includeMetadata: true,
      });

      // 4. Map to RetrievedChunks
      let chunks: RetrievedChunk[] = queryResult.matches.map((match) => ({
        id: match.id,
        text: match.text,
        score: match.score,
        metadata: match.metadata,
        embedding: match.vector,
      }));

      // 4a. Rerank results if enabled
      if (this.rankerService?.isEnabled() && chunks.length > 0) {
        chunks = await this.rankerService.rerank(query, chunks, options.topK);
      }

      // Record RAG metrics
      if (chunks.length === 0) {
        // Track empty results (commented out - method not available in toolMetrics)
        // this.toolMetrics.recordRagEmptyResults();
      } else {
        // Record retrieval count (commented out - method not available)
        // this.toolMetrics.recordRagRetrieval(chunks.length);
        // Record relevance scores for each chunk (commented out - method not available)
        // chunks.forEach(chunk => {
        //   this.toolMetrics.recordRagRelevanceScore(chunk.score);
        // });
      }

      // 5. Extract unique sources
      const sources = this.extractUniqueSources(chunks);

      // 6. Calculate overall confidence
      const confidence = this.calculateConfidence(chunks);

      const latencyMs = Date.now() - options.startTime;

      this.logger.log(
        `Retrieved ${chunks.length} chunks from ${sources.length} sources (confidence: ${confidence.toFixed(2)}, latency: ${latencyMs}ms)`,
      );

      return {
        chunks,
        sources,
        confidence,
        query,
        timestamp: new Date(),
        totalRetrieved: queryResult.matches.length,
        latencyMs,
      };
    } finally {
      this.retrievalInflight.delete(
        this.retrievalCacheKey(query, {
          topK: options.topK,
          minScore: options.minScore,
          includeEmbeddings: options.includeEmbeddings,
          filter: options.filter,
          rerankerEnabled: Boolean(this.rankerService?.isEnabled()),
        }),
      );
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
      const embeddings = await this.embeddingsService.embedBatch(texts);
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
    if (options.documentType) {
      filter.type = options.documentType;
    }
    if (options.specialty) {
      filter.specialty = options.specialty;
    }
    return filter;
  }

  private retrievalCacheKey(
    query: string,
    options: {
      topK: number;
      minScore: number;
      includeEmbeddings: boolean;
      filter: Record<string, any>;
      rerankerEnabled: boolean;
    },
  ): string {
    return JSON.stringify({
      corpusVersion: this.corpusVersion,
      query: String(query || '').trim().replace(/\s+/g, ' ').toLowerCase(),
      topK: options.topK,
      minScore: options.minScore,
      includeEmbeddings: options.includeEmbeddings,
      filter: this.stableObject(options.filter),
      rerankerEnabled: options.rerankerEnabled,
    });
  }

  private stableObject(value: Record<string, any>): Record<string, any> {
    return Object.fromEntries(Object.entries(value).sort(([a], [b]) => a.localeCompare(b)));
  }

  private cloneCachedContext(context: RAGContext, latencyMs: number): RAGContext {
    return {
      ...context,
      chunks: context.chunks.map((chunk) => ({
        ...chunk,
        metadata: { ...chunk.metadata },
        embedding: chunk.embedding ? [...chunk.embedding] : undefined,
      })),
      sources: context.sources.map((source) => ({ ...source })),
      timestamp: new Date(),
      latencyMs,
    };
  }

  private invalidateRetrievalCache(): void {
    this.corpusVersion += 1;
    this.retrievalCache.clear();
    this.retrievalInflight.clear();
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
        embeddingModel: this.embeddingsService.getModel(),
        embeddingDimension: this.embeddingsService.getDimension(),
      };
    }

    const indexStats = await this.vectorDb.getStats();

    return {
      totalVectors: indexStats.totalVectors,
      indexName: indexStats.indexName,
      embeddingModel: this.embeddingsService.getModel(),
      embeddingDimension: this.embeddingsService.getDimension(),
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
      this.embeddingsService.healthCheck(),
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
   * Extract unique medical sources from chunks
   */
  private extractUniqueSources(chunks: RetrievedChunk[]): MedicalSource[] {
    const sourceMap = new Map<string, MedicalSource>();

    for (const chunk of chunks) {
      const { metadata } = chunk;
      const sourceId = metadata.sourceId;

      if (!sourceMap.has(sourceId)) {
        sourceMap.set(sourceId, {
          id: sourceId,
          title: metadata.title,
          type: metadata.type,
          organization: metadata.organization,
          date: metadata.date,
          url: metadata.url,
          specialty: metadata.specialty,
          tags: metadata.tags,
        });
      }
    }

    return Array.from(sourceMap.values());
  }

  /**
   * Calculate overall confidence score from chunk scores
   * Uses weighted average: top chunks have more weight
   * Returns normalized score between 0 and 1
   */
  private calculateConfidence(chunks: RetrievedChunk[]): number {
    if (chunks.length === 0) {
      return 0;
    }

    // Validate and normalize chunk scores (should be 0-1 from vector DB)
    const validChunks = chunks.filter(
      (chunk) => typeof chunk.score === 'number' && chunk.score >= 0 && chunk.score <= 1,
    );

    if (validChunks.length === 0) {
      // Fallback: if no valid scores, return count-based confidence (min 10 chunks = 1.0)
      return Math.min(chunks.length / 10, 1.0);
    }

    // Weight chunks by position (first chunk has highest weight)
    // Formula: weight = 1 / (index + 1) for exponential decay
    let totalWeight = 0;
    let weightedSum = 0;

    validChunks.forEach((chunk, index) => {
      const weight = 1 / Math.pow(index + 1, 1.2); // Smooth exponential decay
      // Ensure score is in 0-1 range
      const normalizedScore = Math.min(Math.max(chunk.score, 0), 1);
      weightedSum += normalizedScore * weight;
      totalWeight += weight;
    });

    const confidence = totalWeight > 0 ? weightedSum / totalWeight : 0;
    // Return confidence clamped to 0-1 range
    return Math.min(Math.max(confidence, 0), 1);
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
