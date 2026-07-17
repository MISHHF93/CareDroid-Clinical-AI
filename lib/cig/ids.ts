/**
 * CIG and session KG identifier helpers.
 *
 * Canonical CIG: cig:{tenantId}:{entityType}:{sourceId}
 * Session KG alias: kg:{entityType}:{sourceId}
 */

const CIG_PREFIX = 'cig:';
const KG_PREFIX = 'kg:';

function sanitizeSegment(value: string): string {
  return String(value ?? '')
    .trim()
    .replace(/:/g, '_')
    .replace(/\s+/g, '_');
}

/**
 * Build a multi-tenant CIG node id.
 * @example makeCigNodeId('org-1', 'patient', 'p-42') => 'cig:org-1:patient:p-42'
 */
export function makeCigNodeId(
  tenantId: string,
  entityType: string,
  sourceId: string,
): string {
  const t = sanitizeSegment(tenantId);
  const e = sanitizeSegment(entityType);
  const s = sanitizeSegment(sourceId);
  if (!t || !e || !s) {
    throw new Error('makeCigNodeId requires non-empty tenantId, entityType, and sourceId');
  }
  return `${CIG_PREFIX}${t}:${e}:${s}`;
}

/**
 * Build a session knowledge-graph node id (existing FE convention).
 * @example makeKgNodeId('patient', 'p-42') => 'kg:patient:p-42'
 */
export function makeKgNodeId(entityType: string, sourceId: string): string {
  const e = sanitizeSegment(entityType);
  const s = sanitizeSegment(sourceId);
  if (!e || !s) {
    throw new Error('makeKgNodeId requires non-empty entityType and sourceId');
  }
  return `${KG_PREFIX}${e}:${s}`;
}

export type ParsedCigNodeId = {
  kind: 'cig';
  tenantId: string;
  entityType: string;
  sourceId: string;
};

export type ParsedKgNodeId = {
  kind: 'kg';
  entityType: string;
  sourceId: string;
};

export type ParsedGraphNodeId = ParsedCigNodeId | ParsedKgNodeId;

/**
 * Parse cig: or kg: ids. Returns null if the format is invalid.
 * Note: sourceId may contain colons after sanitization reverse is lossy for
 * original colons (they become underscores at build time).
 */
export function parseGraphNodeId(id: string): ParsedGraphNodeId | null {
  if (typeof id !== 'string' || !id) return null;

  if (id.startsWith(CIG_PREFIX)) {
    const rest = id.slice(CIG_PREFIX.length);
    const parts = rest.split(':');
    if (parts.length < 3) return null;
    const [tenantId, entityType, ...sourceParts] = parts;
    const sourceId = sourceParts.join(':');
    if (!tenantId || !entityType || !sourceId) return null;
    return { kind: 'cig', tenantId, entityType, sourceId };
  }

  if (id.startsWith(KG_PREFIX)) {
    const rest = id.slice(KG_PREFIX.length);
    const parts = rest.split(':');
    if (parts.length < 2) return null;
    const [entityType, ...sourceParts] = parts;
    const sourceId = sourceParts.join(':');
    if (!entityType || !sourceId) return null;
    return { kind: 'kg', entityType, sourceId };
  }

  return null;
}

/**
 * Map a session kg: id into a tenant-scoped cig: id (alias bridge for dual-read).
 */
export function kgIdToCigId(kgId: string, tenantId: string): string {
  const parsed = parseGraphNodeId(kgId);
  if (!parsed || parsed.kind !== 'kg') {
    throw new Error(`kgIdToCigId expects kg: id, got: ${kgId}`);
  }
  return makeCigNodeId(tenantId, parsed.entityType, parsed.sourceId);
}

/**
 * Map a cig: id to session kg: form (drops tenant). Used only for T2 alias lookups.
 */
export function cigIdToKgId(cigId: string): string {
  const parsed = parseGraphNodeId(cigId);
  if (!parsed || parsed.kind !== 'cig') {
    throw new Error(`cigIdToKgId expects cig: id, got: ${cigId}`);
  }
  return makeKgNodeId(parsed.entityType, parsed.sourceId);
}

export function isCigNodeId(id: string): boolean {
  return parseGraphNodeId(id)?.kind === 'cig';
}

export function isKgNodeId(id: string): boolean {
  return parseGraphNodeId(id)?.kind === 'kg';
}

/**
 * Build a stable edge id for a current (open-ended) relationship.
 * Format: cig-edge:{tenantId}:{type}:{fromId}:{toId}
 */
export function makeCigEdgeId(
  tenantId: string,
  type: string,
  fromId: string,
  toId: string,
): string {
  const t = sanitizeSegment(tenantId);
  const rel = sanitizeSegment(type);
  if (!t || !rel || !fromId || !toId) {
    throw new Error('makeCigEdgeId requires tenantId, type, fromId, and toId');
  }
  return `cig-edge:${t}:${rel}:${fromId}:${toId}`;
}

/** Synthetic simulation tenant id (K21). */
export function makeSimulationTenantId(scenarioId: string): string {
  const s = sanitizeSegment(scenarioId);
  if (!s) throw new Error('makeSimulationTenantId requires scenarioId');
  return `cig-sim:${s}`;
}

export function isSimulationTenantId(tenantId: string): boolean {
  return typeof tenantId === 'string' && tenantId.startsWith('cig-sim:');
}
