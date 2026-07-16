import { ConfigService } from '@nestjs/config';
import { CacheService } from '../cache/cache.service';
import { RetrievalService } from './retrieval.service';
import { PineconeService } from './vector-db/pinecone.service';

describe('RetrievalService', () => {
  const queryEmbedding = [0.1, 0.2, 0.3];

  function createService(
    overrides: Partial<{ cacheGet: jest.Mock; cacheSet: jest.Mock; vectorQuery: jest.Mock }> = {},
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
    const cacheGet = overrides.cacheGet || jest.fn().mockResolvedValue(null);
    const cacheSet = overrides.cacheSet || jest.fn().mockResolvedValue(true);

    const service = new RetrievalService(
      { query: vectorQuery } as unknown as PineconeService,
      { get: cacheGet, set: cacheSet } as unknown as CacheService,
      {
        get: jest.fn().mockReturnValue({ retrieval: { cacheTtlSeconds: 60 } }),
      } as unknown as ConfigService,
    );

    return { service, vectorQuery, cacheGet, cacheSet };
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
      topK: 15,
      minScore: 0.7 * 0.65,
      filter: { type: 'clinical_guideline' },
      includeVectors: false,
      includeMetadata: true,
    });
    expect(result.chunks).toHaveLength(1);
    expect(result.chunks[0]).toEqual(
      expect.objectContaining({
        id: 'chunk-1',
        text: 'Sepsis protocol recommends early antibiotics.',
        metadata: expect.objectContaining({
          sourceId: 'sepsis-guideline',
          metadata: expect.objectContaining({
            hybrid: expect.objectContaining({
              vectorScore: 0.91,
              lexicalScore: expect.any(Number),
              fusedScore: expect.any(Number),
            }),
          }),
        }),
      }),
    );
    // Hybrid blends vector + fused rank (not pure vector score)
    expect(result.chunks[0].score).toBeGreaterThan(0.7);
    expect(result.totalRetrieved).toBe(1);
    expect(result.latencyMs).toBeGreaterThanOrEqual(0);
    expect(result.cacheHit).toBe(false);
  });

  it('uses cached retrieval payloads when available', async () => {
    const cacheGet = jest.fn().mockResolvedValue({
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
      cacheHit: false,
    });
    const { service, vectorQuery } = createService({ cacheGet });

    const result = await service.retrieve({
      query: 'cached query',
      queryEmbedding,
      topK: 3,
      minScore: 0.5,
      includeEmbeddings: false,
      filter: {},
      corpusVersion: 2,
    });

    expect(cacheGet).toHaveBeenCalled();
    expect(vectorQuery).not.toHaveBeenCalled();
    expect(result.chunks[0].id).toBe('cached-chunk');
    expect(result.cacheHit).toBe(true);
  });

  describe('cache-key correctness (filters must not share entries)', () => {
    const baseRequest = {
      query: 'sepsis protocol',
      queryEmbedding,
      topK: 5,
      minScore: 0.7,
      includeEmbeddings: false,
      corpusVersion: 1,
    };

    function capturedKeys(cacheGet: jest.Mock): string[] {
      return cacheGet.mock.calls.map(([key]) => key as string);
    }

    it('keys tenant-scoped queries separately (org A warm cache never serves org B)', async () => {
      const { service, cacheGet } = createService();

      await service.retrieve({
        ...baseRequest,
        filter: { organizationId: ['org-a', '__global__'] },
      });
      await service.retrieve({
        ...baseRequest,
        filter: { organizationId: ['org-b', '__global__'] },
      });

      const [keyA, keyB] = capturedKeys(cacheGet);
      expect(keyA).toContain('org-a');
      expect(keyB).toContain('org-b');
      expect(keyA).not.toEqual(keyB);
    });

    it('keys identical queries with different metadata filters separately', async () => {
      const { service, cacheGet } = createService();

      await service.retrieve({
        ...baseRequest,
        filter: {},
        metadataFilter: { specialty: 'cardiology' },
      });
      await service.retrieve({
        ...baseRequest,
        filter: {},
        metadataFilter: { specialty: 'neurology' },
      });

      const [cardioKey, neuroKey] = capturedKeys(cacheGet);
      expect(cardioKey).not.toEqual(neuroKey);
    });

    it('keys hybrid and pure-vector retrieval separately', async () => {
      const { service, cacheGet } = createService();

      await service.retrieve({ ...baseRequest, filter: {}, hybrid: true });
      await service.retrieve({ ...baseRequest, filter: {}, hybrid: false });

      const [hybridKey, vectorKey] = capturedKeys(cacheGet);
      expect(hybridKey).not.toEqual(vectorKey);
    });

    it('treats an absent metadata filter and an empty one as the same key (no needless misses)', async () => {
      const { service, cacheGet } = createService();

      await service.retrieve({ ...baseRequest, filter: {} });
      await service.retrieve({ ...baseRequest, filter: {}, metadataFilter: {} });

      const [absentKey, emptyKey] = capturedKeys(cacheGet);
      expect(absentKey).toEqual(emptyKey);
    });
  });
});
