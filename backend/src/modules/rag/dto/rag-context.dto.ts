/**
 * RAG Context DTO
 *
 * Represents the context retrieved from the RAG system for augmenting
 * AI responses with relevant medical knowledge.
 */

import { MedicalSource, MedicalSourceType } from './medical-source.dto';

export interface RAGContext {
  /**
   * Retrieved text chunks from the knowledge base
   */
  chunks: RetrievedChunk[];

  /**
   * Medical sources cited in the response
   */
  sources: MedicalSource[];

  /**
   * Overall confidence score for the retrieval (0-1)
   */
  confidence: number;

  /**
   * Query that was used for retrieval
   */
  query: string;

  /**
   * Timestamp of retrieval
   */
  timestamp: Date;

  /**
   * Total number of chunks retrieved before filtering
   */
  totalRetrieved: number;

  /**
   * Retrieval latency in milliseconds
   */
  latencyMs: number;

  /**
   * Bounded context string suitable for LLM prompts
   */
  contextText?: string;

  /**
   * Rich references for source panels and detailed audit trails
   */
  references?: RAGReference[];

  /**
   * Precomputed source panel payload for clients
   */
  sourcePanel?: RAGSourcePanel;
}

export interface RetrievedChunk {
  /**
   * Unique identifier for the chunk
   */
  id: string;

  /**
   * The actual text content
   */
  text: string;

  /**
   * Similarity score (0-1, higher is better)
   */
  score: number;

  /**
   * Metadata about the source document
   */
  metadata: ChunkMetadata;

  /**
   * Embedding vector (optional, for debugging)
   */
  embedding?: number[];
}

export interface ChunkMetadata {
  /**
   * Source document identifier
   */
  sourceId: string;

  /**
   * Document title
   */
  title: string;

  /**
   * Type of medical knowledge
   */
  type: MedicalSourceType;

  /**
   * Organization that published the document
   */
  organization?: string;

  /**
   * Publication or last update date
   */
  date?: string;

  /**
   * Last update timestamp/date for the source
   */
  lastUpdated?: string;

  /**
   * Event/artifact timestamp when applicable
   */
  timestamp?: string;

  /**
   * URL to the full document (if available)
   */
  url?: string;

  /**
   * Chunk position in the original document
   */
  chunkIndex?: number;

  /**
   * Total number of chunks in the source document
   */
  totalChunks?: number;

  /**
   * Medical specialty or category
   */
  specialty?: string;

  /**
   * Tags for filtering
   */
  tags?: string[];

  /**
   * Additional metadata for calculators, tools, docs, and workflow artifacts
   */
  metadata?: Record<string, any>;
}

export interface RAGReference {
  /**
   * Stable reference id used by the UI
   */
  id: string;

  /**
   * Source id shared by chunks from the same source
   */
  sourceId: string;

  /**
   * Human-readable citation label, e.g. [1]
   */
  citationLabel: string;

  title: string;
  type: MedicalSourceType;
  organization?: string;
  authors?: string[];
  date?: string;
  lastUpdated?: string;
  timestamp?: string;
  url?: string;
  doi?: string;
  specialty?: string;
  evidenceLevel?: MedicalSource['evidenceLevel'];
  authoritative?: boolean;
  tags?: string[];
  metadata?: Record<string, any>;

  /**
   * Highest relevance score among chunks from this source
   */
  relevance: number;

  /**
   * Alias retained for callers that display score terminology
   */
  topScore: number;

  chunkCount: number;
  chunkIds: string[];
  excerpts: string[];
}

export interface RAGSourcePanel {
  citations: MedicalSource[];
  references: RAGReference[];
  confidence: number;
  generatedAt: string;
  timestamps: {
    generatedAt: string;
    retrievedAt: string;
    latestSourceTimestamp?: string;
  };
  cache: {
    retrievalCacheHit: boolean;
  };
  retrieval: {
    query: string;
    chunksRetrieved: number;
    sourcesFound: number;
    totalRetrieved: number;
    latencyMs: number;
  };
}

export interface RAGRetrievalOptions {
  /**
   * Number of chunks to retrieve
   */
  topK?: number;

  /**
   * Minimum similarity score threshold (0-1)
   */
  minScore?: number;

  /**
   * Filter by document type
   */
  documentType?: ChunkMetadata['type'];

  /**
   * Filter by multiple document/source types
   */
  documentTypes?: ChunkMetadata['type'][];

  /**
   * Filter by specialty
   */
  specialty?: string;

  /**
   * Include embedding vectors in response
   */
  includeEmbeddings?: boolean;

  /**
   * Whether to re-rank results (requires reranking service)
   */
  rerank?: boolean;

  /**
   * Maximum context text budget for LLM prompt construction
   */
  maxTokens?: number;
}
