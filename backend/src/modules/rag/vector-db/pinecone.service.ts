import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Pinecone, Index, RecordMetadata } from '@pinecone-database/pinecone';
import { join } from 'path';
import {
  IVectorDatabase,
  VectorRecord,
  QueryResult,
  VectorQueryOptions,
  IndexStats,
  VectorMatch,
} from './vector-db.interface';
import { ChunkMetadata } from '../dto/rag-context.dto';
import { InMemoryVectorStore } from './in-memory-vector.store';

/**
 * Pinecone Vector Database Service
 *
 * Implements vector storage and retrieval using Pinecone's managed service.
 * Provides high-performance similarity search for RAG.
 */

@Injectable()
export class PineconeService implements IVectorDatabase, OnModuleInit {
  private readonly logger = new Logger(PineconeService.name);
  private pinecone: Pinecone;
  private index: Index<RecordMetadata>;
  private indexName: string;
  private dimension: number;
  private namespace: string;
  private initialized = false;
  private useInMemory = false;
  private inMemoryStore: InMemoryVectorStore | null = null;

  constructor(private readonly configService: ConfigService) {
    const ragConfig = this.configService.get<any>('rag');
    const pineconeConfig = ragConfig?.pinecone || {};

    this.indexName = pineconeConfig.indexName || 'caredroid-medical';
    this.dimension = pineconeConfig.dimension || 1536;
    this.namespace = (pineconeConfig.namespace || '').trim();
  }

  async onModuleInit() {
    await this.initialize();
  }

  /**
   * Initialize connection to Pinecone
   */
  async initialize(): Promise<void> {
    if (this.initialized) {
      return;
    }

    try {
      const ragConfig = this.configService.get<any>('rag');
      const pineconeConfig = ragConfig?.pinecone || {};
      const apiKey = pineconeConfig.apiKey;

      if (!apiKey) {
        const persistPath =
          process.env.RAG_LOCAL_INDEX_PATH ||
          join(process.cwd(), '.rag-local', 'vectors.json');
        this.inMemoryStore = new InMemoryVectorStore(
          this.dimension,
          'in-memory-local',
          persistPath,
        );
        await this.inMemoryStore.loadFromDisk();
        this.useInMemory = true;
        this.initialized = true;
        const stats = await this.inMemoryStore.getStats();
        this.logger.log(
          `RAG using in-memory vector store (${stats.totalVectors} vectors) — set PINECONE_API_KEY for Pinecone.`,
        );
        return;
      }

      this.logger.log('Initializing Pinecone client...');

      this.pinecone = new Pinecone({
        apiKey,
      });

      // Get or create index
      this.index = this.pinecone.index(this.indexName);

      // Verify index exists by getting stats
      await this.getStats();

      this.initialized = true;
      this.logger.log(
        `Successfully connected to Pinecone index: ${this.indexName}` +
          (this.namespace ? ` (namespace: ${this.namespace})` : ''),
      );
    } catch (error) {
      const err = error instanceof Error ? error : new Error(String(error));
      this.logger.error(`Failed to initialize Pinecone: ${err.message}`, err.stack);
      this.logger.warn('Vector database functionality will be disabled.');
      // Don't throw - allow server to continue without vector DB
    }
  }

  /**
   * Query the vector database with a query embedding
   */
  isInMemoryMode(): boolean {
    return this.useInMemory;
  }

