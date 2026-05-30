import { DataSource, DataSourceOptions } from 'typeorm';
import { config } from 'dotenv';
import { join } from 'path';
import { buildPostgresOptions } from './config/database-url.config';

// Load environment variables
config();

const DB_CLIENT = (process.env.DATABASE_CLIENT || '').toLowerCase();

const dataSourceOptions = (
  DB_CLIENT === 'sqlite'
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
        })
) as unknown as DataSourceOptions;

export const AppDataSource = new DataSource(dataSourceOptions);
