import { describe, expect, it } from 'vitest';
import {
  buildRoom12DelayBoardDto,
  ROOM12_GENERATED_AT,
  ROOM12_TENANT,
} from './fixtures/room12Delay.fixture';
import { makeCigNodeId } from './ids';
import type { NeutralBoardDto } from './neutralBoardDto';
import {
  findCigNeighbors,
  findCigNode,
  projectFromNeutralDto,
} from './projectFromNeutralDto';
import { CARE_DROID_CIG_LAYER, CIG_DISCHARGED_RETENTION_MS } from './constants';

describe('projectFromNeutralDto', () => {
  it('projects Room 12 delay chain with cig: ids and session durability', () => {
    const snapshot = projectFromNeutralDto(buildRoom12DelayBoardDto());

    expect(snapshot.layer).toBe(CARE_DROID_CIG_LAYER);
    expect(snapshot.meta.tenantId).toBe(ROOM12_TENANT);
    expect(snapshot.meta.snapshotVersion).toBe(7);
    expect(snapshot.meta.generatedAt).toBe(ROOM12_GENERATED_AT);
    expect(snapshot.durability).toBe('session');
    expect(snapshot.degraded).toBe(true);
    expect(snapshot.degradeReason).toMatch(/Mode B/i);

    const room = findCigNode(snapshot, 'room', '12');
    const patient = findCigNode(snapshot, 'patient', 'pt-room12');
    const lab = findCigNode(snapshot, 'diagnostic', 'lab-cbc-pt-room12');
    const analyzer = findCigNode(snapshot, 'service', 'lab-analyzer-a');
    const nurse = findCigNode(snapshot, 'staff', 'nurse-7');
    const queue = findCigNode(snapshot, 'queue', 'results-pending');
    const rec = findCigNode(snapshot, 'ai_recommendation', 'rec-expedite-lab');

    expect(room?.id).toBe(makeCigNodeId(ROOM12_TENANT, 'room', '12'));
    expect(patient?.phiClass).toBe('direct');
    expect(patient?.state.status).toBe('Results');
    expect(patient?.state.priority).toBe('P2');
    expect(lab?.state.blockingIssues).toContain('diagnostic_pending');
    expect(analyzer?.state.health).toBe('degraded');
    expect(analyzer?.phiClass).toBe('none');
    expect(nurse?.metadata.activePatientCount).toBe(4);
    expect(queue?.metadata.breached).toBe(true);
    expect(rec?.state.humanReviewRequired).toBe(true);

    // Edges: patient located_in room; lab blocks patient; analyzer blocks lab
    const patientId = patient!.id;
    expect(
      snapshot.edges.some(
        (e) => e.type === 'located_in' && e.fromId === patientId && e.toId === room!.id,
      ),
    ).toBe(true);
    expect(
      snapshot.edges.some(
        (e) => e.type === 'blocks' && e.fromId === lab!.id && e.toId === patientId,
      ),
    ).toBe(true);
    expect(
      snapshot.edges.some(
        (e) => e.type === 'blocks' && e.fromId === analyzer!.id && e.toId === lab!.id,
      ),
    ).toBe(true);
    expect(
      snapshot.edges.some(
        (e) =>
          e.type === 'assigned_to' && e.fromId === nurse!.id && e.toId === patientId,
      ),
    ).toBe(true);
    expect(
      snapshot.edges.some(
        (e) => e.type === 'waiting_in' && e.fromId === patientId && e.toId === queue!.id,
      ),
    ).toBe(true);
    expect(
      snapshot.edges.some(
        (e) => e.type === 'recommends' && e.fromId === rec!.id && e.toId === patientId,
      ),
    ).toBe(true);

    // Neighbor helper walks bidirectional
    const roomNeighbors = findCigNeighbors(snapshot, room!.id);
    expect(roomNeighbors.some((n) => n.node.entityType === 'patient')).toBe(true);
  });

  it('is deterministic for the same DTO (golden stability)', () => {
    const dto = buildRoom12DelayBoardDto();
    const a = projectFromNeutralDto(dto);
    const b = projectFromNeutralDto(dto);
    expect(a.nodes.map((n) => n.id).sort()).toEqual(b.nodes.map((n) => n.id).sort());
    expect(a.edges.map((e) => e.id).sort()).toEqual(b.edges.map((e) => e.id).sort());
    expect(a.nodes.find((n) => n.entityType === 'patient')?.contentHash).toBe(
      b.nodes.find((n) => n.entityType === 'patient')?.contentHash,
    );
  });

  it('rejects missing tenantId', () => {
    expect(() =>
      projectFromNeutralDto({
        tenantId: '',
        generatedAt: ROOM12_GENERATED_AT,
        snapshotVersion: 1,
        durability: 'session',
      }),
    ).toThrow(/tenantId/);
  });

  it('skips dismissed alerts', () => {
    const dto = buildRoom12DelayBoardDto({
      alerts: [
        {
          id: 'gone',
          label: 'Old',
          severity: 'info',
          dismissed: true,
        },
      ],
    });
    const snapshot = projectFromNeutralDto(dto);
    expect(findCigNode(snapshot, 'alert', 'gone')).toBeUndefined();
  });

  it('soft-archives discharged patients within 36h retention', () => {
    const dischargedAt = '2026-07-16T10:00:00.000Z'; // 4.5h before generatedAt
    const dto: NeutralBoardDto = {
      tenantId: 't',
      generatedAt: ROOM12_GENERATED_AT,
      snapshotVersion: 1,
      durability: 'session',
      patients: [
        {
          id: 'pt-out',
          label: 'Left ED',
          state: 'Discharge',
          discharged: true,
          dischargedAt,
          updatedAt: dischargedAt,
        },
      ],
    };
    const snapshot = projectFromNeutralDto(dto);
    const node = findCigNode(snapshot, 'patient', 'pt-out');
    expect(node).toBeDefined();
    expect(node?.archivedAt).toBe(dischargedAt);
  });

  it('excludes discharged patients older than retention', () => {
    const old = new Date(
      Date.parse(ROOM12_GENERATED_AT) - CIG_DISCHARGED_RETENTION_MS - 60_000,
    ).toISOString();
    const dto: NeutralBoardDto = {
      tenantId: 't',
      generatedAt: ROOM12_GENERATED_AT,
      snapshotVersion: 1,
      durability: 'session',
      patients: [
        {
          id: 'pt-ancient',
          label: 'Old discharge',
          state: 'Discharge',
          discharged: true,
          dischargedAt: old,
        },
      ],
    };
    const snapshot = projectFromNeutralDto(dto);
    expect(findCigNode(snapshot, 'patient', 'pt-ancient')).toBeUndefined();
  });

  it('marks durable projections as non-degraded when Mode A durability set', () => {
    const snapshot = projectFromNeutralDto(
      buildRoom12DelayBoardDto({ durability: 'durable' }),
    );
    expect(snapshot.durability).toBe('durable');
    expect(snapshot.degraded).toBe(false);
    expect(snapshot.degradeReason).toBeUndefined();
  });

  it('never fabricates PHI-free service metadata with patient names', () => {
    const snapshot = projectFromNeutralDto(buildRoom12DelayBoardDto());
    const analyzer = findCigNode(snapshot, 'service', 'lab-analyzer-a');
    expect(analyzer?.metadata).not.toHaveProperty('patientName');
    expect(analyzer?.metadata).not.toHaveProperty('mrn');
    expect(Object.keys(analyzer?.metadata ?? {}).sort()).toEqual(
      ['errorRate', 'latencyMs', 'status', 'version'].sort(),
    );
  });
});
