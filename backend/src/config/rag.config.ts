import { registerAs } from '@nestjs/config';

/**
 * RAG Configuration
 *
 * Configuration for the RAG (Retrieval-Augmented Generation) system.
 * Includes settings for vector database, embeddings, and chunking.
 */

const defaultEmbeddingModel =
  process.env.RAG_MODEL ||
  process.env.EMBEDDING_MODEL ||
  process.env.AI_EMBEDDING_MODEL ||
  'Xenova/all-mpnet-base-v2';

export default registerAs('rag', () => ({
  enabled: process.env.RAG_ENABLED !== 'false',
  autoBootstrapCorpus: process.env.RAG_AUTO_BOOTSTRAP_CORPUS !== 'false',
  /**
   * Pinecone Configuration (falls back to in-memory local store when API key is absent)
   */
  pinecone: {
    apiKey: process.env.PINECONE_API_KEY,
    indexName: process.env.PINECONE_INDEX_NAME || 'caredroid-medical-knowledge',
    dimension: parseInt(process.env.PINECONE_DIMENSION || process.env.EMBEDDING_DIMENSION || '768', 10),
    environment: process.env.PINECONE_ENVIRONMENT || 'us-east-1-aws',
    namespace: process.env.PINECONE_NAMESPACE || 'medical-docs',
  },

  /**
   * Embeddings Configuration
   */
  embeddings: {
    model: defaultEmbeddingModel,
    dimension: parseInt(process.env.EMBEDDING_DIMENSION || '768', 10),
    batchSize: parseInt(process.env.EMBEDDING_BATCH_SIZE || '100', 10),
  },

  /**
   * Chunking Configuration
   */
  chunking: {
    chunkSize: parseInt(process.env.CHUNK_SIZE || '512', 10),
    overlap: parseInt(process.env.CHUNK_OVERLAP || '50', 10),
    respectBoundaries: process.env.CHUNK_RESPECT_BOUNDARIES !== 'false',
  },

  /**
   * Retrieval Configuration
   */
  retrieval: {
    defaultTopK: parseInt(process.env.RAG_TOP_K || '5', 10),
    minScore: parseFloat(process.env.RAG_MIN_SCORE || '0.7'),
    maxTokens: parseInt(process.env.RAG_MAX_TOKENS || '2000', 10),
  },

  /**
   * Reranking Configuration (optional)
   */
  reranking: {
    enabled: process.env.RERANK_ENABLED === 'true',
    provider: process.env.RERANK_PROVIDER || 'local',
    model: process.env.RERANK_MODEL || 'local-keyword-reranker',
  },
}));
