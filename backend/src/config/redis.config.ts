import { registerAs } from '@nestjs/config';

function parseRedisUrl() {
  const raw = process.env.REDIS_URL;
  if (!raw) return {};

  try {
    const url = new URL(raw);
    return {
      host: url.hostname,
      port: url.port ? parseInt(url.port, 10) : undefined,
      password: url.password ? decodeURIComponent(url.password) : undefined,
      db: url.pathname.replace('/', '') ? parseInt(url.pathname.replace('/', ''), 10) : undefined,
    };
  } catch {
    return {};
  }
}

export default registerAs('redis', () => {
  const redisUrl = parseRedisUrl();

  return {
    host: process.env.REDIS_HOST || redisUrl.host || 'localhost',
    port: parseInt(process.env.REDIS_PORT || String(redisUrl.port || 6379), 10),
    password: process.env.REDIS_PASSWORD || redisUrl.password || undefined,
    db: parseInt(process.env.REDIS_DB || String(redisUrl.db || 0), 10),
    keyPrefix: 'caredroid:',
    retryStrategy: (times: number) => {
      const delay = Math.min(times * 50, 2000);
      return delay;
    },
  };
});
