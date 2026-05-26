import { ConfigService } from '@nestjs/config';
import { CacheService } from '../cache/cache.service';
import { RetrievalService } from './retrieval.service';
import { PineconeService } from './vector-db/pinecone.service';

describe('RetrievalService', () => {
  const queryEmbedding = [0.1, 0.2, 0.3];

  function createService(
    overrides: Partial<{ cacheGetOrSet: jest.Mock; vectorQuery: jest.Mock }> = {},
  ) {
    const vectorQuery =
      overrides.vectorQuery ||
      jest.fn().mockResolvedValue({
        matches: [
          {
            id: 'chunk-1',
            text: 'Sepsis protocol recommends early antibiotics.',
            score: 0.91,
            metadata: {
              sourceId: 'sepsis-guideline',
              title: 'Sepsis Guideline',
              type: 'clinical_guideline',
            },
          },
        ],
        total: 1,
        latencyMs: 12,
      });
    const cacheGetOrSet =
      overrides.cacheGetOrSet || jest.fn((_key, factory) => Promise.resolve(factory()));

    const service = new RetrievalService(
      { query: vectorQuery } as unknown as PineconeService,
      { getOrSet: cacheGetOrSet } as unknown as CacheService,
      {
        get: jest.fn().mockReturnValue({ retrieval: { cacheTtlSeconds: 60 } }),
      } as unknown as ConfigService,
    );

    return { service, vectorQuery, cacheGetOrSet };
  }

  it('queries vectors and maps matches to retrieved chunks', async () => {
    const { service, vectorQuery } = createService();

    const result = await service.retrieve({
      query: 'sepsis protocol',
      queryEmbedding,
      topK: 5,
      minScore: 0.7,
      includeEmbeddings: false,
      filter: { type: 'clinical_guideline' },
      corpusVersion: 1,
    });

    expect(vectorQuery).toHaveBeenCalledWith(queryEmbedding, {
      topK: 5,
      minScore: 0.7,
      filter: { type: 'clinical_guideline' },
      includeVectors: false,
      includeMetadata: true,
    });
    expect(result.chunks).toEqual([
      expect.objectContaining({
        id: 'chunk-1',
        score: 0.91,
        metadata: expect.objectContaining({ sourceId: 'sepsis-guideline' }),
      }),
    ]);
    expect(result.totalRetrieved).toBe(1);
    expect(result.latencyMs).toBeGreaterThanOrEqual(0);
  });

  it('uses cached retrieval payloads when available', async () => {
    const cacheGetOrSet = jest.fn().mockResolvedValue({
      chunks: [
        {
          id: 'cached-chunk',
          text: 'Cached protocol',
          score: 0.8,
          metadata: { sourceId: 'cached', title: 'Cached', type: 'protocol' },
        },
      ],
      totalRetrieved: 1,
      latencyMs: 1,
    });
    const { service, vectorQuery } = createService({ cacheGetOrSet });

    const result = await service.retrieve({
      query: 'cached query',
      queryEmbedding,
      topK: 3,
      minScore: 0.5,
      includeEmbeddings: false,
      filter: {},
      corpusVersion: 2,
    });

    expect(cacheGetOrSet).toHaveBeenCalled();
    expect(vectorQuery).not.toHaveBeenCalled();
    expect(result.chunks[0].id).toBe('cached-chunk');
  });
});
