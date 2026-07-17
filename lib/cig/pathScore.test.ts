import { describe, expect, it } from 'vitest';
import {
  edgeTypeWeight,
  nodeStatusBonus,
  rankPaths,
  scorePath,
} from './pathScore';
import type { CigEdge, CigNode } from './types';

function node(partial: Partial<CigNode> & Pick<CigNode, 'id' | 'entityType'>): CigNode {
  return {
    tenantId: 't',
    sourceId: partial.id.split(':').pop() || 'x',
    sourceModule: 'test',
    label: partial.label || partial.id,
    state: partial.state || { status: 'active', humanReviewRequired: false },
    metadata: partial.metadata || {},
    phiClass: partial.phiClass || 'none',
    durability: 'session',
    sourceUpdatedAt: '2026-07-16T00:00:00.000Z',
    version: 1,
    projectorGeneration: 'test',
    updatedAt: '2026-07-16T00:00:00.000Z',
    createdAt: '2026-07-16T00:00:00.000Z',
    ...partial,
  };
}

function edge(
  partial: Partial<CigEdge> & Pick<CigEdge, 'id' | 'type' | 'fromId' | 'toId'>,
): CigEdge {
  return {
    tenantId: 't',
    validFrom: '2026-07-16T00:00:00.000Z',
    validTo: null,
    sourceModule: 'test',
    durability: 'session',
    ...partial,
  };
}

describe('pathScore v1', () => {
  it('weights blocks higher than located_in', () => {
    expect(edgeTypeWeight('blocks')).toBeGreaterThan(edgeTypeWeight('located_in'));
    expect(edgeTypeWeight('blocks')).toBe(1);
  });

  it('caps node status bonus at 1.0', () => {
    const n = node({
      id: 'cig:t:service:x',
      entityType: 'service',
      severity: 'critical',
      state: {
        status: 'critical',
        health: 'critical',
        blockingIssues: ['a', 'b'],
        humanReviewRequired: false,
        timeInStateMs: 200 * 60 * 1000,
      },
      metadata: { breached: true },
    });
    expect(nodeStatusBonus(n)).toBeLessThanOrEqual(1);
    expect(nodeStatusBonus(n)).toBeGreaterThan(0.5);
  });

  it('ranks blocking paths above decorative located_in-only paths', () => {
    const room = node({ id: 'room', entityType: 'room', label: 'Room' });
    const patient = node({
      id: 'patient',
      entityType: 'patient',
      severity: 'warning',
      state: { status: 'Results', humanReviewRequired: false },
    });
    const lab = node({
      id: 'lab',
      entityType: 'diagnostic',
      severity: 'warning',
      state: {
        status: 'pending',
        blockingIssues: ['pending'],
        humanReviewRequired: false,
      },
    });
    const dept = node({ id: 'dept', entityType: 'department', label: 'ED' });

    const blockPath = scorePath(
      [room, patient, lab],
      [
        edge({ id: 'e1', type: 'located_in', fromId: 'patient', toId: 'room' }),
        edge({ id: 'e2', type: 'blocks', fromId: 'lab', toId: 'patient', weight: 1.5 }),
      ],
      'explain_delay',
    );
    const decorative = scorePath(
      [room, dept],
      [edge({ id: 'e3', type: 'part_of', fromId: 'room', toId: 'dept' })],
      'explain_delay',
    );

    const ranked = rankPaths([decorative, blockPath]);
    expect(ranked[0].pathId).toBe(blockPath.pathId);
    expect(ranked[0].blocksCount).toBeGreaterThan(0);
  });

  it('tie-breaks deterministically by pathId', () => {
    const a = scorePath(
      [node({ id: 'a', entityType: 'patient' }), node({ id: 'b', entityType: 'room' })],
      [edge({ id: 'e-b', type: 'located_in', fromId: 'a', toId: 'b' })],
    );
    const b = scorePath(
      [node({ id: 'a', entityType: 'patient' }), node({ id: 'c', entityType: 'room' })],
      [edge({ id: 'e-c', type: 'located_in', fromId: 'a', toId: 'c' })],
    );
    // Force equal scores by reusing rank with same structure — just ensure sort stable
    const ranked = rankPaths([
      { ...b, score: 1, blocksCount: 0, maxSeverityRank: 0 },
      { ...a, score: 1, blocksCount: 0, maxSeverityRank: 0 },
    ]);
    expect(ranked[0].pathId <= ranked[1].pathId).toBe(true);
  });
});
