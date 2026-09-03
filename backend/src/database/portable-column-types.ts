import type { QueryRunner } from 'typeorm';

/**
 * Migration-side counterparts of BINARY_COLUMN_TYPE (config/database-client.config.ts).
 *
 * `new Table({ columns: [{ type: '...' }] })` hands the string straight to the
 * CREATE TABLE statement; nothing normalises it per driver. The hand-written
 * chain now in ../migrations-superseded/ was written with SQLite spellings
 * (`datetime`, `blob`, `double`) and could not run on Postgres at all until
 * it was rewritten to call these helpers (see that folder's README for why it
 * was then retired). The active chain in ../migrations/ is generated from the
 * entities and targets Postgres, so it does not need them; they stay for the
 * superseded files and for any future migration that must run on both
 * drivers. `npm run db:verify` runs the active chain on a real Postgres.
 *
 * Both helpers key off the live connection rather than an env var so a
 * migration means the same thing under `migration:run` and under the app's
 * `migrationsRun: true`.
 */
export function isPostgres(queryRunner: QueryRunner): boolean {
  return queryRunner.connection.options.type === 'postgres';
}

/** Date/time column: SQLite `datetime`, Postgres `timestamp` (without time zone, like TypeORM's own `Date` mapping). */
export function dateTimeColumnType(queryRunner: QueryRunner): 'datetime' | 'timestamp' {
  return isPostgres(queryRunner) ? 'timestamp' : 'datetime';
}

/** Binary column for encrypted fields: SQLite `blob`, Postgres `bytea`. */
export function binaryColumnType(queryRunner: QueryRunner): 'blob' | 'bytea' {
  return isPostgres(queryRunner) ? 'bytea' : 'blob';
}
