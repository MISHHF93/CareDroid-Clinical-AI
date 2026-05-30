import { ChunkMetadata } from '../dto/rag-context.dto';

/**
 * Vector Database Interface
 *
 * Abstract interface for vector database implementations.
 * Allows switching between Pinecone, Weaviate, or other vector stores.
 */

export interface VectorRecord {
  /**
   * Unique identifier for the vector
   */
  id: string;

  /**
   * Embedding vector
   */
  vector: number[];

  /**
   * Text content
   */
  text: string;

  /**
   * Metadata for filtering and retrieval
   */
  metadata: ChunkMetadata;
}

export interface QueryResult {
  /**
   * Matching records
   */
  matches: VectorMatch[];

  /**
   * Query latency in milliseconds
   */
  latencyMs: number;

  /**
   * Total results found (before limit)
   */
  total?: number;
}

export interface VectorMatch {
  /**
   * Record ID
   */
  id: string;

  /**
   * Similarity score (0-1)
   */
  score: number;

  /**
   * Text content
   */
  text: string;

  /**
   * Metadata
   */
  metadata: ChunkMetadata;

  /**
   * Embedding vector (optional)
   */
  vector?: number[];
}

export interface VectorQueryOptions {
  /**
   * Number of results to return
   */
  topK: number;

  /**
   * Minimum similarity score
   */
  minScore?: number;

  /**
   * Metadata filters
   */
  filter?: Record<string, any>;

  /**
   * Include embedding vectors in response
   */
  includeVectors?: boolean;

  /**
   * Include metadata in response
   */
  includeMetadata?: boolean;
}

export interface IVectorDatabase {
  /**
   * Initialize connection to vector database
   */
  initialize(): Promise<void>;

  /**
   * Query the vector database with a query embedding
   */
  query(queryVector: number[], options: VectorQueryOptions): Promise<QueryResult>;

  /**
   * Insert a single vector record
   */
  upsert(record: VectorRecord): Promise<void>;

  /**
   * Insert multiple vector records in batch
   */
  upsertBatch(records: VectorRecord[]): Promise<void>;

  /**
   * Delete records by ID
   */
  delete(ids: string[]): Promise<void>;

  /**
   * Delete records by metadata filter
   */
  deleteByFilter(filter: Record<string, any>): Promise<void>;

  /**
   * Get statistics about the index
   */
  getStats(): Promise<IndexStats>;

  /**
   * Check if the vector database is healthy and responsive
   */
  healthCheck(): Promise<boolean>;
}

export interface IndexStats {
  /**
   * Total number of vectors in the index
   */
  totalVectors: number;

  /**
   * Dimension of vectors
   */
  dimension: number;

  /**
   * Index name
   */
  indexName: string;

  /**
   * Additional provider-specific stats
   */
  additionalInfo?: Record<string, any>;
}
