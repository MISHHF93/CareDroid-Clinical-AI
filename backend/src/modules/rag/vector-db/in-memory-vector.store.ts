import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'fs';
import { dirname } from 'path';
import {
  IndexStats,
  QueryResult,
  VectorMatch,
  VectorQueryOptions,
  VectorRecord,
} from './vector-db.interface';
import { ChunkMetadata } from '../dto/rag-context.dto';

interface PersistedRecord {
  id: string;
  vector: number[];
  text: string;
  metadata: ChunkMetadata;
}

/**
 * Local cosine-similarity vector store for dev when Pinecone is not configured.
 * Persists to disk so ingested corpora survive backend restarts.
 */
export class InMemoryVectorStore {
  private records = new Map<string, PersistedRecord>();

  constructor(
    private readonly dimension: number,
    private readonly indexName: string,
    private readonly persistPath: string,
  ) {}

  async loadFromDisk(): Promise<void> {
    if (!existsSync(this.persistPath)) return;
    try {
      const raw = JSON.parse(readFileSync(this.persistPath, 'utf8')) as PersistedRecord[];
      for (const record of raw) {
        if (Array.isArray(record.vector) && record.vector.length === this.dimension) {
          this.records.set(record.id, record);
        }
      }
    } catch {
      this.records.clear();
    }
  }

  isUsingInMemory(): boolean {
    return true;
  }

  getIndexLabel(): string {
    return this.indexName;
  }

  async query(queryVector: number[], options: VectorQueryOptions): Promise<QueryResult> {
    const start = Date.now();
    const minScore = options.minScore ?? 0;
    const candidates = [...this.records.values()]
      .filter((record) => this.matchesFilter(record.metadata, options.filter))
      .map((record) => ({
        id: record.id,
        score: cosineSimilarity(queryVector, record.vector),
        text: record.text,
        metadata: record.metadata,
        vector: options.includeVectors ? record.vector : undefined,
      }))
      .filter((match) => match.score >= minScore)
      .sort((a, b) => b.score - a.score)
      .slice(0, options.topK);

    return {
      matches: candidates as VectorMatch[],
      latencyMs: Date.now() - start,
      total: candidates.length,
    };
  }

  async upsertBatch(records: VectorRecord[]): Promise<void> {
    for (const record of records) {
      if (record.vector.length !== this.dimension) {
        throw new Error(
          `Vector dimension mismatch: expected ${this.dimension}, got ${record.vector.length}`,
        );
      }
      this.records.set(record.id, {
        id: record.id,
        vector: record.vector,
        text: record.text,
        metadata: record.metadata,
      });
    }
    await this.persistToDisk();
  }

  async delete(ids: string[]): Promise<void> {
    for (const id of ids) this.records.delete(id);
    await this.persistToDisk();
  }

  async deleteByFilter(filter: Record<string, unknown>): Promise<void> {
    for (const [id, record] of this.records.entries()) {
      if (this.matchesFilter(record.metadata, filter)) {
        this.records.delete(id);
      }
    }
    await this.persistToDisk();
  }

  async getStats(): Promise<IndexStats> {
    return {
      totalVectors: this.records.size,
      dimension: this.dimension,
      indexName: this.indexName,
      additionalInfo: { backend: 'in-memory-local', persistPath: this.persistPath },
    };
  }

  async healthCheck(): Promise<boolean> {
    return true;
  }

  private async persistToDisk(): Promise<void> {
    mkdirSync(dirname(this.persistPath), { recursive: true });
    writeFileSync(this.persistPath, JSON.stringify([...this.records.values()]));
  }

  private matchesFilter(
    metadata: ChunkMetadata,
    filter?: Record<string, unknown>,
  ): boolean {
    if (!filter || Object.keys(filter).length === 0) return true;

    for (const [key, value] of Object.entries(filter)) {
      const actual = (metadata as unknown as Record<string, unknown>)[key];
      if (Array.isArray(value)) {
        if (!value.includes(actual)) return false;
      } else if (actual !== value) {
        return false;
      }
    }
    return true;
  }
}

function cosineSimilarity(a: number[], b: number[]): number {
  let dot = 0;
  let normA = 0;
  let normB = 0;
  const len = Math.min(a.length, b.length);
  for (let i = 0; i < len; i++) {
    dot += a[i] * b[i];
    normA += a[i] * a[i];
    normB += b[i] * b[i];
  }
  const denom = Math.sqrt(normA) * Math.sqrt(normB);
  if (!denom) return 0;
  return Math.max(0, Math.min(1, dot / denom));
}