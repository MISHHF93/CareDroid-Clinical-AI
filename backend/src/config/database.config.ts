import { TypeOrmModuleOptions } from '@nestjs/typeorm';
import { buildPostgresOptions } from './database-url.config';
import { getEnvironmentConfig } from './environment.config';

// Support SQLite for local development when Docker/Postgres isn't available
const runtimeConfig = getEnvironmentConfig();
const DB_CLIENT = runtimeConfig.database.sql.client;

let config: TypeOrmModuleOptions;

if (DB_CLIENT === 'sqlite') {
  config = {
    type: 'sqlite',
    database: runtimeConfig.database.sql.sqlitePath,
    entities: [__dirname + '/../**/*.entity{.ts,.js}'],
    synchronize: true,
    logging: false,
  } as TypeOrmModuleOptions;
} else {
  config = {
    ...buildPostgresOptions({
      entities: [__dirname + '/../**/*.entity{.ts,.js}'],
      synchronize: runtimeConfig.server.nodeEnv === 'development',
      migrations: [__dirname + '/../database/migrations/*{.ts,.js}'],
    }),
    migrationsRun: true,
  } as TypeOrmModuleOptions;
}

export const databaseConfig: TypeOrmModuleOptions = config;
