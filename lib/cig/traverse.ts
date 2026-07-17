/**
 * Deterministic CIG graph traversal (PR-3).
 * BFS/DFS expansion with hard filters + pathScore ranking.
 */

import {
  preferredEdgeTypesForGoal,
  rankPaths,
  scorePath,
  type CigTraverseGoal,
  type ScoredPath,
} from './pathScore';
import type { CigEdge, CigGraphSnapshot, CigNode } from './types';

export type TraverseOptions = {
  startNodeId: string;
  goal?: CigTraverseGoal;
  maxDepth?: number;
  maxBranch?: number;
  maxPaths?: number;
  /** When true, refuse clinical path claims if snapshot is degraded */
  refuseWhenDegraded?: boolean;
  /** Node ids marked in reconciler conflict — hard filtered */
  conflictNodeIds?: ReadonlySet<string>;
};

export type TraverseResult = {
  startNodeId: string;
  goal: CigTraverseGoal;
  paths: ScoredPath[];
  subgraph: {
    nodes: CigNode[];
    edges: CigEdge[];
  };
  degraded: boolean;
  degradeReason?: string;
  humanReviewRequired: true;
  provenance: {
    kind: 'live_operational_data';
    snapshotVersion: number;
    projectorGeneration: string;
    pathNodeIds: string[];
    pathEdgeIds: string[];
  };
};

type AdjEntry = { edge: CigEdge; neighborId: string };

function buildAdjacency(snapshot: CigGraphSnapshot): Map<string, AdjEntry[]> {
  const adj = new Map<string, AdjEntry[]>();
  const ensure = (id: string) => {
    if (!adj.has(id)) adj.set(id, []);
    return adj.get(id)!;
  };
  for (const edge of snapshot.edges) {
    // Hard filter: current edges only
    if (edge.validTo != null) continue;
    ensure(edge.fromId).push({ edge, neighborId: edge.toId });
    ensure(edge.toId).push({ edge, neighborId: edge.fromId });
  }
  return adj;
}

function orderBranches(
  entries: AdjEntry[],
  goal: CigTraverseGoal,
  maxBranch: number,
): AdjEntry[] {
  const preferred = preferredEdgeTypesForGoal(goal);
  const prefIndex = new Map<string, number>(preferred.map((t, i) => [t, i]));
  const sorted = [...entries].sort((a, b) => {
    const ai = prefIndex.has(String(a.edge.type)) ? prefIndex.get(String(a.edge.type))! : 100;
    const bi = prefIndex.has(String(b.edge.type)) ? prefIndex.get(String(b.edge.type))! : 100;
    if (ai !== bi) return ai - bi;
    return a.edge.id.localeCompare(b.edge.id);
  });
  return sorted.slice(0, maxBranch);
}

/**
 * Traverse the graph from a start node, return ranked scored paths.
 */
