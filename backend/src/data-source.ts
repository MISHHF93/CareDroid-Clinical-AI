import { DataSource, DataSourceOptions } from 'typeorm';
import { config } from 'dotenv';
import { join } from 'path';
import { buildPostgresOptions } from './config/database-url.config';
import { resolveDatabaseClient } from './config/database-client.config';

// Load environment variables
config();

// Same resolver as app.module.ts. Until 2026-09-03 this file read
// DATABASE_CLIENT raw and defaulted to Postgres while the app defaulted to
// SQLite in development, so `migration:run` and `npm start` could silently
// target different databases from the same shell.
const DB_CLIENT = resolveDatabaseClient();

const dataSourceOptions = (DB_CLIENT === 'sqlite'
  ? {
      type: 'sqlite',
      database: process.env.SQLITE_PATH || 'caredroid.dev.sqlite',
      entities: [join(__dirname, '**', '*.entity.{ts,js}')],
      migrations: [join(__dirname, 'database', 'migrations', '*{.ts,.js}')],
      synchronize: false,
      logging: false,
    }
  : buildPostgresOptions({
      entities: [join(__dirname, '**', '*.entity.{ts,js}')],
      migrations: [join(__dirname, 'database', 'migrations', '*{.ts,.js}')],
      synchronize: false,
    })) as unknown as DataSourceOptions;

export const AppDataSource = new DataSource(dataSourceOptions);
