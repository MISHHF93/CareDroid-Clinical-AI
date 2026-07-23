import { FindOperator, In, IsNull } from 'typeorm';
import { buildRoom12DelayBoardDto } from '../../../../lib/cig';
import { CigEventBus } from './cig-event.bus';
import { CigProjectionFacade } from './cig-projection.facade';
import { CigEdgeEntity } from './entities/cig-edge.entity';
import { CigEventEntity } from './entities/cig-event.entity';
import { CigNodeEntity } from './entities/cig-node.entity';
import { CigOutboxEntity } from './entities/cig-outbox.entity';
import { CigSnapshotEntity } from './entities/cig-snapshot.entity';

function matchWhere(row: Record<string, unknown>, where: Record<string, unknown>): boolean {
  return Object.entries(where).every(([k, v]) => {
    if (v instanceof FindOperator) {
      if (v.type === 'isNull') return row[k] == null;
      if (v.type === 'in') {
        const values = (v.value as unknown[]) || [];
        return values.includes(row[k]);
      }
      return false;
    }
    return row[k] === v;
  });
}

function createMemoryRepo<T extends Record<string, unknown>>(keyField: keyof T) {
  const store: T[] = [];
  return {
    store,
    async find(options?: { where?: Record<string, unknown> }): Promise<T[]> {
      if (!options?.where) return [...store];
      return store.filter((row) => matchWhere(row as Record<string, unknown>, options.where!));
    },
    async findOne(options?: { where?: Record<string, unknown> }): Promise<T | null> {
      const rows = await this.find(options);
      return rows[0] || null;
    },
    async save(entity: T | T[]): Promise<T | T[]> {
      const list = Array.isArray(entity) ? entity : [entity];
      for (const item of list) {
        const key = item[keyField];
        const idx = store.findIndex((r) => r[keyField] === key);
        if (idx >= 0) store[idx] = { ...store[idx], ...item };
        else store.push({ ...item });
      }
      return entity;
    },
    create(partial: Partial<T>): T {
      return { ...partial } as T;
    },
  };
}

