import { existsSync, rmSync } from 'fs';
import { join } from 'path';
import { tmpdir } from 'os';
import { ConfigService } from '@nestjs/config';
import { PineconeService } from './pinecone.service';
import { VectorRecord } from './vector-db.interface';
import { ChunkMetadata } from '../dto/rag-context.dto';

// Real Pinecone credentials aren't available in this environment (or any CI
// environment that hasn't provisioned a live index), so the SDK itself is
// replaced with a lightweight, controllable fake that mirrors the exact
// surface PineconeService calls: index(), query(), upsert(), deleteMany(),
// describeIndexStats(), namespace(). This lets the "real Pinecone" branch —
// previously completely untested — be exercised for real, including the
// minScore-filtering fix from Cycle 172.
let lastFakeIndex: FakeIndex | null = null;

class FakeIndex {
  queryImpl: (req: any) => Promise<{ matches: any[] }> = async () => ({ matches: [] });
  upsertCalls: any[][] = [];
  deleteManyCalls: any[] = [];
  describeIndexStatsImpl: () => Promise<any> = async () => ({
    totalRecordCount: 0,
    namespaces: {},
  });
  namespaceCalls: string[] = [];

  async query(req: any) {
    return this.queryImpl(req);
  }

  async upsert(vectors: any[]) {
    this.upsertCalls.push(vectors);
  }

  async deleteMany(idsOrFilter: any) {
    this.deleteManyCalls.push(idsOrFilter);
  }

  async describeIndexStats() {
    return this.describeIndexStatsImpl();
  }

  namespace(ns: string) {
    this.namespaceCalls.push(ns);
    return this;
  }
}

jest.mock('@pinecone-database/pinecone', () => {
  return {
    Pinecone: jest.fn().mockImplementation(() => ({
      index: jest.fn().mockImplementation(() => {
        lastFakeIndex = new FakeIndex();
        return lastFakeIndex;
      }),
    })),
  };
});

function makeConfigService(
  overrides: {
    apiKey?: string;
    vectorBackend?: string;
    namespace?: string;
    dimension?: number;
    indexName?: string;
  } = {},
): ConfigService {
  const ragConfig = {
    pinecone: {
      apiKey: overrides.apiKey,
      indexName: overrides.indexName,
      dimension: overrides.dimension,
      namespace: overrides.namespace,
    },
    embeddings: { dimension: overrides.dimension || 4 },
    vectorBackend: overrides.vectorBackend,
  };
  return {
    get: jest.fn((key: string) => (key === 'rag' ? ragConfig : undefined)),
  } as unknown as ConfigService;
}

function metadata(overrides: Partial<ChunkMetadata> = {}): ChunkMetadata {
  return {
    sourceId: 'doc-1',
    title: 'ACLS Guideline',
    type: 'guideline',
    ...overrides,
  } as ChunkMetadata;
}

function record(id: string, vector: number[], overrides: Partial<VectorRecord> = {}): VectorRecord {
  return {
    id,
    vector,
    text: `text for ${id}`,
    metadata: metadata(),
    ...overrides,
  };
}

