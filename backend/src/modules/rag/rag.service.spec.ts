import { RAGService, RAG_GLOBAL_ORG_SCOPE } from './rag.service';

describe('RAGService — tenant scoping', () => {
  const buildService = () => {
    const embeddingService = {
      embedQuery: jest.fn(async () => [0.1, 0.2]),
      embedDocuments: jest.fn(async (texts: string[]) => texts.map(() => [0.1, 0.2])),
      getModel: jest.fn(() => 'test-model'),
      getDimension: jest.fn(() => 2),
      healthCheck: jest.fn(async () => true),
    };
    const retrievalService = {
      retrieve: jest.fn(async () => ({
        chunks: [],
        totalRetrieved: 0,
        latencyMs: 1,
        cacheHit: false,
      })),
      clearInFlight: jest.fn(),
    };
    const rerankingService = {
      rerank: jest.fn(async (_query: string, chunks: unknown[]) => chunks),
    };
    const clinicalContextService = {
      buildEmptyContext: jest.fn((query: string) => ({
        query,
        chunks: [],
        sources: [],
        confidence: 0,
        timestamp: new Date(),
        totalRetrieved: 0,
        latencyMs: 0,
      })),
      buildContext: jest.fn((params: Record<string, unknown>) => ({
        ...params,
        confidence: 0,
        timestamp: new Date(),
      })),
    };
    const citationService = {
      extractSources: jest.fn(() => []),
      buildReferences: jest.fn(() => []),
      groundAnswer: jest.fn(),
    };
    const vectorDb = {
      initialize: jest.fn(async () => undefined),
      isInMemoryMode: jest.fn(() => true),
      getStats: jest.fn(async () => ({ totalVectors: 1, dimension: 2, indexName: 'test' })),
      upsertBatch: jest.fn(async () => undefined),
      deleteByFilter: jest.fn(async () => undefined),
      healthCheck: jest.fn(async () => true),
    };
    const configService = {
      get: jest.fn((key: string) =>
        key === 'rag' ? { enabled: true, autoBootstrapCorpus: false } : undefined,
      ),
    };
    const toolMetrics = {
      recordRagRetrieval: jest.fn(),
      recordRagRelevanceScore: jest.fn(),
    };

    const service = new RAGService(
      embeddingService as any,
      retrievalService as any,
      rerankingService as any,
      clinicalContextService as any,
      citationService as any,
      vectorDb as any,
      configService as any,
      toolMetrics as any,
    );

    return { service, retrievalService, vectorDb };
  };

  it('scopes retrieval to the caller organization plus the shared global corpus', async () => {
    const { service, retrievalService } = buildService();

    await service.retrieve('sepsis criteria', { organizationId: 'org-123' });

    expect(retrievalService.retrieve).toHaveBeenCalledWith(
      expect.objectContaining({
        filter: expect.objectContaining({ organizationId: ['org-123', RAG_GLOBAL_ORG_SCOPE] }),
      }),
    );
  });

  it('does not scope retrieval by organization when no organizationId is provided (legacy callers)', async () => {
    const { service, retrievalService } = buildService();

    await service.retrieve('sepsis criteria');

    const call = (retrievalService.retrieve.mock.calls as any[])[0][0];
    expect(call.filter.organizationId).toBeUndefined();
  });

  it('tags every ingested chunk with the source organizationId', async () => {
    const { service, vectorDb } = buildService();

    await service.ingest({
      content:
        'Sepsis is defined as a life-threatening organ dysfunction caused by a dysregulated host response to infection.',
      source: {
        id: 'org-doc-1',
        title: 'Org Protocol',
        type: 'protocol',
        organizationId: 'org-123',
      },
    });

    const [records] = (vectorDb.upsertBatch.mock.calls as any[])[0];
    expect(records.length).toBeGreaterThan(0);
    expect(records.every((record: any) => record.metadata.organizationId === 'org-123')).toBe(true);
  });

  it('tags ingested chunks with the shared global scope when no organizationId is set', async () => {
    const { service, vectorDb } = buildService();

    await service.ingest({
      content:
        'General public sepsis guideline content describing the surviving sepsis campaign bundle.',
      source: {
        id: 'public-doc-1',
        title: 'Public Guideline',
        type: 'guideline',
      },
    });

    const [records] = (vectorDb.upsertBatch.mock.calls as any[])[0];
    expect(records.length).toBeGreaterThan(0);
    expect(
      records.every((record: any) => record.metadata.organizationId === RAG_GLOBAL_ORG_SCOPE),
    ).toBe(true);
  });

  // --- Adversarial tenant isolation (Cycle 64 / D4 partial) ---

  it('adversarial: org-A retrieval filter never includes org-B', async () => {
    const { service, retrievalService } = buildService();

    await service.retrieve('warfarin interaction', { organizationId: 'org-A' });

    const filter = (retrievalService.retrieve.mock.calls as any[])[0][0].filter;
    expect(filter.organizationId).toEqual(['org-A', RAG_GLOBAL_ORG_SCOPE]);
    expect(filter.organizationId).not.toContain('org-B');
    expect(filter.organizationId).not.toContain('org-A; DROP TABLE');
  });

  it('adversarial: empty-string organizationId does not invent a tenant scope', async () => {
    const { service, retrievalService } = buildService();

    await service.retrieve('stroke protocol', { organizationId: '' as any });

    const call = (retrievalService.retrieve.mock.calls as any[])[0][0];
    // Falsy organizationId must not produce organizationId: ['', '__global__']
    expect(call.filter.organizationId).toBeUndefined();
  });

  it('adversarial: whitespace-only organizationId is treated as unscoped after trim', async () => {
    const { service, retrievalService } = buildService();

    await service.retrieve('stroke protocol', { organizationId: '   ' });

    const call = (retrievalService.retrieve.mock.calls as any[])[0][0];
    expect(call.filter.organizationId).toBeUndefined();
  });

  it('adversarial: an array smuggled as organizationId cannot widen the scope to a victim org', async () => {
    const { service, retrievalService } = buildService();

    await service.retrieve('sepsis', { organizationId: ['org-victim'] as any });

    const call = (retrievalService.retrieve.mock.calls as any[])[0][0];
    const scope = call.filter.organizationId;
    expect(scope === undefined || !scope.includes('org-victim')).toBe(true);
  });

  it('adversarial: an object smuggled as organizationId cannot become a filter operator', async () => {
    const { service, retrievalService } = buildService();

    await service.retrieve('sepsis', { organizationId: { $ne: null } as any });

    const call = (retrievalService.retrieve.mock.calls as any[])[0][0];
    const flattened = JSON.stringify(call.filter.organizationId ?? null);
    // No operator injection may survive into the vector-store filter.
    expect(flattened).not.toContain('$ne');
  });

  it('adversarial: org-B cannot be smuggled via documentTypes / specialty fields', async () => {
    const { service, retrievalService } = buildService();

    await service.retrieve('sepsis', {
      organizationId: 'org-A',
      documentTypes: ['protocol', 'org-B'] as any,
      specialty: 'org-B',
    });

    const filter = (retrievalService.retrieve.mock.calls as any[])[0][0].filter;
    expect(filter.organizationId).toEqual(['org-A', RAG_GLOBAL_ORG_SCOPE]);
    // specialty may pass through as a separate filter key — must not replace tenant scope
    expect(filter.organizationId).not.toEqual(expect.arrayContaining(['org-B']));
  });

  it('adversarial: ingested org-A chunks never tag as org-B metadata', async () => {
    const { service, vectorDb } = buildService();

    await service.ingest({
      content:
        'Tenant-private EMS diversion protocol for hospital A. Keep this scoped to org-A only.',
      source: {
        id: 'org-a-private-1',
        title: 'Org A Private Protocol',
        type: 'protocol',
        organizationId: 'org-A',
      },
    });

    const [records] = (vectorDb.upsertBatch.mock.calls as any[])[0];
    expect(records.length).toBeGreaterThan(0);
    for (const record of records) {
      expect(record.metadata.organizationId).toBe('org-A');
      expect(record.metadata.organizationId).not.toBe('org-B');
      expect(record.metadata.organizationId).not.toBe(RAG_GLOBAL_ORG_SCOPE);
    }
  });

  it('adversarial: sequential retrieve for org-A then org-B does not leak prior filter', async () => {
    const { service, retrievalService } = buildService();

    await service.retrieve('query one', { organizationId: 'org-A' });
    await service.retrieve('query two', { organizationId: 'org-B' });

    const first = (retrievalService.retrieve.mock.calls as any[])[0][0].filter;
    const second = (retrievalService.retrieve.mock.calls as any[])[1][0].filter;
    expect(first.organizationId).toEqual(['org-A', RAG_GLOBAL_ORG_SCOPE]);
    expect(second.organizationId).toEqual(['org-B', RAG_GLOBAL_ORG_SCOPE]);
    expect(second.organizationId).not.toContain('org-A');
  });
});
