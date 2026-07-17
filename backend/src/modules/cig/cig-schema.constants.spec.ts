import {
  CIG_REDIS_KEY_PREFIXES,
  CIG_TABLES,
  cigAdjacencyRedisKey,
  cigSnapshotRedisKey,
} from './cig-schema.constants';
import { CIG_ENTITIES } from './entities';

describe('cig schema constants', () => {
  it('names all five durable tables', () => {
    expect(Object.values(CIG_TABLES)).toEqual(
      expect.arrayContaining([
        'cig_nodes',
        'cig_edges',
        'cig_events',
        'cig_outbox',
        'cig_snapshots',
      ]),
    );
    expect(Object.keys(CIG_TABLES)).toHaveLength(5);
  });

  it('builds tenant-scoped redis keys', () => {
    expect(cigSnapshotRedisKey('t1', 9)).toBe('cig:snap:t1:9');
    expect(cigAdjacencyRedisKey('t1')).toBe('cig:adj:t1');
    expect(CIG_REDIS_KEY_PREFIXES.snapshot).toBe('cig:snap:');
  });

  it('exports five TypeORM entity classes', () => {
    expect(CIG_ENTITIES).toHaveLength(5);
    for (const Entity of CIG_ENTITIES) {
      expect(typeof Entity).toBe('function');
    }
  });
});