  async query(queryVector: number[], options: VectorQueryOptions): Promise<QueryResult> {
    if (!this.initialized) {
      await this.initialize();
    }
    if (this.useInMemory && this.inMemoryStore) {
      return this.inMemoryStore.query(queryVector, options);
    }

    const startTime = Date.now();

    try {
      const {
        topK,
        minScore = 0.0,
        filter,
        includeVectors = false,
        includeMetadata = true,
      } = options;

      const queryRequest: any = {
        vector: queryVector,
        topK,
        includeValues: includeVectors,
        includeMetadata,
      };

      if (filter) {
        queryRequest.filter = this.buildFilter(filter);
      }

      const response = await this.getIndexClient().query(queryRequest);

      // Filter by minimum score and map to VectorMatch
      const matches: VectorMatch[] = response.matches
        .filter((match) => match.score >= minScore)
        .map((match) => this.mapToVectorMatch(match, includeVectors));

      const latencyMs = Date.now() - startTime;

      this.logger.debug(`Query returned ${matches.length}/${topK} matches in ${latencyMs}ms`);

      return {
        matches,
        latencyMs,
        total: matches.length,
      };
    } catch (error) {
      const err = error instanceof Error ? error : new Error(String(error));
      this.logger.error(`Query failed: ${err.message}`, err.stack);
      throw new Error(`Pinecone query failed: ${err.message}`);
    }
  }

  /**
   * Insert a single vector record
   */
  async upsert(record: VectorRecord): Promise<void> {
    await this.upsertBatch([record]);
  }

  /**
   * Insert multiple vector records in batch
   */
  async upsertBatch(records: VectorRecord[]): Promise<void> {
    if (!this.initialized) {
      await this.initialize();
    }

    if (records.length === 0) {
      return;
    }

    if (this.useInMemory && this.inMemoryStore) {
      await this.inMemoryStore.upsertBatch(records);
      return;
    }

    try {
      // Convert to Pinecone format
      const vectors = records.map((record) => ({
        id: record.id,
        values: record.vector,
        metadata: {
          text: record.text,
          ...this.flattenMetadata(record.metadata),
        },
      }));

      // Pinecone recommends batches of 100 or less
      const batchSize = 100;
      for (let i = 0; i < vectors.length; i += batchSize) {
        const batch = vectors.slice(i, i + batchSize);
        await this.getIndexClient().upsert(batch);
        this.logger.debug(`Upserted batch ${i / batchSize + 1} (${batch.length} vectors)`);
      }

      this.logger.log(`Successfully upserted ${records.length} vectors`);
    } catch (error) {
      const err = error instanceof Error ? error : new Error(String(error));
      this.logger.error(`Upsert failed: ${err.message}`, err.stack);
      throw new Error(`Pinecone upsert failed: ${err.message}`);
    }
  }

  /**
   * Delete records by ID
   */
  async delete(ids: string[]): Promise<void> {
    if (!this.initialized) {
      await this.initialize();
    }

    if (ids.length === 0) {
      return;
    }

    if (this.useInMemory && this.inMemoryStore) {
      await this.inMemoryStore.delete(ids);
      return;
    }

    try {
      await this.getIndexClient().deleteMany(ids);
      this.logger.log(`Deleted ${ids.length} vectors`);
    } catch (error) {
      const err = error instanceof Error ? error : new Error(String(error));
      this.logger.error(`Delete failed: ${err.message}`, err.stack);
      throw new Error(`Pinecone delete failed: ${err.message}`);
    }
  }

  /**
   * Delete records by metadata filter
   */
  async deleteByFilter(filter: Record<string, any>): Promise<void> {
    if (!this.initialized) {
      await this.initialize();
    }

    if (this.useInMemory && this.inMemoryStore) {
      await this.inMemoryStore.deleteByFilter(filter);
      return;
    }

    try {
      const pineconeFilter = this.buildFilter(filter);
      await this.getIndexClient().deleteMany(pineconeFilter);
      this.logger.log(`Deleted vectors matching filter`);
    } catch (error) {
      const err = error instanceof Error ? error : new Error(String(error));
      this.logger.error(`Delete by filter failed: ${err.message}`, err.stack);
      throw new Error(`Pinecone delete by filter failed: ${err.message}`);
    }
  }

