import { getEnvironmentConfig } from './environment.config';

interface PostgresOptionsInput {
  entities: string[];
  migrations?: string[];
  synchronize?: boolean;
}

export function buildPostgresOptions({
  entities,
  migrations,
  synchronize = false,
}: PostgresOptionsInput): Record<string, unknown> {
  const config = getEnvironmentConfig();
  const database = config.database.sql;
  const base = {
    type: 'postgres',
    entities,
    synchronize,
    logging: database.logging,
    ssl: database.ssl ? { rejectUnauthorized: false } : false,
    ...(migrations ? { migrations } : {}),
    extra: {
      max: database.poolSize,
    },
  };

  if (database.url) {
    return {
      ...base,
      url: database.url,
    };
  }

  return {
    ...base,
    host: database.host,
    port: database.port,
    username: database.username,
    password: database.password,
    database: database.databaseName,
  };
}
