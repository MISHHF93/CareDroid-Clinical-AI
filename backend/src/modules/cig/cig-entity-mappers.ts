/**
 * Map pure lib CigNode/CigEdge ↔ TypeORM entities (PR-4).
 * No Nest DI — unit-testable pure functions.
 */

import type { CigEdge, CigGraphSnapshot, CigNode } from '../../../../lib/cig';
import { CigEdgeEntity } from './entities/cig-edge.entity';
import { CigNodeEntity } from './entities/cig-node.entity';
import { CigSnapshotEntity } from './entities/cig-snapshot.entity';

function toDate(iso: string | Date | null | undefined): Date | null {
  if (iso == null) return null;
  if (iso instanceof Date) return iso;
  const d = new Date(iso);
  return Number.isFinite(d.getTime()) ? d : null;
}

function toIso(value: Date | string | null | undefined): string {
  if (value == null) return new Date(0).toISOString();
  if (typeof value === 'string') return value;
  return value.toISOString();
}

export function cigNodeToEntity(node: CigNode): CigNodeEntity {
  const entity = new CigNodeEntity();
  entity.id = node.id;
  entity.tenantId = node.tenantId;
  entity.organizationId = node.organizationId ?? null;
  entity.workspaceId = node.workspaceId ?? null;
  entity.entityType = String(node.entityType);
  entity.sourceId = node.sourceId;
  entity.sourceModule = node.sourceModule;
  entity.label = node.label;
  entity.summary = node.summary ?? null;
  entity.route = node.route ?? null;
  entity.severity = node.severity ?? null;
  entity.stateJson = { ...node.state };
  entity.metadataJson = { ...node.metadata };
  entity.phiClass = node.phiClass;
  entity.durability = node.durability;
  entity.sourceUpdatedAt = toDate(node.sourceUpdatedAt) || new Date();
  entity.version = node.version;
  entity.projectorGeneration = node.projectorGeneration;
  entity.contentHash = node.contentHash ?? null;
  entity.lastGraphVersion = node.lastGraphVersion ?? null;
  entity.archivedAt = toDate(node.archivedAt ?? null);
  entity.createdAt = toDate(node.createdAt) || new Date();
  entity.updatedAt = toDate(node.updatedAt) || new Date();
  entity.auditCursor = node.auditCursor ?? null;
  return entity;
}

export function cigEntityToNode(entity: CigNodeEntity): CigNode {
  return {
    id: entity.id,
    tenantId: entity.tenantId,
    organizationId: entity.organizationId ?? undefined,
    workspaceId: entity.workspaceId ?? undefined,
    entityType: entity.entityType,
    sourceId: entity.sourceId,
    sourceModule: entity.sourceModule,
    label: entity.label,
    summary: entity.summary ?? undefined,
    route: entity.route ?? undefined,
    severity: entity.severity as CigNode['severity'],
    state: {
      humanReviewRequired: false,
      status: 'unknown',
      ...(entity.stateJson as object),
    } as CigNode['state'],
    metadata: (entity.metadataJson || {}) as CigNode['metadata'],
    phiClass: entity.phiClass as CigNode['phiClass'],
    durability: entity.durability as CigNode['durability'],
    sourceUpdatedAt: toIso(entity.sourceUpdatedAt),
    version: entity.version,
    projectorGeneration: entity.projectorGeneration,
    contentHash: entity.contentHash ?? undefined,
    lastGraphVersion: entity.lastGraphVersion == null ? undefined : Number(entity.lastGraphVersion),
    updatedAt: toIso(entity.updatedAt),
    createdAt: toIso(entity.createdAt),
    archivedAt: entity.archivedAt ? toIso(entity.archivedAt) : null,
    auditCursor: entity.auditCursor ?? undefined,
  };
}

export function cigEdgeToEntity(edge: CigEdge): CigEdgeEntity {
  const entity = new CigEdgeEntity();
  entity.id = edge.id;
  entity.tenantId = edge.tenantId;
  entity.type = String(edge.type);
  entity.fromId = edge.fromId;
  entity.toId = edge.toId;
  entity.label = edge.label ?? null;
  entity.weight = edge.weight ?? null;
  entity.confidence = edge.confidence ?? null;
  entity.validFrom = toDate(edge.validFrom) || new Date();
  entity.validTo = toDate(edge.validTo ?? null);
  entity.sourceModule = edge.sourceModule;
  entity.evidenceJson = edge.evidenceRefs ?? null;
  entity.durability = edge.durability;
  entity.metadataJson = edge.metadata ?? null;
  return entity;
}

export function cigEntityToEdge(entity: CigEdgeEntity): CigEdge {
  return {
    id: entity.id,
    tenantId: entity.tenantId,
    type: entity.type,
    fromId: entity.fromId,
    toId: entity.toId,
    label: entity.label ?? undefined,
    weight: entity.weight ?? undefined,
    confidence: entity.confidence ?? undefined,
    validFrom: toIso(entity.validFrom),
    validTo: entity.validTo ? toIso(entity.validTo) : null,
    sourceModule: entity.sourceModule,
    evidenceRefs: entity.evidenceJson ?? undefined,
    durability: entity.durability as CigEdge['durability'],
    metadata: entity.metadataJson ?? undefined,
  };
}

export function cigSnapshotMetaToEntity(
  snapshot: CigGraphSnapshot,
  redisKey?: string | null,
): CigSnapshotEntity {
  const entity = new CigSnapshotEntity();
  entity.tenantId = snapshot.meta.tenantId;
  entity.version = snapshot.meta.snapshotVersion;
  entity.generatedAt = toDate(snapshot.meta.generatedAt) || new Date();
  entity.nodeCount = snapshot.meta.nodeCount;
  entity.edgeCount = snapshot.meta.edgeCount;
  entity.projectorGeneration = snapshot.meta.projectorGeneration;
  entity.durability = snapshot.durability;
  entity.redisKey = redisKey ?? null;
  return entity;
}
