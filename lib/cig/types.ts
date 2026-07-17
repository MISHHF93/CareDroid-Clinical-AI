/**
 * Clinical Intelligence Graph (CIG) — shared type contracts (PR-1).
 *
 * Pure TypeScript only. No window, Zustand, Vite, or Nest DI.
 * @see docs/architecture/clinical-intelligence-graph-design.md
 */

/** Canonical node id: cig:{tenantId}:{entityType}:{sourceId} */
export type CigNodeId = string;

export type CigDurability = 'durable' | 'session' | 'ephemeral';

export type CigPhiClass = 'none' | 'indirect' | 'direct';

export type CigSeverity = 'critical' | 'warning' | 'info' | 'neutral';

export type CigHealth = 'healthy' | 'degraded' | 'critical' | 'unknown';

export type CigEvidenceQuality = 'high' | 'medium' | 'low' | 'unknown';

export type CigPhiMode = 'none' | 'limited' | 'full';

/**
 * Operational node types — extend session KG types; map clinical demo KG separately.
 * Session KG: patient, staff, department, alert, workflow, ai_recommendation,
 * service, queue, room, bed, diagnostic, operational_event.
 */
export type CigEntityType =
  // Clinical ops
  | 'patient'
  | 'encounter'
  | 'note'
  | 'order'
  | 'diagnostic'
  | 'observation'
  | 'medication'
  | 'referral'
  // Space / capacity
  | 'department'
  | 'room'
  | 'bed'
  | 'queue'
  | 'facility'
  // People / EMS
  | 'staff'
  | 'ems_unit'
  | 'ambulance'
  | 'crew'
  // Workflow
  | 'workflow'
  | 'workflow_step'
  | 'task'
  | 'alert'
  | 'notification'
  | 'checklist'
  | 'operational_event'
  // Knowledge
  | 'document'
  | 'policy'
  | 'protocol'
  | 'calculator'
  | 'pathway'
  | 'ai_recommendation'
  | 'ai_agent'
  | 'simulation'
  // Platform
  | 'service'
  | 'integration'
  | 'model';

/** Relationship vocabulary: session KG types + CIG extensions. */
export type CigRelationshipType =
  // From KNOWLEDGE_GRAPH_RELATIONSHIP_TYPES
  | 'assigned_to'
  | 'located_in'
  | 'waiting_in'
  | 'owns'
  | 'affects'
  | 'triggered_by'
  | 'recommends'
  | 'part_of'
  | 'depends_on'
  | 'connected_to'
  | 'escalated_to'
  | 'monitored_by'
  | 'resulted_in'
  // CIG extensions
  | 'transitions_to'
  | 'ordered'
  | 'resulted_from'
  | 'documents'
  | 'cites'
  | 'blocks'
  | 'predicts'
  | 'serves'
  | 'arrives_as';

export type CigNodeState = {
  status: string;
  health?: CigHealth;
  latencyMs?: number | null;
  risk?: number;
  confidence?: number;
  priority?: string | null;
  ownerId?: string | null;
  ownerRole?: string | null;
  timeInStateMs?: number | null;
  predictedNextState?: string | null;
  predictedAt?: string | null;
  blockingIssues?: string[];
  requiredActions?: string[];
  evidenceQuality?: CigEvidenceQuality;
  aiConfidence?: number | null;
  humanReviewRequired: boolean;
  dependencies?: CigNodeId[];
};

export type CigNode = {
  id: CigNodeId;
  tenantId: string;
  organizationId?: string;
  workspaceId?: string;
  entityType: CigEntityType | string;
  sourceId: string;
  sourceModule: string;
  label: string;
  summary?: string;
  route?: string;
  severity?: CigSeverity;
  state: CigNodeState;
  /** Schema-constrained per entityType — unknown keys rejected at project boundary */
  metadata: Record<string, string | number | boolean | null>;
  phiClass: CigPhiClass;
  durability: CigDurability;
  /** C2: SoT mutation time */
  sourceUpdatedAt: string;
  /** C2: per-node content revision (not tenant watermark) */
  version: number;
  /** C2: projector rules build/semver that last wrote this node */
  projectorGeneration: string;
  /** C2: optional hash of projected state for reconciler */
  contentHash?: string;
  /**
   * Optional denorm of last tenant snapshot that included this node.
   * Authoritative tenant watermark remains cig_snapshots.version / API snapshotVersion.
   */
  lastGraphVersion?: number;
  updatedAt: string;
  createdAt: string;
  /** Soft-archive: when set, node is inactive for hot snapshot but retained for replay */
  archivedAt?: string | null;
  auditCursor?: string;
};

/** Tenant snapshot envelope (not a node). */
export type CigTenantSnapshotMeta = {
  tenantId: string;
  snapshotVersion: number;
  generatedAt: string;
  freshnessMs: number;
  projectorGeneration: string;
  nodeCount: number;
  edgeCount: number;
};

export type CigEdge = {
  id: string;
  tenantId: string;
  type: CigRelationshipType | string;
  fromId: CigNodeId;
  toId: CigNodeId;
  label?: string;
  weight?: number;
  confidence?: number;
  validFrom: string;
  /** null = current edge */
  validTo?: string | null;
  sourceModule: string;
  evidenceRefs?: string[];
  durability: CigDurability;
  metadata?: Record<string, string | number | boolean | null>;
};

export type CigGraphSnapshot = {
  layer: typeof import('./constants').CARE_DROID_CIG_LAYER | 'CareDroidClinicalIntelligenceGraph';
  meta: CigTenantSnapshotMeta;
  nodes: readonly CigNode[];
  edges: readonly CigEdge[];
  /** When true, dual-read must fall back to session T2 and set X-CIG-Degraded */
  degraded?: boolean;
  degradeReason?: string;
  durability: CigDurability;
};

/** Page / role lens over the same graph (product insight: pages as filters). */
export type CigViewFilter = {
  viewId: string;
  entityTypes?: readonly (CigEntityType | string)[];
  relationshipTypes?: readonly (CigRelationshipType | string)[];
  severityMin?: CigSeverity;
  phiMode: CigPhiMode;
  includeArchived?: boolean;
  maxHops?: number;
  rootNodeIds?: readonly CigNodeId[];
  search?: string;
};

export type CigProducerClass = 'be_emitted' | 'fe_session' | 'unavailable_for_t1';

export type CigDomainEvent = {
  name: string;
  version: number;
  eventId: string;
  tenantId: string;
  organizationId?: string;
  workspaceId?: string;
  occurredAt: string;
  receivedAt: string;
  producer: string;
  durability: CigDurability;
  piiClassification: CigPhiClass;
  authz: { requiredPermissions: readonly string[] };
  /** Validated per event schema; no freeform PHI keys outside allow-list */
  payload: Record<string, unknown>;
  correlationId?: string;
  causationId?: string;
};

export type CigEventCatalogueEntry = {
  name: string;
  version: number;
  producerClass: CigProducerClass;
  producer: string;
  consumers: readonly string[];
  durabilityDefault: CigDurability;
  piiClassification: CigPhiClass;
  authz: { requiredPermissions: readonly string[] };
  /** Short description of payload shape (Stage F; full JSON Schema later) */
  payloadSummary: string;
  notes?: string;
};

/** Allow-listed metadata keys for service / integration nodes (no PHI). */
export const CIG_SERVICE_METADATA_ALLOWLIST = Object.freeze([
  'status',
  'errorRate',
  'latencyMs',
  'version',
  'lastUpdate',
  'dependencyCount',
  'availability',
] as const);

export type CigServiceMetadataKey = (typeof CIG_SERVICE_METADATA_ALLOWLIST)[number];
