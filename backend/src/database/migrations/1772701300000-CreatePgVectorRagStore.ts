import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Optional pgvector-backed RAG store (Cycle 65 / D5).
 *
 * Safe on SQLite: extension/table create is skipped (pgvector is Postgres-only).
 *
 * Safe on Postgres without pgvector too: the store is optional (RAG_VECTOR_DB),
 * so an unavailable extension must not abort the mandatory migration chain
 * behind it -- which is exactly what `CREATE EXTENSION` did on a stock
 * postgres:15 image (the CI service and `npm run db:verify`) until 2026-09-03,
 * leaving every later migration unapplied. The migration records itself as
 * run; installing pgvector later means re-creating the table by hand or via
 * the store's own bootstrap, the same as the original comment asked of
 * operators.
 */
export class CreatePgVectorRagStore1772701300000 implements MigrationInterface {
  name = 'CreatePgVectorRagStore1772701300000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    const isPostgres = queryRunner.connection.options.type === 'postgres';
    if (!isPostgres) {
      return;
    }

    const available: Array<{ name: string }> = await queryRunner.query(
      `SELECT name FROM pg_available_extensions WHERE name = 'vector'`,
    );
    if (available.length === 0) {
      console.warn(
        '[migration] pgvector is not available on this Postgres; skipping the optional caredroid_rag_vectors store',
      );
      return;
    }

    await queryRunner.query(`CREATE EXTENSION IF NOT EXISTS vector`);

    const dimension = Number(
      process.env.EMBEDDING_DIMENSION || process.env.PINECONE_DIMENSION || 768,
    );
    const safeDim = Number.isFinite(dimension) && dimension > 0 ? Math.floor(dimension) : 768;

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS caredroid_rag_vectors (
        id TEXT PRIMARY KEY,
        embedding vector(${safeDim}) NOT NULL,
        text TEXT NOT NULL,
        metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
        organization_id TEXT,
        source_id TEXT,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS caredroid_rag_vectors_org_idx
      ON caredroid_rag_vectors (organization_id)
    `);
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS caredroid_rag_vectors_source_idx
      ON caredroid_rag_vectors (source_id)
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    const isPostgres = queryRunner.connection.options.type === 'postgres';
    if (!isPostgres) {
      return;
    }
    await queryRunner.query(`DROP TABLE IF EXISTS caredroid_rag_vectors`);
    // Do not DROP EXTENSION vector — other DBs/apps may depend on it.
  }
}