export function traverseCigGraph(
  snapshot: CigGraphSnapshot,
  options: TraverseOptions,
): TraverseResult {
  const goal = options.goal ?? 'explain_delay';
  const maxDepth = options.maxDepth ?? 6;
  const maxBranch = options.maxBranch ?? 8;
  const maxPaths = options.maxPaths ?? 20;
  const refuseWhenDegraded = options.refuseWhenDegraded ?? false;
  const conflicts = options.conflictNodeIds ?? new Set<string>();

  const nodeById = new Map(snapshot.nodes.map((n) => [n.id, n]));
  const start = nodeById.get(options.startNodeId);

  const empty = (reason: string, degraded: boolean): TraverseResult => ({
    startNodeId: options.startNodeId,
    goal,
    paths: [],
    subgraph: { nodes: start ? [start] : [], edges: [] },
    degraded,
    degradeReason: reason,
    humanReviewRequired: true,
    provenance: {
      kind: 'live_operational_data',
      snapshotVersion: snapshot.meta.snapshotVersion,
      projectorGeneration: snapshot.meta.projectorGeneration,
      pathNodeIds: start ? [start.id] : [],
      pathEdgeIds: [],
    },
  });

  if (!start) {
    return empty('start_node_not_found', true);
  }

  if (conflicts.has(start.id)) {
    return empty('start_node_in_conflict', true);
  }

  if (refuseWhenDegraded && snapshot.degraded) {
    return empty(
      snapshot.degradeReason || 'snapshot_degraded_refuse_paths',
      true,
    );
  }

  const adj = buildAdjacency(snapshot);
  const collected: ScoredPath[] = [];

  type Frame = {
    nodeId: string;
    depth: number;
    pathNodes: CigNode[];
    pathEdges: CigEdge[];
    visited: Set<string>;
  };

  const stack: Frame[] = [
    {
      nodeId: start.id,
      depth: 0,
      pathNodes: [start],
      pathEdges: [],
      visited: new Set([start.id]),
    },
  ];

  while (stack.length > 0 && collected.length < maxPaths * 4) {
    const frame = stack.pop()!;
    if (frame.depth > 0) {
      collected.push(scorePath(frame.pathNodes, frame.pathEdges, goal));
    }
    if (frame.depth >= maxDepth) continue;

    const neighbors = orderBranches(adj.get(frame.nodeId) || [], goal, maxBranch);
    // Push in reverse so preferred expands first (stack)
    for (let i = neighbors.length - 1; i >= 0; i -= 1) {
      const { edge, neighborId } = neighbors[i];
      if (frame.visited.has(neighborId)) continue; // cycle filter
      if (conflicts.has(neighborId)) continue;
      const neighbor = nodeById.get(neighborId);
      if (!neighbor) continue;
      // Skip archived nodes for live explanation
      if (neighbor.archivedAt) continue;

      const nextVisited = new Set(frame.visited);
      nextVisited.add(neighborId);
      stack.push({
        nodeId: neighborId,
        depth: frame.depth + 1,
        pathNodes: [...frame.pathNodes, neighbor],
        pathEdges: [...frame.pathEdges, edge],
        visited: nextVisited,
      });
    }
  }

  const ranked = rankPaths(collected).slice(0, maxPaths);

  // Subgraph = union of nodes/edges on top paths (or start-only)
  const subNodes = new Map<string, CigNode>();
  const subEdges = new Map<string, CigEdge>();
  subNodes.set(start.id, start);
  for (const path of ranked) {
    for (const n of path.nodes) subNodes.set(n.id, n);
    for (const e of path.edges) subEdges.set(e.id, e);
  }

  const topPath = ranked[0];
  return {
    startNodeId: start.id,
    goal,
    paths: ranked,
    subgraph: {
      nodes: [...subNodes.values()],
      edges: [...subEdges.values()],
    },
    degraded: Boolean(snapshot.degraded),
    degradeReason: snapshot.degradeReason,
    humanReviewRequired: true,
    provenance: {
      kind: 'live_operational_data',
      snapshotVersion: snapshot.meta.snapshotVersion,
      projectorGeneration: snapshot.meta.projectorGeneration,
      pathNodeIds: topPath?.nodeIds ?? [start.id],
      pathEdgeIds: topPath?.edgeIds ?? [],
    },
  };
}

/**
 * LLM contract helper: set of edge types present in returned paths.
 * Free-text answers must not invent types outside this set.
 */
export function allowedEdgeTypesFromTraverse(result: TraverseResult): Set<string> {
  const types = new Set<string>();
  for (const path of result.paths) {
    for (const edge of path.edges) types.add(edge.type);
  }
  return types;
}

export function allowedNodeIdsFromTraverse(result: TraverseResult): Set<string> {
  const ids = new Set<string>();
  for (const path of result.paths) {
    for (const id of path.nodeIds) ids.add(id);
  }
  if (result.subgraph.nodes.length) {
    for (const n of result.subgraph.nodes) ids.add(n.id);
  }
  return ids;
}