  /**
   * Get statistics about the index
   */
  async getStats(): Promise<IndexStats> {
    if (this.useInMemory && this.inMemoryStore) {
      return this.inMemoryStore.getStats();
    }

    if (!this.initialized && !this.index) {
      throw new Error('Pinecone not initialized');
    }

    try {
      const stats = await this.index.describeIndexStats();

      return {
        totalVectors: stats.totalRecordCount || 0,
        dimension: this.dimension,
        indexName: this.indexName,
        additionalInfo: {
          namespaces: stats.namespaces,
        },
      };
    } catch (error) {
      const err = error instanceof Error ? error : new Error(String(error));
      this.logger.error(`Failed to get stats: ${err.message}`, err.stack);
      throw new Error(`Failed to get index stats: ${err.message}`);
    }
  }

  /**
   * Check if the vector database is healthy and responsive
   */
  async healthCheck(): Promise<boolean> {
    if (this.useInMemory && this.inMemoryStore) {
      return this.inMemoryStore.healthCheck();
    }

    try {
      await this.getStats();
      return true;
    } catch (error) {
      const err = error instanceof Error ? error : new Error(String(error));
      this.logger.error(`Health check failed: ${err.message}`);
      return false;
    }
  }

  /**
   * Build Pinecone filter from generic filter object
   */
  private buildFilter(filter: Record<string, any>): Record<string, any> {
    // Pinecone uses a specific filter format
    // Convert our generic filter to Pinecone format
    const pineconeFilter: Record<string, any> = {};

    for (const [key, value] of Object.entries(filter)) {
      if (Array.isArray(value)) {
        // Array means OR condition
        pineconeFilter[key] = { $in: value };
      } else if (typeof value === 'object' && value !== null) {
        // Nested object - pass through
        pineconeFilter[key] = value;
      } else {
        // Direct equality
        pineconeFilter[key] = { $eq: value };
      }
    }

    return pineconeFilter;
  }

  private getIndexClient(): Index<RecordMetadata> {
    if (!this.namespace) {
      return this.index;
    }

    const namespacedIndex = (this.index as any).namespace?.(this.namespace);
    return namespacedIndex || this.index;
  }

  /**
   * Flatten metadata for Pinecone storage
   * Pinecone requires flat metadata structure
   */
  private flattenMetadata(metadata: ChunkMetadata): Record<string, any> {
    const flattened: Record<string, any> = {
      sourceId: metadata.sourceId,
      title: metadata.title,
      type: metadata.type,
    };

    if (metadata.organization) flattened.organization = metadata.organization;
    if (metadata.date) flattened.date = metadata.date;
    if (metadata.lastUpdated) flattened.lastUpdated = metadata.lastUpdated;
    if (metadata.timestamp) flattened.timestamp = metadata.timestamp;
    if (metadata.url) flattened.url = metadata.url;
    if (metadata.chunkIndex !== undefined) flattened.chunkIndex = metadata.chunkIndex;
    if (metadata.totalChunks !== undefined) flattened.totalChunks = metadata.totalChunks;
    if (metadata.specialty) flattened.specialty = metadata.specialty;
    if (metadata.tags) flattened.tags = metadata.tags;
    if (metadata.metadata) flattened.metadata = JSON.stringify(metadata.metadata);

    return flattened;
  }

  /**
   * Map Pinecone match to VectorMatch
   */
  private mapToVectorMatch(match: any, includeVector: boolean): VectorMatch {
    const metadata = match.metadata || {};
    const text = metadata.text || '';

    // Remove text from metadata (it's stored separately)
    const { text: _, ...metadataWithoutText } = metadata;

    const metadataRecord = {
      ...metadataWithoutText,
      metadata:
        typeof metadataWithoutText.metadata === 'string'
          ? this.safeJsonParse(metadataWithoutText.metadata)
          : metadataWithoutText.metadata,
    };

    return {
      id: match.id,
      score: match.score,
      text,
      metadata: metadataRecord as ChunkMetadata,
      vector: includeVector ? match.values : undefined,
    };
  }

  private safeJsonParse(value: string): Record<string, any> | undefined {
    try {
      return JSON.parse(value);
    } catch {
      return undefined;
    }
  }
}