describe('CigProjectionFacade Mode B', () => {
  function buildFacade() {
    const nodeRepo = createMemoryRepo<CigNodeEntity & Record<string, unknown>>('id');
    const edgeRepo = createMemoryRepo<CigEdgeEntity & Record<string, unknown>>('id');
    const eventRepo = createMemoryRepo<CigEventEntity & Record<string, unknown>>(
      'eventId' as keyof CigEventEntity,
    );
    const outboxRepo = createMemoryRepo<CigOutboxEntity & Record<string, unknown>>('id');
    const snapshotRepo = createMemoryRepo<CigSnapshotEntity & Record<string, unknown>>(
      'tenantId' as keyof CigSnapshotEntity,
    );
    const bus = new CigEventBus();

    let outboxSeq = 1;
    const originalSave = outboxRepo.save.bind(outboxRepo);
    outboxRepo.save = async (entity: CigOutboxEntity | CigOutboxEntity[]) => {
      const list = Array.isArray(entity) ? entity : [entity];
      for (const item of list) {
        if (item.id == null) (item as { id: string }).id = String(outboxSeq++);
      }
      return originalSave(entity as never);
    };

    const facade = new CigProjectionFacade(
      nodeRepo as never,
      edgeRepo as never,
      eventRepo as never,
      outboxRepo as never,
      snapshotRepo as never,
      bus,
    );

    return { facade, nodeRepo, edgeRepo, eventRepo, outboxRepo, snapshotRepo, bus };
  }

  it('rejects missing tenantId', async () => {
    const { facade } = buildFacade();
    const result = await facade.afterBoardMutation({ tenantId: '' });
    expect(result.ok).toBe(false);
    expect(result.error).toMatch(/tenantId/);
  });

  it('projects Room 12 board DTO, persists nodes/edges, emits graph updated', async () => {
    const { facade, nodeRepo, edgeRepo, snapshotRepo, outboxRepo, eventRepo, bus } = buildFacade();

    const graphEvents: unknown[] = [];
    bus.onGraphUpdated((p) => graphEvents.push(p));

    const dto = buildRoom12DelayBoardDto();
    const result = await facade.afterBoardMutation({
      tenantId: dto.tenantId,
      dto,
      snapshotVersion: dto.snapshotVersion,
      sourceEventName: 'patient.updated',
      producer: 'test',
      eventId: 'evt-room12-1',
    });

    expect(result.ok).toBe(true);
    expect(result.mode).toBe('B');
    expect(result.durability).toBe('session');
    expect(result.degraded).toBe(true);
    expect(result.nodeCount).toBeGreaterThan(0);
    expect(result.edgeCount).toBeGreaterThan(0);
    expect(result.upsertedNodeCount).toBe(result.nodeCount);
    expect(nodeRepo.store.length).toBe(result.nodeCount);
    expect(edgeRepo.store.length).toBe(result.edgeCount);
    expect(snapshotRepo.store[0]?.tenantId).toBe(dto.tenantId);
    expect(Number(snapshotRepo.store[0]?.version)).toBe(dto.snapshotVersion);
    expect(result.snapshotVersion).toBe(dto.snapshotVersion);
    expect(outboxRepo.store[0]?.processedAt).toBeTruthy();
    expect(eventRepo.store.length).toBeGreaterThanOrEqual(1);
    expect(graphEvents).toHaveLength(1);

    // sanity: IsNull / In path works via TypeORM operators
    const active = await nodeRepo.find({ where: { tenantId: dto.tenantId, archivedAt: IsNull() } });
    expect(active.length).toBe(result.nodeCount);
    const someIds = nodeRepo.store.slice(0, 2).map((n) => n.id);
    const subset = await nodeRepo.find({
      where: { tenantId: dto.tenantId, id: In(someIds) },
    });
    expect(subset.length).toBe(someIds.length);
  });

  it('increments snapshot version on second projection and closes removed edges', async () => {
    const { facade, edgeRepo, snapshotRepo } = buildFacade();
    const dto = buildRoom12DelayBoardDto({ snapshotVersion: 1 });

    const first = await facade.afterBoardMutation({
      tenantId: dto.tenantId,
      dto,
      snapshotVersion: 1,
    });
    expect(first.ok).toBe(true);
    expect(first.snapshotVersion).toBe(1);
    const edgeCountAfterFirst = edgeRepo.store.filter((e) => e.validTo == null).length;

    const slim = buildRoom12DelayBoardDto({
      snapshotVersion: 2,
      diagnostics: [],
      services: [],
      recommendations: [],
      alerts: [],
    });
    const second = await facade.afterBoardMutation({
      tenantId: slim.tenantId,
      dto: slim,
    });

    expect(second.ok).toBe(true);
    expect(second.snapshotVersion).toBe(2);
    expect(Number(snapshotRepo.store[0]?.version)).toBe(2);
    expect(second.closedEdgeCount).toBeGreaterThan(0);
    const currentEdges = edgeRepo.store.filter((e) => e.validTo == null);
    expect(currentEdges.length).toBeLessThan(edgeCountAfterFirst);
  });

  it('projects from Nest board arrays via adapter', async () => {
    const { facade, nodeRepo } = buildFacade();
    const result = await facade.afterBoardMutation({
      tenantId: 'nest-tenant',
      board: {
        patients: [
          {
            id: 'p1',
            firstName: 'A',
            lastName: 'B',
            state: 'Waiting',
            priority: 'P3',
            arrivalTime: '2026-07-16T10:00:00.000Z',
          },
        ],
        staff: [{ id: 's1', name: 'Nurse', role: 'RN', active: true }],
        rooms: [],
        alerts: [],
      },
      sourceEventName: 'patient.created',
    });

    expect(result.ok).toBe(true);
    expect(result.tenantId).toBe('nest-tenant');
    expect(nodeRepo.store.some((n) => n.entityType === 'patient' && n.sourceId === 'p1')).toBe(
      true,
    );
  });

  it('preserves node version when contentHash unchanged', async () => {
    const { facade, nodeRepo } = buildFacade();
    const dto = buildRoom12DelayBoardDto({ snapshotVersion: 1 });
    await facade.afterBoardMutation({ tenantId: dto.tenantId, dto, snapshotVersion: 1 });
    const before = nodeRepo.store.find((n) => n.entityType === 'room');
    expect(before?.version).toBe(1);

    await facade.afterBoardMutation({
      tenantId: dto.tenantId,
      dto: buildRoom12DelayBoardDto({ snapshotVersion: 2 }),
      snapshotVersion: 2,
    });
    const after = nodeRepo.store.find((n) => n.entityType === 'room');
    expect(after?.contentHash).toBe(before?.contentHash);
    expect(after?.version).toBe(1);
  });
});
