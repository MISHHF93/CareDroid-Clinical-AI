import { ConfigService } from '@nestjs/config';
import { createClient } from 'redis';
import { CacheService } from './cache.service';

jest.mock('redis', () => ({
  createClient: jest.fn(),
}));

const mockedCreateClient = createClient as unknown as jest.Mock;

function makeFakeRedisClient() {
  const handlers: Record<string, (...args: any[]) => void> = {};
  return {
    on: jest.fn((event: string, handler: (...args: any[]) => void) => {
      handlers[event] = handler;
    }),
    connect: jest.fn().mockResolvedValue(undefined),
    get: jest.fn(),
    set: jest.fn(),
    del: jest.fn(),
    exists: jest.fn(),
    flushDb: jest.fn(),
    quit: jest.fn().mockResolvedValue(undefined),
    __emit: (event: string, ...args: any[]) => handlers[event]?.(...args),
  };
}

function makeConfigService(redisConfig: Record<string, unknown> | undefined) {
  return { get: jest.fn(() => redisConfig) } as unknown as ConfigService;
}

describe('CacheService', () => {
  const originalEnv = { ...process.env };

  afterEach(() => {
    process.env = { ...originalEnv };
    jest.clearAllMocks();
  });

  describe('connect() (via onModuleInit)', () => {
    it('stays disabled without creating a client when REDIS_ENABLED=false', async () => {
      process.env.REDIS_ENABLED = 'false';
      process.env.REDIS_HOST = 'redis-host';
      const service = new CacheService(makeConfigService({ host: 'redis-host', port: 6379 }));

      await service.onModuleInit();

      expect(mockedCreateClient).not.toHaveBeenCalled();
      expect(await service.get('k')).toBeNull();
    });

    it('stays disabled without creating a client when REDIS_HOST is unset', async () => {
      delete process.env.REDIS_ENABLED;
      delete process.env.REDIS_HOST;
      const service = new CacheService(makeConfigService({ host: 'redis-host', port: 6379 }));

      await service.onModuleInit();

      expect(mockedCreateClient).not.toHaveBeenCalled();
    });

    it('stays disabled without creating a client when the redis config namespace is missing', async () => {
      process.env.REDIS_HOST = 'redis-host';
      delete process.env.REDIS_ENABLED;
      const service = new CacheService(makeConfigService(undefined));

      await service.onModuleInit();

      expect(mockedCreateClient).not.toHaveBeenCalled();
    });

    it('creates and connects a real client with the configured host/port/password/db when enabled', async () => {
      process.env.REDIS_HOST = 'redis-host';
      delete process.env.REDIS_ENABLED;
      const fakeClient = makeFakeRedisClient();
      mockedCreateClient.mockReturnValue(fakeClient);
      const service = new CacheService(
        makeConfigService({ host: 'redis-host', port: 6380, password: 'secret', db: 2 }),
      );

      await service.onModuleInit();

      expect(mockedCreateClient).toHaveBeenCalledWith(
        expect.objectContaining({
          socket: expect.objectContaining({ host: 'redis-host', port: 6380 }),
          password: 'secret',
          database: 2,
        }),
      );
      expect(fakeClient.connect).toHaveBeenCalled();
      expect(await service.set('k', 'v')).toBe(true);
      expect(fakeClient.set).toHaveBeenCalledWith('k', 'v');
    });

    it('falls back to a disabled (null-client) state if connecting throws, without crashing the app', async () => {
      process.env.REDIS_HOST = 'redis-host';
      delete process.env.REDIS_ENABLED;
      const fakeClient = makeFakeRedisClient();
      fakeClient.connect.mockRejectedValue(new Error('ECONNREFUSED'));
      mockedCreateClient.mockReturnValue(fakeClient);
      const service = new CacheService(makeConfigService({ host: 'redis-host', port: 6379 }));

      await expect(service.onModuleInit()).resolves.toBeUndefined();

      expect(await service.get('k')).toBeNull();
    });

    it('an error event on the client is logged, not thrown, and does not disable the cache', async () => {
      process.env.REDIS_HOST = 'redis-host';
      delete process.env.REDIS_ENABLED;
      const fakeClient = makeFakeRedisClient();
      mockedCreateClient.mockReturnValue(fakeClient);
      const service = new CacheService(makeConfigService({ host: 'redis-host', port: 6379 }));
      await service.onModuleInit();

      expect(() => fakeClient.__emit('error', new Error('connection reset'))).not.toThrow();
      // The client reference itself is untouched by a transient error event.
      fakeClient.get.mockResolvedValue('"still-working"');
      expect(await service.get('k')).toBe('still-working');
    });

    it('reconnectStrategy backs off linearly and gives up after 3 retries', async () => {
      process.env.REDIS_HOST = 'redis-host';
      delete process.env.REDIS_ENABLED;
      mockedCreateClient.mockReturnValue(makeFakeRedisClient());
      const service = new CacheService(makeConfigService({ host: 'redis-host', port: 6379 }));
      await service.onModuleInit();

      const { reconnectStrategy } = mockedCreateClient.mock.calls[0][0].socket;
      expect(reconnectStrategy(1)).toBe(50);
      expect(reconnectStrategy(3)).toBe(150);
      expect(reconnectStrategy(4)).toBe(false);
      expect(reconnectStrategy(50)).toBe(false);
    });
  });

  describe('cache operations against a connected client', () => {
    let service: CacheService;
    let client: ReturnType<typeof makeFakeRedisClient>;

    beforeEach(() => {
      service = new CacheService(makeConfigService({}));
      client = makeFakeRedisClient();
      (service as any).client = client;
    });

    describe('get', () => {
      it('parses a JSON-serialized value back into an object', async () => {
        client.get.mockResolvedValue(JSON.stringify({ a: 1 }));
        expect(await service.get('k')).toEqual({ a: 1 });
      });

      it('falls back to the raw string when the stored value is not valid JSON', async () => {
        client.get.mockResolvedValue('plain-string-value');
        expect(await service.get('k')).toBe('plain-string-value');
      });

      it('returns null on a cache miss', async () => {
        client.get.mockResolvedValue(null);
        expect(await service.get('missing')).toBeNull();
      });

      it('returns null (not a throw) when the client errors', async () => {
        client.get.mockRejectedValue(new Error('redis down'));
        await expect(service.get('k')).resolves.toBeNull();
      });
    });

    describe('set', () => {
      it('JSON-serializes non-string values', async () => {
        await service.set('k', { a: 1 });
        expect(client.set).toHaveBeenCalledWith('k', JSON.stringify({ a: 1 }));
      });

      it('stores string values as-is rather than double-encoding them', async () => {
        await service.set('k', 'already-a-string');
        expect(client.set).toHaveBeenCalledWith('k', 'already-a-string');
      });

      it('applies an EX ttl when one is given', async () => {
        await service.set('k', 'v', 60);
        expect(client.set).toHaveBeenCalledWith('k', 'v', { EX: 60 });
      });

      it('returns false (not a throw) when the client errors', async () => {
        client.set.mockRejectedValue(new Error('redis down'));
        await expect(service.set('k', 'v')).resolves.toBe(false);
      });
    });

    describe('del', () => {
      it('deletes the key and reports success', async () => {
        await expect(service.del('k')).resolves.toBe(true);
        expect(client.del).toHaveBeenCalledWith('k');
      });

      it('returns false (not a throw) when the client errors', async () => {
        client.del.mockRejectedValue(new Error('redis down'));
        await expect(service.del('k')).resolves.toBe(false);
      });
    });

    describe('exists', () => {
      it('returns true when Redis reports the key exists (1)', async () => {
        client.exists.mockResolvedValue(1);
        expect(await service.exists('k')).toBe(true);
      });

      it('returns false when Redis reports the key is absent (0)', async () => {
        client.exists.mockResolvedValue(0);
        expect(await service.exists('k')).toBe(false);
      });

      it('returns false (not a throw) when the client errors', async () => {
        client.exists.mockRejectedValue(new Error('redis down'));
        await expect(service.exists('k')).resolves.toBe(false);
      });
    });

    describe('getOrSet', () => {
      it('returns the cached value without invoking the factory on a hit', async () => {
        client.get.mockResolvedValue(JSON.stringify('cached-value'));
        const factory = jest.fn();

        const result = await service.getOrSet('k', factory);

        expect(result).toBe('cached-value');
        expect(factory).not.toHaveBeenCalled();
      });

      it('computes and caches the value via the factory on a miss', async () => {
        client.get.mockResolvedValue(null);
        const factory = jest.fn().mockResolvedValue({ computed: true });

        const result = await service.getOrSet('k', factory, 30);

        expect(result).toEqual({ computed: true });
        expect(factory).toHaveBeenCalledTimes(1);
        expect(client.set).toHaveBeenCalledWith('k', JSON.stringify({ computed: true }), {
          EX: 30,
        });
      });

      it('treats a cached falsy-but-not-null value (0) as a real hit, not a miss', async () => {
        client.get.mockResolvedValue(JSON.stringify(0));
        const factory = jest.fn();

        const result = await service.getOrSet('k', factory);

        expect(result).toBe(0);
        expect(factory).not.toHaveBeenCalled();
      });
    });

    describe('clear', () => {
      it('flushes the database', async () => {
        await expect(service.clear()).resolves.toBe(true);
        expect(client.flushDb).toHaveBeenCalled();
      });

      it('returns false (not a throw) when the client errors', async () => {
        client.flushDb.mockRejectedValue(new Error('redis down'));
        await expect(service.clear()).resolves.toBe(false);
      });
    });

    describe('close', () => {
      it('quits the client connection', async () => {
        await service.close();
        expect(client.quit).toHaveBeenCalled();
      });
    });
  });

  describe('operations with no client (disabled cache)', () => {
    let service: CacheService;

    beforeEach(() => {
      service = new CacheService(makeConfigService(undefined));
      // client stays null — never connected, matching the disabled-cache state.
    });

    it('get/set/del/exists/clear all fail gracefully rather than throwing', async () => {
      await expect(service.get('k')).resolves.toBeNull();
      await expect(service.set('k', 'v')).resolves.toBe(false);
      await expect(service.del('k')).resolves.toBe(false);
      await expect(service.exists('k')).resolves.toBe(false);
      await expect(service.clear()).resolves.toBe(false);
    });

    it('getOrSet still computes and returns the factory value even though caching is a no-op', async () => {
      const factory = jest.fn().mockResolvedValue('fresh-value');
      await expect(service.getOrSet('k', factory)).resolves.toBe('fresh-value');
      expect(factory).toHaveBeenCalledTimes(1);
    });

    it('close() is a no-op rather than throwing when there was never a client', async () => {
      await expect(service.close()).resolves.toBeUndefined();
    });
  });
});
