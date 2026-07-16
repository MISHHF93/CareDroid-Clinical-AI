import { Logger } from '@nestjs/common';
import {
  IndexStats,
  IVectorDatabase,
  QueryResult,
  VectorMatch,
  VectorQueryOptions,
  VectorRecord,
} from './vector-db.interface';
import { ChunkMetadata } from '../dto/rag-context.dto';

/**
 * Minimal SQL executor so PgVectorStore can be unit-tested without a live Postgres.
 * Production wires this to TypeORM DataSource.query.
 */
export type PgVectorQueryFn = (sql: string, params?: unknown[]) => Promise<unknown>;

export interface PgVectorStoreOptions {
  /** Embedding dimension — validated on every write/query. */
  dimension: number;
  /** Table name (default caredroid_rag_vectors). */
  tableName?: string;
  /** Index / logical name for stats. */
  indexName?: string;
  /** SQL executor (TypeORM DataSource.query or test double). */
  query: PgVectorQueryFn;
  /** Skip CREATE EXTENSION / CREATE TABLE (tests). */
  skipSchemaBootstrap?: boolean;
  logger?: Logger;
}

interface PgVectorRow {
  id: string;
  text: string;
  metadata: ChunkMetadata | string;
  score?: number | string;
  embedding?: string | number[];
}

/**
 * Postgres + pgvector implementation of IVectorDatabase.
 *
 * Requires:
 * - Postgres 14+
 * - `CREATE EXTENSION vector` (attempted on initialize)
 * - Matching embedding dimension (default 768 for local Xenova models)
 *
 * Selected via RAG_VECTOR_BACKEND=pgvector (see PineconeService / rag.config).
 */
export class PgVectorStore implements IVectorDatabase {
  private readonly logger: Logger;
  private readonly dimension: number;
  private readonly tableName: string;
  private readonly indexName: string;
  private readonly queryFn: PgVectorQueryFn;
  private readonly skipSchemaBootstrap: boolean;
  private initialized = false;

  constructor(options: PgVectorStoreOptions) {
    this.dimension = options.dimension;
    this.tableName = sanitizeIdent(options.tableName || 'caredroid_rag_vectors');
    this.indexName = options.indexName || 'pgvector';
    this.queryFn = options.query;
    this.skipSchemaBootstrap = options.skipSchemaBootstrap === true;
    this.logger = options.logger || new Logger(PgVectorStore.name);
  }

  async initialize(): Promise<void> {
    if (this.initialized) return;

    if (!this.skipSchemaBootstrap) {
      await this.queryFn('CREATE EXTENSION IF NOT EXISTS vector');
      await this.queryFn(`
        CREATE TABLE IF NOT EXISTS ${this.tableName} (
          id TEXT PRIMARY KEY,
          embedding vector(${this.dimension}) NOT NULL,
          text TEXT NOT NULL,
          metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
          organization_id TEXT,
          source_id TEXT,
          created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
          updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
        )
      `);
      await this.queryFn(`
        CREATE INDEX IF NOT EXISTS ${this.tableName}_org_idx
        ON ${this.tableName} (organization_id)
      `);
      await this.queryFn(`
        CREATE INDEX IF NOT EXISTS ${this.tableName}_source_idx
        ON ${this.tableName} (source_id)
      `);
      // IVFFlat optional — only useful with enough rows; skip if creation fails
      try {
        await this.queryFn(`
          CREATE INDEX IF NOT EXISTS ${this.tableName}_embedding_idx
          ON ${this.tableName}
          USING ivfflat (embedding vector_cosine_ops)
          WITH (lists = 100)
        `);
      } catch (error) {
        this.logger.warn(
          `pgvector ivfflat index skipped (table may be empty): ${
            error instanceof Error ? error.message : String(error)
          }`,
        );
      }
    }

    this.initialized = true;
    this.logger.log(
      `PgVectorStore ready (table=${this.tableName}, dimension=${this.dimension})`,
    );
  }

  async query(queryVector: number[], options: VectorQueryOptions): Promise<QueryResult> {
    await this.ensureReady();
    this.assertDimension(queryVector, 'query');

    const start = Date.now();
    const topK = Math.max(1, options.topK || 5);
    const minScore = options.minScore ?? 0;
    const vectorLiteral = toVectorLiteral(queryVector);
    const { clause, params } = buildMetadataFilter(options.filter, 2);
    // cosine distance <=>  → similarity = 1 - distance
    const sql = `
      SELECT
        id,
        text,
        metadata,
        1 - (embedding <=> $1::vector) AS score
      FROM ${this.tableName}
      ${clause}
      ORDER BY embedding <=> $1::vector
      LIMIT ${topK}
    `;

    const rows = (await this.queryFn(sql, [vectorLiteral, ...params])) as PgVectorRow[];
    const matches: VectorMatch[] = (rows || [])
      .map((row) => ({
        id: row.id,
        score: Number(row.score) || 0,
        text: row.text,
        metadata: parseMetadata(row.metadata),
      }))
      .filter((match) => match.score >= minScore);

    return {
      matches,
      latencyMs: Date.now() - start,
      total: matches.length,
    };
  }

  async upsert(record: VectorRecord): Promise<void> {
    await this.upsertBatch([record]);
  }

