/**
 * RAG Context DTO
 *
 * Represents the context retrieved from the RAG system for augmenting
 * AI responses with relevant medical knowledge.
 */

import { MedicalSource } from './medical-source.dto';

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
  type:
    | 'protocol'
    | 'guideline'
    | 'drug_info'
    | 'clinical_pathway'
    | 'reference'
    | 'textbook'
    | 'journal';

  /**
   * Organization that published the document
   */
  organization?: string;

  /**
   * Publication or last update date
   */
  date?: string;

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
}
