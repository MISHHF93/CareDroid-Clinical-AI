import { TypeOrmModuleOptions } from '@nestjs/typeorm';
import { buildPostgresOptions } from './database-url.config';

// Support SQLite for local development when Docker/Postgres isn't available
const DB_CLIENT = (process.env.DATABASE_CLIENT || '').toLowerCase();

let config: TypeOrmModuleOptions;

if (DB_CLIENT === 'sqlite') {
  config = {
    type: 'sqlite',
    database: process.env.SQLITE_PATH || 'caredroid.dev.sqlite',
    entities: [__dirname + '/../**/*.entity{.ts,.js}'],
    synchronize: true,
    logging: false,
  } as TypeOrmModuleOptions;
} else {
  config = {
    ...buildPostgresOptions({
      entities: [__dirname + '/../**/*.entity{.ts,.js}'],
      synchronize: process.env.NODE_ENV === 'development',
      migrations: [__dirname + '/../database/migrations/*{.ts,.js}'],
    }),
    migrationsRun: true,
  } as TypeOrmModuleOptions;
}

export const databaseConfig: TypeOrmModuleOptions = config;
