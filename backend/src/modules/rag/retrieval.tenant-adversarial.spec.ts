/**
 * Cycle 66 / D4 — adversarial tenant filter behavior at the retrieval boundary.
 * Architect Mode: also covers defense-in-depth post-filter.
 */
import {
  applyTenantOrganizationDefenseFilter,
  RetrievalService,
} from './retrieval.service';
import { RAG_GLOBAL_ORG_SCOPE } from './utils/tenant-scope';

describe('RetrievalService — adversarial tenant isolation', () => {
  const build = () => {
    const vectorDb = {
      query: jest.fn(async () => ({
        matches: [
          {
            id: 'chunk-a',
            score: 0.95,
            text: 'org A only sepsis bundle',
            metadata: { organizationId: 'org-A', sourceId: 'a1', title: 'A', type: 'protocol' },
          },
        ],
        latencyMs: 1,
        total: 1,
      })),
    };
    const cacheService = {
      get: jest.fn(async () => null),
      set: jest.fn(async () => undefined),
      getOrSet: jest.fn(async (_key: string, factory: () => Promise<unknown>) => factory()),
    };
    const configService = {
      get: jest.fn(() => ({ retrieval: { defaultTopK: 5, minScore: 0.5, cacheTtlSeconds: 60 } })),
    };
    const service = new RetrievalService(
      vectorDb as any,
      cacheService as any,
      configService as any,
    );
    return { service, vectorDb, cacheService };
  };

  const baseRequest = {
    query: 'sepsis hour-1',
    queryEmbedding: [0.1, 0.2, 0.3, 0.4],
    topK: 3,
    minScore: 0.5,
    includeEmbeddings: false,
    corpusVersion: 1,
    hybrid: false,
  };

  it('forwards organizationId filter array to the vector store unchanged', async () => {
    const { service, vectorDb } = build();
    await service.retrieve({
      ...baseRequest,
      filter: { organizationId: ['org-A', RAG_GLOBAL_ORG_SCOPE] },
    });

    expect(vectorDb.query).toHaveBeenCalledWith(
      baseRequest.queryEmbedding,
      expect.objectContaining({
        filter: { organizationId: ['org-A', RAG_GLOBAL_ORG_SCOPE] },
      }),
    );
  });

  it('does not invent a tenant when filter has no organizationId', async () => {
    const { service, vectorDb } = build();
    await service.retrieve({
      ...baseRequest,
      filter: { specialty: 'critical-care' },
    });

    const opts = (vectorDb.query.mock.calls as any[])[0][1];
    expect(opts.filter.organizationId).toBeUndefined();
    expect(opts.filter.specialty).toBe('critical-care');
  });

  it('issues independent vector queries for org-A vs org-B on the same embedding', async () => {
    const { service, vectorDb } = build();
    await service.retrieve({
      ...baseRequest,
      filter: { organizationId: ['org-A', RAG_GLOBAL_ORG_SCOPE] },
    });
    await service.retrieve({
      ...baseRequest,
      filter: { organizationId: ['org-B', RAG_GLOBAL_ORG_SCOPE] },
    });

    expect(vectorDb.query).toHaveBeenCalledTimes(2);
    const firstFilter = (vectorDb.query.mock.calls as any[])[0][1].filter.organizationId;
    const secondFilter = (vectorDb.query.mock.calls as any[])[1][1].filter.organizationId;
    expect(firstFilter).toEqual(['org-A', RAG_GLOBAL_ORG_SCOPE]);
    expect(secondFilter).toEqual(['org-B', RAG_GLOBAL_ORG_SCOPE]);
    expect(secondFilter).not.toContain('org-A');
  });

  it('post-filters foreign tenant hits even if the vector backend returns them', async () => {
    const { service, vectorDb } = build();
    vectorDb.query.mockResolvedValueOnce({
      matches: [
        {
          id: 'chunk-a',
          score: 0.99,
          text: 'org A',
          metadata: { organizationId: 'org-A', sourceId: 'a1', title: 'A', type: 'protocol' },
        },
        {
          id: 'chunk-b-leak',
          score: 0.98,
          text: 'org B secret',
          metadata: { organizationId: 'org-B', sourceId: 'b1', title: 'B', type: 'protocol' },
        },
        {
          id: 'chunk-global',
          score: 0.9,
          text: 'public guideline',
          metadata: {
            organizationId: RAG_GLOBAL_ORG_SCOPE,
            sourceId: 'g1',
            title: 'G',
            type: 'protocol',
          },
        },
      ],
      latencyMs: 1,
      total: 3,
    });

    const result = await service.retrieve({
      ...baseRequest,
      filter: { organizationId: ['org-A', RAG_GLOBAL_ORG_SCOPE] },
    });

    const ids = result.chunks.map((c) => c.id).sort();
    expect(ids).toEqual(['chunk-a', 'chunk-global']);
    expect(ids).not.toContain('chunk-b-leak');
  });
});

describe('applyTenantOrganizationDefenseFilter', () => {
  it('drops org-B when filter is org-A + global', () => {
    const filtered = applyTenantOrganizationDefenseFilter(
      [
        { metadata: { organizationId: 'org-A' } },
        { metadata: { organizationId: 'org-B' } },
        { metadata: { organizationId: RAG_GLOBAL_ORG_SCOPE } },
      ],
      { organizationId: ['org-A', RAG_GLOBAL_ORG_SCOPE] },
    );
    expect(filtered.map((m) => m.metadata?.organizationId).sort()).toEqual([
      RAG_GLOBAL_ORG_SCOPE,
      'org-A',
    ]);
  });
});
