const parseBoolean = (value: string | undefined) => String(value || '').toLowerCase() === 'true';

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
  const base = {
    type: 'postgres',
    entities,
    synchronize,
    logging: parseBoolean(process.env.DATABASE_LOGGING),
    ssl: parseBoolean(process.env.DATABASE_SSL) ? { rejectUnauthorized: false } : false,
    ...(migrations ? { migrations } : {}),
    extra: {
      max: parseInt(process.env.DATABASE_POOL_SIZE || '10', 10),
    },
  };

  if (process.env.DATABASE_URL) {
    return {
      ...base,
      url: process.env.DATABASE_URL,
    };
  }

  return {
    ...base,
    host: process.env.DATABASE_HOST || 'localhost',
    port: parseInt(process.env.DATABASE_PORT || '5432', 10),
    username: process.env.DATABASE_USER || 'postgres',
    password: process.env.DATABASE_PASSWORD || 'postgres',
    database: process.env.DATABASE_NAME || 'caredroid',
  };
}
