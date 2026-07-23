import { buildRoom12DelayBoardDto, projectFromNeutralDto } from '../../../../lib/cig';
import {
  cigEdgeToEntity,
  cigEntityToEdge,
  cigEntityToNode,
  cigNodeToEntity,
  cigSnapshotMetaToEntity,
} from './cig-entity-mappers';

describe('cig-entity-mappers', () => {
  it('round-trips Room 12 projection nodes and edges', () => {
    const snapshot = projectFromNeutralDto(buildRoom12DelayBoardDto());
    expect(snapshot.nodes.length).toBeGreaterThan(0);
    expect(snapshot.edges.length).toBeGreaterThan(0);

    for (const node of snapshot.nodes) {
      const entity = cigNodeToEntity(node);
      expect(entity.id).toBe(node.id);
      expect(entity.tenantId).toBe(node.tenantId);
      expect(entity.entityType).toBe(node.entityType);
      expect(entity.phiClass).toBe(node.phiClass);
      expect(entity.durability).toBe('session');

      const back = cigEntityToNode(entity);
      expect(back.id).toBe(node.id);
      expect(back.state.status).toBe(node.state.status);
      expect(back.metadata).toEqual(node.metadata);
      expect(back.contentHash).toBe(node.contentHash);
    }

    for (const edge of snapshot.edges) {
      const entity = cigEdgeToEntity(edge);
      expect(entity.fromId).toBe(edge.fromId);
      expect(entity.toId).toBe(edge.toId);
      expect(entity.validTo).toBeNull();

      const back = cigEntityToEdge(entity);
      expect(back.type).toBe(edge.type);
      expect(back.validTo).toBeNull();
      expect(back.weight).toBe(edge.weight);
    }

    const snapEntity = cigSnapshotMetaToEntity(snapshot, 'cig:snap:tenant-ed-demo:7');
    expect(snapEntity.tenantId).toBe(snapshot.meta.tenantId);
    expect(Number(snapEntity.version)).toBe(snapshot.meta.snapshotVersion);
    expect(snapEntity.nodeCount).toBe(snapshot.meta.nodeCount);
    expect(snapEntity.edgeCount).toBe(snapshot.meta.edgeCount);
    expect(snapEntity.durability).toBe('session');
    expect(snapEntity.redisKey).toContain('cig:snap:');
  });

  it('preserves soft-archive timestamps', () => {
    const snapshot = projectFromNeutralDto(
      buildRoom12DelayBoardDto({
        patients: [
          {
            id: 'pt-out',
            label: 'Discharged',
            state: 'Discharge',
            discharged: true,
            dischargedAt: '2026-07-16T10:00:00.000Z',
            updatedAt: '2026-07-16T10:00:00.000Z',
          },
        ],
      }),
    );
    const patient = snapshot.nodes.find((n) => n.sourceId === 'pt-out');
    expect(patient?.archivedAt).toBeTruthy();
    const entity = cigNodeToEntity(patient!);
    expect(entity.archivedAt).toBeInstanceOf(Date);
    expect(cigEntityToNode(entity).archivedAt).toBe(patient!.archivedAt);
  });
});
