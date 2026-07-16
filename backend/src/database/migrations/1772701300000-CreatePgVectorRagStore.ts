import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Optional pgvector-backed RAG store (Cycle 65 / D5).
 *
 * Safe on SQLite: extension/table create is skipped (pgvector is Postgres-only).
 * On Postgres without the extension available, CREATE EXTENSION may fail in
 * locked-down hosts — operators can install the extension separately and re-run.
 */
export class CreatePgVectorRagStore1772701300000 implements MigrationInterface {
  name = 'CreatePgVectorRagStore1772701300000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    const isPostgres = queryRunner.connection.options.type === 'postgres';
    if (!isPostgres) {
      return;
    }

    await queryRunner.query(`CREATE EXTENSION IF NOT EXISTS vector`);

    const dimension = Number(process.env.EMBEDDING_DIMENSION || process.env.PINECONE_DIMENSION || 768);
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
