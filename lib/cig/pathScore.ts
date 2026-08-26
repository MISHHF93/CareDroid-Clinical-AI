/**
 * Deterministic CIG path scoring v1 (K16) — product-owned coefficients.
 * @see docs/architecture/clinical-intelligence-graph-design.md
 */

import type { CigEdge, CigNode, CigRelationshipType, CigSeverity } from './types';

export type CigTraverseGoal = 'explain_delay' | 'find_owner' | 'blocking_issues';

/** Edge type priors W_type (v1). */
export const CIG_EDGE_TYPE_WEIGHTS: Readonly<Record<string, number>> = Object.freeze({
  blocks: 1.0,
  affects: 0.85,
  waiting_in: 0.7,
  depends_on: 0.65,
  part_of: 0.55,
  ordered: 0.55,
  assigned_to: 0.45,
  located_in: 0.4,
  recommends: 0.35,
  cites: 0.35,
  connected_to: 0.25,
  triggered_by: 0.25,
  escalated_to: 0.4,
  monitored_by: 0.3,
  resulted_in: 0.3,
  resulted_from: 0.3,
  documents: 0.25,
  transitions_to: 0.35,
  predicts: 0.3,
  serves: 0.3,
  arrives_as: 0.35,
  owns: 0.35,
});

const DEFAULT_EDGE_WEIGHT = 0.2;

export function edgeTypeWeight(type: string): number {
  return CIG_EDGE_TYPE_WEIGHTS[type] ?? DEFAULT_EDGE_WEIGHT;
}

function severityRank(severity: CigSeverity | undefined): number {
  if (severity === 'critical') return 3;
  if (severity === 'warning') return 2;
  if (severity === 'info') return 1;
  return 0;
}

/**
 * Node status bonuses B_node (sum, capped 1.0).
 */
export function nodeStatusBonus(node: CigNode): number {
  let bonus = 0;
  if (node.severity === 'critical') bonus += 0.35;
  else if (node.severity === 'warning') bonus += 0.2;

  const health = node.state.health;
  if (health === 'degraded' || health === 'critical') bonus += 0.3;

  if (node.metadata?.breached === true) bonus += 0.25;

  const timeInState = node.state.timeInStateMs;
  // Without per-state targets, treat > 90 minutes as elevated dwell
  if (typeof timeInState === 'number' && timeInState > 90 * 60 * 1000) {
    bonus += 0.2;
  }

  if ((node.state.blockingIssues?.length ?? 0) > 0) bonus += 0.15;

  const conf = node.state.aiConfidence ?? node.state.confidence;
  if (node.state.predictedNextState && typeof conf === 'number') {
    bonus += 0.1 * Math.min(1, Math.max(0, conf));
  }

  return Math.min(1, bonus);
}

export type ScoredPath = {
  nodeIds: string[];
  edgeIds: string[];
  edges: CigEdge[];
  nodes: CigNode[];
  score: number;
  hopCount: number;
  blocksCount: number;
  maxSeverityRank: number;
  pathId: string;
};

function goalEdgeMultiplier(goal: CigTraverseGoal, type: string): number {
  if (goal === 'explain_delay') {
    if (type === 'blocks' || type === 'affects' || type === 'waiting_in') return 1.15;
    return 1;
  }
  if (goal === 'find_owner') {
    if (type === 'assigned_to' || type === 'escalated_to' || type === 'owns') return 1.25;
    return 0.85;
  }
  if (goal === 'blocking_issues') {
    if (type === 'blocks') return 1.3;
    if (type === 'affects') return 1.1;
    return 0.5;
  }
  return 1;
}

/**
 * Score a path for a traversal goal. Higher = better explanation.
 *
 * score =
 *   Σ_edges ( W_type(e) * (e.weight ?? 1) * goalMultiplier )
 *   + Σ_nodes B_node(n)
 *   - 0.05 * hopCount
 *   - 0.10 * (1 - min edge confidence along path if any confidence set)
 */
export function scorePath(
  nodes: readonly CigNode[],
  edges: readonly CigEdge[],
  goal: CigTraverseGoal = 'explain_delay',
): ScoredPath {
  const hopCount = edges.length;
  let edgeScore = 0;
  let blocksCount = 0;
  let minConfidence: number | null = null;

  for (const edge of edges) {
    const wType = edgeTypeWeight(edge.type);
    const wEdge = edge.weight ?? 1;
    edgeScore += wType * wEdge * goalEdgeMultiplier(goal, edge.type);
    if (edge.type === 'blocks') blocksCount += 1;
    if (typeof edge.confidence === 'number') {
      minConfidence =
        minConfidence == null
          ? edge.confidence
          : Math.min(minConfidence, edge.confidence);
    }
  }

  let nodeScore = 0;
  let maxSeverityRank = 0;
  for (const node of nodes) {
    nodeScore += nodeStatusBonus(node);
    maxSeverityRank = Math.max(maxSeverityRank, severityRank(node.severity));
  }

  let confidencePenalty = 0;
  if (minConfidence != null) {
    confidencePenalty = 0.1 * (1 - Math.min(1, Math.max(0, minConfidence)));
  }

  const score = edgeScore + nodeScore - 0.05 * hopCount - confidencePenalty;
  const nodeIds = nodes.map((n) => n.id);
  const edgeIds = edges.map((e) => e.id);
  const pathId = `${nodeIds.join('>')}|${edgeIds.join(',')}`;

  return {
    nodeIds,
    edgeIds,
    edges: [...edges],
    nodes: [...nodes],
    score,
    hopCount,
    blocksCount,
    maxSeverityRank,
    pathId,
  };
}

/**
 * Rank paths: score desc; tie-break blocksCount, maxSeverity, pathId.
 */
export function rankPaths(paths: readonly ScoredPath[]): ScoredPath[] {
  return [...paths].sort((a, b) => {
    if (b.score !== a.score) return b.score - a.score;
    if (b.blocksCount !== a.blocksCount) return b.blocksCount - a.blocksCount;
    if (b.maxSeverityRank !== a.maxSeverityRank) {
      return b.maxSeverityRank - a.maxSeverityRank;
    }
    return a.pathId.localeCompare(b.pathId);
  });
}

/** Preferred relationship types per goal (soft filter for branch expansion order). */
export function preferredEdgeTypesForGoal(goal: CigTraverseGoal): readonly CigRelationshipType[] {
  if (goal === 'find_owner') {
    return ['assigned_to', 'escalated_to', 'owns', 'monitored_by'];
  }
  if (goal === 'blocking_issues') {
    return ['blocks', 'affects', 'depends_on'];
  }
  // explain_delay
  return [
    'blocks',
    'affects',
    'waiting_in',
    'depends_on',
    'part_of',
    'assigned_to',
    'located_in',
    'recommends',
  ];
}
