import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createClient, RedisClientType } from 'redis';

@Injectable()
export class CacheService implements OnModuleInit {
  private readonly logger = new Logger(CacheService.name);
  private client: RedisClientType;

  constructor(private readonly configService: ConfigService) {}

  async onModuleInit() {
    await this.connect();
  }

  private async connect() {
    try {
      // Check if Redis is explicitly disabled or not configured
      if (process.env.REDIS_HOST === undefined || process.env.REDIS_HOST === '') {
        this.logger.warn('Redis not configured (REDIS_HOST not set). Cache service disabled.');
        return;
      }

      const redisConfig = this.configService.get('redis');
      if (!redisConfig) {
        this.logger.warn('Redis configuration not found. Cache service disabled.');
        return;
      }

      this.client = createClient({
        socket: {
          host: redisConfig.host,
          port: redisConfig.port,
          reconnectStrategy: (retries: number) => {
            // Limit reconnection attempts
            if (retries > 3) {
              this.logger.warn('Redis reconnection failed after 3 attempts. Giving up.');
              return false; // Stop reconnecting
            }
            return Math.min(retries * 50, 2000);
          },
        },
        password: redisConfig.password,
        database: redisConfig.db,
      });

      this.client.on('error', (err) => {
        this.logger.error('Redis client error:', err);
      });

      this.client.on('connect', () => {
        this.logger.log(`✅ Redis cache connected to ${redisConfig.host}:${redisConfig.port}`);
      });

      await this.client.connect();
    } catch (error) {
      this.logger.error('Failed to initialize cache service:', error);
      this.logger.warn('Continuing without Redis cache...');
      this.client = null; // Ensure client is null so all cache operations return gracefully
    }
  }

  async get<T = any>(key: string): Promise<T | null> {
    if (!this.client) return null;
    try {
      const data = await this.client.get(key);
      if (!data) return null;
      try {
        return JSON.parse(data) as T;
      } catch {
        return data as T;
      }
    } catch (error) {
      this.logger.error(`Failed to get cache key ${key}:`, error);
      return null;
    }
  }

  async set(key: string, value: any, ttl?: number): Promise<boolean> {
    if (!this.client) return false;
    try {
      const serialized = typeof value === 'string' ? value : JSON.stringify(value);
      if (ttl) {
        await this.client.set(key, serialized, { EX: ttl });
      } else {
        await this.client.set(key, serialized);
      }
      return true;
    } catch (error) {
      this.logger.error(`Failed to set cache key ${key}:`, error);
      return false;
    }
  }

  async del(key: string): Promise<boolean> {
    if (!this.client) return false;
    try {
      await this.client.del(key);
      return true;
    } catch (error) {
      this.logger.error(`Failed to delete cache key ${key}:`, error);
      return false;
    }
  }

  async exists(key: string): Promise<boolean> {
    if (!this.client) return false;
    try {
      const result = await this.client.exists(key);
      return result === 1;
    } catch (error) {
      this.logger.error(`Failed to check cache key ${key}:`, error);
      return false;
    }
  }

  async getOrSet<T = any>(key: string, factory: () => Promise<T>, ttl?: number): Promise<T> {
    // Try to get from cache
    const cached = await this.get<T>(key);
    if (cached !== null) {
      return cached;
    }

    // Compute value and cache it
    const value = await factory();
    await this.set(key, value, ttl);
    return value;
  }

  async clear(): Promise<boolean> {
    if (!this.client) return false;
    try {
      await this.client.flushDb();
      this.logger.log('Cache cleared');
      return true;
    } catch (error) {
      this.logger.error('Failed to clear cache:', error);
      return false;
    }
  }

  async close(): Promise<void> {
    if (this.client) {
      await this.client.quit();
      this.logger.log('Redis connection closed');
    }
  }
}