  async upsertBatch(records: VectorRecord[]): Promise<void> {
    await this.ensureReady();
    if (!records.length) return;

    for (const record of records) {
      this.assertDimension(record.vector, `upsert:${record.id}`);
      const orgId = readMetaString(record.metadata, 'organizationId');
      const sourceId = readMetaString(record.metadata, 'sourceId');
      await this.queryFn(
        `
        INSERT INTO ${this.tableName} (id, embedding, text, metadata, organization_id, source_id, updated_at)
        VALUES ($1, $2::vector, $3, $4::jsonb, $5, $6, NOW())
        ON CONFLICT (id) DO UPDATE SET
          embedding = EXCLUDED.embedding,
          text = EXCLUDED.text,
          metadata = EXCLUDED.metadata,
          organization_id = EXCLUDED.organization_id,
          source_id = EXCLUDED.source_id,
          updated_at = NOW()
        `,
        [
          record.id,
          toVectorLiteral(record.vector),
          record.text,
          JSON.stringify(record.metadata || {}),
          orgId,
          sourceId,
        ],
      );
    }
  }

  async delete(ids: string[]): Promise<void> {
    await this.ensureReady();
    if (!ids.length) return;
    await this.queryFn(`DELETE FROM ${this.tableName} WHERE id = ANY($1::text[])`, [ids]);
  }

  async deleteByFilter(filter: Record<string, unknown>): Promise<void> {
    await this.ensureReady();
    const { clause, params } = buildMetadataFilter(filter, 1);
    if (!clause) {
      throw new Error('deleteByFilter requires a non-empty filter (refusing full-table wipe)');
    }
    await this.queryFn(`DELETE FROM ${this.tableName} ${clause}`, params);
  }

  async getStats(): Promise<IndexStats> {
    await this.ensureReady();
    const rows = (await this.queryFn(
      `SELECT COUNT(*)::int AS total FROM ${this.tableName}`,
    )) as Array<{ total: number }>;
    return {
      totalVectors: Number(rows?.[0]?.total || 0),
      dimension: this.dimension,
      indexName: this.indexName,
      additionalInfo: {
        backend: 'pgvector',
        table: this.tableName,
      },
    };
  }

  async healthCheck(): Promise<boolean> {
    try {
      await this.ensureReady();
      await this.queryFn('SELECT 1');
      return true;
    } catch {
      return false;
    }
  }

  private async ensureReady(): Promise<void> {
    if (!this.initialized) await this.initialize();
  }

  private assertDimension(vector: number[], context: string): void {
    if (!Array.isArray(vector) || vector.length !== this.dimension) {
      throw new Error(
        `Vector dimension mismatch (${context}): expected ${this.dimension}, got ${
          Array.isArray(vector) ? vector.length : 'non-array'
        }`,
      );
    }
  }
}

function sanitizeIdent(name: string): string {
  if (!/^[a-zA-Z_][a-zA-Z0-9_]*$/.test(name)) {
    throw new Error(`Invalid SQL identifier: ${name}`);
  }
  return name;
}

function toVectorLiteral(vector: number[]): string {
  return `[${vector.map((n) => Number(n) || 0).join(',')}]`;
}

function parseMetadata(raw: ChunkMetadata | string): ChunkMetadata {
  if (raw && typeof raw === 'object') return raw as ChunkMetadata;
  if (typeof raw === 'string') {
    try {
      return JSON.parse(raw) as ChunkMetadata;
    } catch {
      return {} as ChunkMetadata;
    }
  }
  return {} as ChunkMetadata;
}

function readMetaString(metadata: ChunkMetadata, key: string): string | null {
  const value = (metadata as unknown as Record<string, unknown>)?.[key];
  if (typeof value === 'string' && value.trim()) return value.trim();
  return null;
}

/**
 * Build a WHERE clause for common metadata filters.
 * organizationId array → IN (...); scalar equality on metadata fields.
 * Params start at `$startIndex` (1-based for Postgres).
 */
export function buildMetadataFilter(
  filter: Record<string, unknown> | undefined,
  startIndex: number,
): { clause: string; params: unknown[] } {
  if (!filter || !Object.keys(filter).length) {
    return { clause: '', params: [] };
  }

  const parts: string[] = [];
  const params: unknown[] = [];
  let idx = startIndex;

  for (const [key, value] of Object.entries(filter)) {
    if (key === 'organizationId' || key === 'organization_id') {
      if (Array.isArray(value)) {
        parts.push(`organization_id = ANY($${idx}::text[])`);
        params.push(value.map(String));
        idx += 1;
      } else if (value != null && value !== '') {
        parts.push(`organization_id = $${idx}`);
        params.push(String(value));
        idx += 1;
      }
      continue;
    }
    if (key === 'sourceId' || key === 'source_id') {
      if (Array.isArray(value)) {
        parts.push(`source_id = ANY($${idx}::text[])`);
        params.push(value.map(String));
        idx += 1;
      } else if (value != null && value !== '') {
        parts.push(`source_id = $${idx}`);
        params.push(String(value));
        idx += 1;
      }
      continue;
    }
    // Generic JSONB metadata path — key must be a safe identifier (not user-controlled SQL).
    if (!/^[a-zA-Z_][a-zA-Z0-9_]*$/.test(key)) {
      continue;
    }
    if (Array.isArray(value)) {
      parts.push(`metadata->>'${key}' = ANY($${idx}::text[])`);
      params.push(value.map(String));
      idx += 1;
    } else if (value != null) {
      parts.push(`metadata->>'${key}' = $${idx}`);
      params.push(String(value));
      idx += 1;
    }
  }

  if (!parts.length) return { clause: '', params: [] };
  return { clause: `WHERE ${parts.join(' AND ')}`, params };
}
