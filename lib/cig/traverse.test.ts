import { describe, expect, it } from 'vitest';
import { buildRoom12DelayBoardDto, ROOM12_TENANT } from './fixtures/room12Delay.fixture';
import { makeCigNodeId } from './ids';
import { projectFromNeutralDto } from './projectFromNeutralDto';
import {
  allowedEdgeTypesFromTraverse,
  allowedNodeIdsFromTraverse,
  traverseCigGraph,
} from './traverse';

describe('traverseCigGraph', () => {
  const snapshot = projectFromNeutralDto(buildRoom12DelayBoardDto());
  const roomId = makeCigNodeId(ROOM12_TENANT, 'room', '12');
  const patientId = makeCigNodeId(ROOM12_TENANT, 'patient', 'pt-room12');
  const labId = makeCigNodeId(ROOM12_TENANT, 'diagnostic', 'lab-cbc-pt-room12');
  const analyzerId = makeCigNodeId(ROOM12_TENANT, 'service', 'lab-analyzer-a');

  it('explains Room 12 delay via blocking lab/analyzer path ranking above decorative dept path', () => {
    const result = traverseCigGraph(snapshot, {
      startNodeId: roomId,
      goal: 'explain_delay',
      maxDepth: 6,
      maxBranch: 8,
      maxPaths: 15,
    });

    expect(result.humanReviewRequired).toBe(true);
    expect(result.paths.length).toBeGreaterThan(0);
    expect(result.degraded).toBe(true); // Mode B session

    const top = result.paths[0];
    // Top path should involve patient and preferably blocks
    expect(top.nodeIds).toContain(patientId);
    const topTypes = top.edges.map((e) => e.type);
    const hasBlocksSomewhere = result.paths.some((p) =>
      p.edges.some((e) => e.type === 'blocks'),
    );
    expect(hasBlocksSomewhere).toBe(true);

    // Analyzer or lab should appear among high-ranked paths
    const topFive = result.paths.slice(0, 5);
    const mentionsLabOrAnalyzer = topFive.some(
      (p) => p.nodeIds.includes(labId) || p.nodeIds.includes(analyzerId),
    );
    expect(mentionsLabOrAnalyzer).toBe(true);

    // Decorative-only department path should not beat blocking paths
    const deptOnly = result.paths.find(
      (p) =>
        p.nodeIds.includes(makeCigNodeId(ROOM12_TENANT, 'department', 'ed')) &&
        !p.edges.some((e) => e.type === 'blocks'),
    );
    if (deptOnly) {
      expect(top.score).toBeGreaterThanOrEqual(deptOnly.score);
    }

    expect(result.provenance.kind).toBe('live_operational_data');
    expect(result.provenance.pathNodeIds.length).toBeGreaterThan(0);
  });

  it('find_owner prefers assigned_to edges', () => {
    const result = traverseCigGraph(snapshot, {
      startNodeId: patientId,
      goal: 'find_owner',
      maxDepth: 3,
    });
    const hasAssigned = result.paths.some((p) =>
      p.edges.some((e) => e.type === 'assigned_to'),
    );
    expect(hasAssigned).toBe(true);
  });

  it('blocking_issues focuses on blocks edges', () => {
    const result = traverseCigGraph(snapshot, {
      startNodeId: patientId,
      goal: 'blocking_issues',
      maxDepth: 4,
    });
    expect(result.paths.some((p) => p.blocksCount > 0)).toBe(true);
  });

  it('returns empty paths when start missing', () => {
    const result = traverseCigGraph(snapshot, {
      startNodeId: 'cig:nope:room:999',
    });
    expect(result.paths).toHaveLength(0);
    expect(result.degradeReason).toBe('start_node_not_found');
  });

  it('refuses paths when degraded and refuseWhenDegraded set', () => {
    const result = traverseCigGraph(snapshot, {
      startNodeId: roomId,
      refuseWhenDegraded: true,
    });
    expect(result.paths).toHaveLength(0);
    expect(result.degraded).toBe(true);
  });

  it('exposes LLM allow-lists limited to returned path entities', () => {
    const result = traverseCigGraph(snapshot, {
      startNodeId: roomId,
      goal: 'explain_delay',
      maxPaths: 5,
    });
    const edgeTypes = allowedEdgeTypesFromTraverse(result);
    const nodeIds = allowedNodeIdsFromTraverse(result);
    for (const path of result.paths) {
      for (const e of path.edges) {
        expect(edgeTypes.has(e.type)).toBe(true);
      }
      for (const id of path.nodeIds) {
        expect(nodeIds.has(id)).toBe(true);
      }
    }
    // Invented type must not be allowed
    expect(edgeTypes.has('teleports_to')).toBe(false);
  });

  it('is deterministic for same snapshot and options', () => {
    const a = traverseCigGraph(snapshot, { startNodeId: roomId, goal: 'explain_delay' });
    const b = traverseCigGraph(snapshot, { startNodeId: roomId, goal: 'explain_delay' });
    expect(a.paths.map((p) => p.pathId)).toEqual(b.paths.map((p) => p.pathId));
    expect(a.paths.map((p) => p.score)).toEqual(b.paths.map((p) => p.score));
  });
});
