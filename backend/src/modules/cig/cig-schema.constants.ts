/** Physical table names for Clinical Intelligence Graph (PR-4). */
export const CIG_TABLES = Object.freeze({
  nodes: 'cig_nodes',
  edges: 'cig_edges',
  events: 'cig_events',
  outbox: 'cig_outbox',
  snapshots: 'cig_snapshots',
});

/** Redis key prefixes (hot adjacency / snapshots) — used by later PRs. */
export const CIG_REDIS_KEY_PREFIXES = Object.freeze({
  snapshot: 'cig:snap:',
  adjacency: 'cig:adj:',
});

export function cigSnapshotRedisKey(tenantId: string, version: number | string): string {
  return `${CIG_REDIS_KEY_PREFIXES.snapshot}${tenantId}:${version}`;
}

export function cigAdjacencyRedisKey(tenantId: string): string {
  return `${CIG_REDIS_KEY_PREFIXES.adjacency}${tenantId}`;
}