describe('PineconeService', () => {
  let tmpIndexPath: string;

  beforeEach(() => {
    lastFakeIndex = null;
    tmpIndexPath = join(tmpdir(), `pinecone-service-spec-${Date.now()}-${Math.random()}.json`);
    process.env.RAG_LOCAL_INDEX_PATH = tmpIndexPath;
    delete process.env.RAG_VECTOR_BACKEND;
  });

  afterEach(() => {
    if (existsSync(tmpIndexPath)) rmSync(tmpIndexPath);
    delete process.env.RAG_LOCAL_INDEX_PATH;
    delete process.env.RAG_VECTOR_BACKEND;
  });

  describe('backend auto-selection', () => {
    it('falls back to the in-memory store when no apiKey and no Postgres DataSource are configured', async () => {
      const service = new PineconeService(makeConfigService());
      await service.initialize();

      expect(service.isInMemoryMode()).toBe(true);
      expect(service.isPgVectorMode()).toBe(false);
      expect(service.getActiveBackend()).toBe('in-memory');
    });

    it('uses the real Pinecone SDK when an apiKey is configured', async () => {
      const service = new PineconeService(makeConfigService({ apiKey: 'test-key' }));
      await service.initialize();

      expect(service.isInMemoryMode()).toBe(false);
      expect(service.getActiveBackend()).toBe('pinecone');
      expect(lastFakeIndex).not.toBeNull();
    });

    it('respects an explicit RAG_VECTOR_BACKEND=memory override even when an apiKey is present', async () => {
      const service = new PineconeService(
        makeConfigService({ apiKey: 'test-key', vectorBackend: 'memory' }),
      );
      await service.initialize();

      expect(service.getActiveBackend()).toBe('in-memory');
    });

    it('falls back to in-memory if the real Pinecone init throws (e.g. index verification fails)', async () => {
      const { Pinecone } = jest.requireMock('@pinecone-database/pinecone') as {
        Pinecone: jest.Mock;
      };
      Pinecone.mockImplementationOnce(() => ({
        index: jest.fn().mockImplementation(() => {
          const idx = new FakeIndex();
          idx.describeIndexStatsImpl = async () => {
            throw new Error('index not found');
          };
          lastFakeIndex = idx;
          return idx;
        }),
      }));

      const service = new PineconeService(makeConfigService({ apiKey: 'test-key' }));
      await service.initialize();

      expect(service.getActiveBackend()).toBe('in-memory');
    });

    it('is idempotent — calling initialize() twice does not reinitialize', async () => {
      const configService = makeConfigService({ apiKey: 'test-key' });
      const service = new PineconeService(configService);
      await service.initialize();
      const firstIndex = lastFakeIndex;
      await service.initialize();

      expect(lastFakeIndex).toBe(firstIndex);
    });
  });

  describe('in-memory backend (real cosine-similarity math, real disk persistence)', () => {
    it('round-trips upsert -> query -> delete against a real on-disk store', async () => {
      const service = new PineconeService(makeConfigService());
      await service.initialize();

      await service.upsert(record('a', [1, 0, 0, 0]));
      await service.upsert(record('b', [0, 1, 0, 0]));

      const result = await service.query([1, 0, 0, 0], { topK: 5 });
      expect(result.matches[0].id).toBe('a');
      expect(result.matches[0].score).toBeCloseTo(1, 5);
      expect(result.matches.some((m) => m.id === 'b')).toBe(true);

      await service.delete(['b']);
      const afterDelete = await service.query([1, 0, 0, 0], { topK: 5 });
      expect(afterDelete.matches.map((m) => m.id)).toEqual(['a']);

      expect(existsSync(tmpIndexPath)).toBe(true);
    });

    it('applies minScore to exclude dissimilar vectors', async () => {
      const service = new PineconeService(makeConfigService());
      await service.initialize();

      await service.upsertBatch([
        record('similar', [1, 0, 0, 0]),
        record('orthogonal', [0, 1, 0, 0]),
      ]);

      const result = await service.query([1, 0, 0, 0], { topK: 5, minScore: 0.5 });
      expect(result.matches.map((m) => m.id)).toEqual(['similar']);
    });

    it('deleteByFilter removes only matching records', async () => {
      const service = new PineconeService(makeConfigService());
      await service.initialize();

      await service.upsertBatch([
        record('x', [1, 0, 0, 0], { metadata: metadata({ sourceId: 'doc-a' }) }),
        record('y', [0, 1, 0, 0], { metadata: metadata({ sourceId: 'doc-b' }) }),
      ]);

      await service.deleteByFilter({ sourceId: 'doc-a' });
      const stats = await service.getStats();
      expect(stats.totalVectors).toBe(1);
    });

    it('healthCheck reports true and getStats reflects the record count', async () => {
      const service = new PineconeService(makeConfigService());
      await service.initialize();
      await service.upsert(record('a', [1, 0, 0, 0]));

      expect(await service.healthCheck()).toBe(true);
      const stats = await service.getStats();
      expect(stats.totalVectors).toBe(1);
      expect(stats.dimension).toBe(4);
    });
  });

  describe('real Pinecone SDK backend', () => {
    it('filters matches by minScore, treating a missing score as 0 (the Cycle 172 fix)', async () => {
      const service = new PineconeService(makeConfigService({ apiKey: 'test-key' }));
      await service.initialize();
      lastFakeIndex!.queryImpl = async () => ({
        matches: [
          {
            id: 'high',
            score: 0.9,
            metadata: { text: 'a', sourceId: 's', title: 't', type: 'guideline' },
          },
          {
            id: 'low',
            score: 0.1,
            metadata: { text: 'b', sourceId: 's', title: 't', type: 'guideline' },
          },
          { id: 'unscored', metadata: { text: 'c', sourceId: 's', title: 't', type: 'guideline' } },
        ],
      });

      const result = await service.query([1, 0, 0, 0], { topK: 10, minScore: 0.5 });

      expect(result.matches.map((m) => m.id)).toEqual(['high']);
    });

    it('includes an unscored match when minScore is 0 (the default)', async () => {
      const service = new PineconeService(makeConfigService({ apiKey: 'test-key' }));
      await service.initialize();
      lastFakeIndex!.queryImpl = async () => ({
        matches: [
          { id: 'unscored', metadata: { text: 'c', sourceId: 's', title: 't', type: 'guideline' } },
        ],
      });

      const result = await service.query([1, 0, 0, 0], { topK: 10 });

      expect(result.matches.map((m) => m.id)).toEqual(['unscored']);
    });

    it('builds Pinecone filter syntax: arrays become $in, primitives become $eq', async () => {
      const service = new PineconeService(makeConfigService({ apiKey: 'test-key' }));
      await service.initialize();
      let capturedRequest: any = null;
      lastFakeIndex!.queryImpl = async (req) => {
        capturedRequest = req;
        return { matches: [] };
      };

      await service.query([1, 0, 0, 0], {
        topK: 5,
        filter: { type: ['guideline', 'protocol'], sourceId: 'doc-1' },
      });

      expect(capturedRequest.filter).toEqual({
        type: { $in: ['guideline', 'protocol'] },
        sourceId: { $eq: 'doc-1' },
      });
    });

    it('batches upsertBatch into groups of 100', async () => {
      const service = new PineconeService(makeConfigService({ apiKey: 'test-key' }));
      await service.initialize();

      const records = Array.from({ length: 150 }, (_, i) => record(`id-${i}`, [1, 0, 0, 0]));
      await service.upsertBatch(records);

      expect(lastFakeIndex!.upsertCalls).toHaveLength(2);
      expect(lastFakeIndex!.upsertCalls[0]).toHaveLength(100);
      expect(lastFakeIndex!.upsertCalls[1]).toHaveLength(50);
    });

    it('upsert flattens metadata and reconstructs it on query via mapToVectorMatch', async () => {
      const service = new PineconeService(makeConfigService({ apiKey: 'test-key' }));
      await service.initialize();

      await service.upsert(
        record('doc-1-chunk-0', [1, 0, 0, 0], {
          metadata: metadata({ organization: 'AHA', metadata: { confidence: 0.9 } as any }),
        }),
      );
      const stored = lastFakeIndex!.upsertCalls[0][0];
      expect(stored.metadata.organization).toBe('AHA');
      expect(typeof stored.metadata.metadata).toBe('string');
      // Pinecone only supports metadata storage, so the chunk text rides
      // along inside the metadata blob on write...
      expect(stored.metadata.text).toBe('text for doc-1-chunk-0');

      lastFakeIndex!.queryImpl = async () => ({
        matches: [
          { id: 'doc-1-chunk-0', score: 0.8, metadata: { ...stored.metadata, text: 'chunk text' } },
        ],
      });
      const result = await service.query([1, 0, 0, 0], { topK: 1 });

      expect(result.matches[0].text).toBe('chunk text');
      expect(result.matches[0].metadata.organization).toBe('AHA');
      expect((result.matches[0].metadata as any).metadata).toEqual({ confidence: 0.9 });
      // ...and is stripped back out of the reconstructed metadata on read.
      expect((result.matches[0].metadata as any).text).toBeUndefined();
    });

    it('deletes by id via index.deleteMany', async () => {
      const service = new PineconeService(makeConfigService({ apiKey: 'test-key' }));
      await service.initialize();

      await service.delete(['a', 'b']);

      expect(lastFakeIndex!.deleteManyCalls).toEqual([['a', 'b']]);
    });

    it('deletes by filter via index.deleteMany using Pinecone filter syntax', async () => {
      const service = new PineconeService(makeConfigService({ apiKey: 'test-key' }));
      await service.initialize();

      await service.deleteByFilter({ sourceId: 'doc-1' });

      expect(lastFakeIndex!.deleteManyCalls).toEqual([{ sourceId: { $eq: 'doc-1' } }]);
    });

    it('routes operations through a namespaced index when a namespace is configured', async () => {
      const service = new PineconeService(
        makeConfigService({ apiKey: 'test-key', namespace: 'tenant-a' }),
      );
      await service.initialize();

      await service.query([1, 0, 0, 0], { topK: 1 });

      expect(lastFakeIndex!.namespaceCalls).toEqual(['tenant-a']);
    });

    it('wraps a query failure in a clear error instead of leaking the raw SDK error', async () => {
      const service = new PineconeService(makeConfigService({ apiKey: 'test-key' }));
      await service.initialize();
      lastFakeIndex!.queryImpl = async () => {
        throw new Error('rate limited');
      };

      await expect(service.query([1, 0, 0, 0], { topK: 5 })).rejects.toThrow(
        'Pinecone query failed: rate limited',
      );
    });

    it('healthCheck returns false rather than throwing when the index is unreachable', async () => {
      const service = new PineconeService(makeConfigService({ apiKey: 'test-key' }));
      await service.initialize();
      lastFakeIndex!.describeIndexStatsImpl = async () => {
        throw new Error('index unavailable');
      };

      expect(await service.healthCheck()).toBe(false);
    });

    it('upsertBatch and delete are no-ops for empty input', async () => {
      const service = new PineconeService(makeConfigService({ apiKey: 'test-key' }));
      await service.initialize();

      await service.upsertBatch([]);
      await service.delete([]);

      expect(lastFakeIndex!.upsertCalls).toHaveLength(0);
      expect(lastFakeIndex!.deleteManyCalls).toHaveLength(0);
    });
  });
});
