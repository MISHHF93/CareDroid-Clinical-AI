import { config as loadDotenv } from 'dotenv';
import { getEnvironmentConfig } from './environment.config';

/**
 * Which SQL driver this process talks to. ONE resolver for the three places
 * that used to decide independently (app.module.ts had its own copy,
 * data-source.ts read DATABASE_CLIENT raw and defaulted the other way, and
 * entities could not ask at all) -- so `npm run migration:run` and the running
 * app could disagree about which database they meant.
 *
 * Entities read BINARY_COLUMN_TYPE at decoration time, which can happen before
 * Nest's ConfigModule has loaded backend/.env (a module that imports an entity
 * directly evaluates it before AppModule's decorator runs). dotenv.config() is
 * idempotent and never overrides a value already present in process.env, so a
 * production environment that sets DATABASE_CLIENT explicitly is unaffected;
 * data-source.ts has relied on the same call since it was written.
 */
loadDotenv();

export type DatabaseClient = 'sqlite' | 'postgres';

export function resolveDatabaseClient(env: NodeJS.ProcessEnv = process.env): DatabaseClient {
  const config = getEnvironmentConfig(env);
  const configured = config.database.sql.client;
  if (configured === 'sqlite' || configured === 'postgres') return configured;

  const hasExplicitPostgresConfig = [
    config.database.sql.url,
    config.database.sql.host !== 'localhost' ? config.database.sql.host : '',
    config.database.sql.username !== 'postgres' ? config.database.sql.username : '',
    config.database.sql.password !== 'postgres' ? config.database.sql.password : '',
    config.database.sql.databaseName !== 'caredroid' ? config.database.sql.databaseName : '',
  ].some(Boolean);

  return config.server.nodeEnv === 'development' && !hasExplicitPostgresConfig
    ? 'sqlite'
    : 'postgres';
}

/**
 * Column type for encrypted binary fields. TypeORM validates every entity
 * column against the driver's supported types when the DataSource initialises,
 * and neither driver normalises the other's spelling: SQLite knows `blob`,
 * Postgres knows `bytea`, and `type: Buffer` is not a TypeORM column type. A
 * single `type: 'blob'` therefore made the whole application refuse to boot
 * against Postgres (DataTypeNotSupportedError, found 2026-09-03 by running the
 * migrations on a real Postgres for the first time).
 *
 * Date/time columns do not need this: `type: Date` is portable -- the SQLite
 * driver maps it to `datetime`, the Postgres driver to `timestamp`.
 *
 * Migrations, which hand TypeORM raw type strings, use the QueryRunner-aware
 * helpers in ../database/portable-column-types.ts instead.
 */
export const BINARY_COLUMN_TYPE: 'blob' | 'bytea' =
  resolveDatabaseClient() === 'sqlite' ? 'blob' : 'bytea';
