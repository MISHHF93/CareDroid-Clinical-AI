import { ConfigService } from '@nestjs/config';
import { CacheService } from '../cache/cache.service';
import { OpenAIEmbeddingsService } from './embeddings/openai-embeddings.service';
import { EmbeddingService } from './embedding.service';

describe('EmbeddingService', () => {
  function createService(
    overrides: Partial<{
      cacheGet: jest.Mock;
      cacheSet: jest.Mock;
      cacheGetOrSet: jest.Mock;
      embed: jest.Mock;
      embedBatch: jest.Mock;
    }> = {},
  ) {
    const embed = overrides.embed || jest.fn().mockResolvedValue([0.1, 0.2, 0.3]);
    const embedBatch = overrides.embedBatch || jest.fn().mockResolvedValue([[0.4, 0.5, 0.6]]);
    const cacheGet = overrides.cacheGet || jest.fn().mockResolvedValue(null);
    const cacheSet = overrides.cacheSet || jest.fn().mockResolvedValue(true);
    const cacheGetOrSet =
      overrides.cacheGetOrSet || jest.fn((_key, factory) => Promise.resolve(factory()));

    const service = new EmbeddingService(
      {
        embed,
        embedBatch,
        getModel: jest.fn().mockReturnValue('text-embedding-test'),
        getDimension: jest.fn().mockReturnValue(3),
        healthCheck: jest.fn().mockResolvedValue(true),
      } as unknown as OpenAIEmbeddingsService,
      {
        get: cacheGet,
        set: cacheSet,
        getOrSet: cacheGetOrSet,
      } as unknown as CacheService,
      {
        get: jest.fn().mockReturnValue({ embeddings: { cacheTtlSeconds: 30 } }),
      } as unknown as ConfigService,
    );

    return { service, embed, embedBatch, cacheGet, cacheSet, cacheGetOrSet };
  }

  it('normalizes and caches query embeddings', async () => {
    const { service, embed, cacheGetOrSet } = createService();

    const result = await service.embedQuery('  Sepsis   protocol  ');

    expect(cacheGetOrSet).toHaveBeenCalledWith(
      'rag:embedding:text-embedding-test:sepsis protocol',
      expect.any(Function),
      30,
    );
    expect(embed).toHaveBeenCalledWith('Sepsis protocol');
    expect(result).toEqual([0.1, 0.2, 0.3]);
  });

  it('reuses document embedding cache entries and batches misses', async () => {
    const cacheGet = jest.fn().mockResolvedValueOnce([0.9, 0.9, 0.9]).mockResolvedValueOnce(null);
    const { service, embedBatch, cacheSet } = createService({
      cacheGet,
      embedBatch: jest.fn().mockResolvedValue([[0.4, 0.5, 0.6]]),
    });

    const result = await service.embedDocuments(['cached document', 'new document']);

    expect(embedBatch).toHaveBeenCalledWith(['new document']);
    expect(cacheSet).toHaveBeenCalledWith(
      'rag:embedding:text-embedding-test:new document',
      [0.4, 0.5, 0.6],
      30,
    );
    expect(result).toEqual([
      [0.9, 0.9, 0.9],
      [0.4, 0.5, 0.6],
    ]);
  });
});
