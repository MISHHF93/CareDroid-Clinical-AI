import { buildMetadataFilter, PgVectorStore } from './pgvector.store';

describe('PgVectorStore', () => {
  const dimension = 4;

  function createHarness() {
    /** @type {Array<{ sql: string, params?: unknown[] }>} */
    const calls: Array<{ sql: string; params?: unknown[] }> = [];
    /** @type {Map<string, any>} */
    const rows = new Map<string, any>();

    const query = jest.fn(async (sql: string, params: unknown[] = []) => {
      calls.push({ sql, params });
      const normalized = sql.replace(/\s+/g, ' ').trim().toLowerCase();

      if (normalized.startsWith('create extension') || normalized.startsWith('create table') || normalized.startsWith('create index')) {
        return [];
      }
      if (normalized.startsWith('select 1')) return [{ '?column?': 1 }];
      if (normalized.includes('count(*)')) {
        return [{ total: rows.size }];
      }
      if (normalized.startsWith('insert into')) {
        const [id, embedding, text, metadata, organizationId, sourceId] = params;
        rows.set(String(id), {
          id: String(id),
          embedding: String(embedding),
          text: String(text),
          metadata: typeof metadata === 'string' ? JSON.parse(metadata) : metadata,
          organization_id: organizationId,
          source_id: sourceId,
        });
        return [];
      }
      if (normalized.startsWith('delete from') && normalized.includes('any($1')) {
        const ids = params[0] as string[];
        for (const id of ids) rows.delete(id);
        return [];
      }
      if (normalized.startsWith('delete from') && normalized.includes('where')) {
        // simple org filter for tests
        if (normalized.includes('organization_id')) {
          const org = params[0];
          for (const [id, row] of [...rows.entries()]) {
            if (row.organization_id === org) rows.delete(id);
          }
        }
        return [];
      }
      if (normalized.includes('1 - (embedding <=>')) {
        // Return all rows with a fixed score; filter applied by store's SQL (we simulate org filter here)
        let list = [...rows.values()];
        if (normalized.includes('organization_id = any')) {
          const allowed = params[1] as string[];
          list = list.filter((row) => allowed.includes(row.organization_id));
        }
        return list.map((row) => ({
          id: row.id,
          text: row.text,
          metadata: row.metadata,
          score: 0.91,
        }));
      }
      return [];
    });

    const store = new PgVectorStore({
      dimension,
      query,
      skipSchemaBootstrap: false,
      indexName: 'test-pgvector',
    });

    return { store, query, calls, rows };
  }

  it('bootstraps schema on initialize', async () => {
    const { store, calls } = createHarness();
    await store.initialize();
    const sqls = calls.map((c) => c.sql.toLowerCase());
    expect(sqls.some((s) => s.includes('create extension'))).toBe(true);
    expect(sqls.some((s) => s.includes('create table'))).toBe(true);
  });

  it('rejects dimension mismatches on upsert and query', async () => {
    const { store } = createHarness();
    await store.initialize();
    await expect(
      store.upsertBatch([
        {
          id: 'bad',
          vector: [0.1, 0.2],
          text: 'x',
          metadata: { sourceId: 's1' } as any,
        },
      ]),
    ).rejects.toThrow(/dimension mismatch/i);

    await expect(store.query([0.1, 0.2, 0.3], { topK: 3 })).rejects.toThrow(/dimension mismatch/i);
  });

  it('upserts and queries with tenant filter support', async () => {
    const { store, rows } = createHarness();
    await store.initialize();

    await store.upsertBatch([
      {
        id: 'a1',
        vector: [1, 0, 0, 0],
        text: 'org A sepsis protocol',
        metadata: { organizationId: 'org-A', sourceId: 'src-a' } as any,
      },
      {
        id: 'b1',
        vector: [0, 1, 0, 0],
        text: 'org B diversion protocol',
        metadata: { organizationId: 'org-B', sourceId: 'src-b' } as any,
      },
    ]);

    expect(rows.size).toBe(2);

    const result = await store.query([1, 0, 0, 0], {
      topK: 5,
      filter: { organizationId: ['org-A', '__global__'] },
    });
    expect(result.matches.length).toBe(1);
    expect(result.matches[0].id).toBe('a1');
    expect(result.matches[0].score).toBeGreaterThan(0.5);
  });

  it('deleteByFilter refuses empty filter (no full wipe)', async () => {
    const { store } = createHarness();
    await store.initialize();
    await expect(store.deleteByFilter({})).rejects.toThrow(/non-empty filter/i);
  });

  it('healthCheck and getStats work', async () => {
    const { store } = createHarness();
    await store.initialize();
    await store.upsert({
      id: 's1',
      vector: [0, 0, 1, 0],
      text: 'sofa',
      metadata: { organizationId: 'org-A' } as any,
    });
    expect(await store.healthCheck()).toBe(true);
    const stats = await store.getStats();
    expect(stats.totalVectors).toBe(1);
    expect(stats.dimension).toBe(4);
    expect(stats.additionalInfo?.backend).toBe('pgvector');
  });
});

describe('buildMetadataFilter', () => {
  it('scopes organizationId arrays to organization_id column', () => {
    const { clause, params } = buildMetadataFilter(
      { organizationId: ['org-A', '__global__'] },
      2,
    );
    expect(clause).toContain('organization_id = ANY($2::text[])');
    expect(params).toEqual([['org-A', '__global__']]);
  });

  it('maps sourceId and generic metadata keys', () => {
    const { clause, params } = buildMetadataFilter(
      { sourceId: 'doc-1', specialty: 'cardio' },
      1,
    );
    expect(clause).toContain('source_id = $1');
    expect(clause).toContain('metadata->>');
    expect(params[0]).toBe('doc-1');
  });
});
