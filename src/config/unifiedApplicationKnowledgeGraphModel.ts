/**
 * Unified application knowledge graph model — connects patients, staff, departments,
 * alerts, workflows, AI recommendations, services, queues, rooms, beds, diagnostics,
 * and operational events without duplicating underlying entity records.
 */
import { OPERATIONAL_INTELLIGENCE_DISCLAIMERS } from '../operational-intelligence/operationalIntelligence.types';

export type KnowledgeGraphEntityType =
  | 'patient'
  | 'staff'
  | 'department'
  | 'alert'
  | 'workflow'
  | 'ai_recommendation'
  | 'service'
  | 'queue'
  | 'room'
  | 'bed'
  | 'diagnostic'
  | 'operational_event';

export type KnowledgeGraphRelationshipType =
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
  | 'resulted_in';

export type KnowledgeGraphNode = Readonly<{
  /** Canonical graph node id: kg:{entityType}:{sourceId} */
  id: string;
  entityType: KnowledgeGraphEntityType;
  /** Id in the originating module (patient.id, alert.id, etc.) */
  sourceId: string;
  label: string;
  summary?: string;
  route?: string;
  severity?: 'critical' | 'warning' | 'info' | 'neutral';
  /** Module that owns the underlying record — no duplicated payload */
  sourceModule: string;
  metadata?: Readonly<Record<string, string | number | boolean | null>>;
}>;

export type KnowledgeGraphEdge = Readonly<{
  id: string;
  type: KnowledgeGraphRelationshipType;
  fromId: string;
  toId: string;
  label?: string;
  weight?: number;
  sourceModule: string;
}>;

export type UnifiedApplicationKnowledgeGraphSnapshot = Readonly<{
  engineId: 'unified-application-knowledge-graph';
  generatedAt: string;
  nodes: readonly KnowledgeGraphNode[];
  edges: readonly KnowledgeGraphEdge[];
  metrics: Readonly<{
    nodeCount: number;
    edgeCount: number;
    patients: number;
    staff: number;
    departments: number;
    activeAlerts: number;
    openWorkflows: number;
    aiRecommendations: number;
    connectedServices: number;
    occupiedBeds: number;
  }>;
  /** patient sourceId → connected graph node ids */
  patientIndex: Readonly<Record<string, readonly string[]>>;
  safetyStatement: string;
}>;

export type KnowledgeGraphEntityDefinition = Readonly<{
  entityType: KnowledgeGraphEntityType;
  label: string;
  description: string;
  sourceModules: readonly string[];
  relationshipTypes: readonly KnowledgeGraphRelationshipType[];
}>;

export const KNOWLEDGE_GRAPH_ENTITY_TYPES: readonly KnowledgeGraphEntityType[] = Object.freeze([
  'patient',
  'staff',
  'department',
  'alert',
  'workflow',
  'ai_recommendation',
  'service',
  'queue',
  'room',
  'bed',
  'diagnostic',
  'operational_event',
]);

export const KNOWLEDGE_GRAPH_RELATIONSHIP_TYPES: readonly KnowledgeGraphRelationshipType[] = Object.freeze([
  'assigned_to',
  'located_in',
  'waiting_in',
  'owns',
  'affects',
  'triggered_by',
  'recommends',
  'part_of',
  'depends_on',
  'connected_to',
  'escalated_to',
  'monitored_by',
  'resulted_in',
]);

export const KNOWLEDGE_GRAPH_ENTITIES: readonly KnowledgeGraphEntityDefinition[] = Object.freeze([
  Object.freeze({
    entityType: 'patient',
    label: 'Patient',
    description: 'Active ED patients — references emergencyStore.patients records.',
    sourceModules: ['emergencyStore.patients'],
    relationshipTypes: ['assigned_to', 'located_in', 'waiting_in', 'part_of', 'affects'],
  }),
  Object.freeze({
    entityType: 'staff',
    label: 'Staff',
    description: 'On-shift clinicians and coordinators — references emergencyStore.staff.',
    sourceModules: ['emergencyStore.staff'],
    relationshipTypes: ['assigned_to', 'owns', 'monitored_by', 'escalated_to'],
  }),
  Object.freeze({
    entityType: 'department',
    label: 'Department',
    description: 'Hospital departments from hospitalOperatingSystemModel.',
    sourceModules: ['hospitalOperatingSystemModel'],
    relationshipTypes: ['part_of', 'owns', 'affects'],
  }),
  Object.freeze({
    entityType: 'alert',
    label: 'Alert',
    description: 'Operational and clinical alerts — references emergencyStore.alerts.',
    sourceModules: ['emergencyStore.alerts', 'alertLifecycleOrchestrator'],
    relationshipTypes: ['affects', 'triggered_by', 'escalated_to'],
  }),
  Object.freeze({
    entityType: 'workflow',
    label: 'Workflow',
    description: 'Automation tasks and workflow action logs.',
    sourceModules: ['emergencyStore.workflowLogs', 'administrativeAutomationQueue'],
    relationshipTypes: ['part_of', 'triggered_by', 'connected_to'],
  }),
  Object.freeze({
    entityType: 'ai_recommendation',
    label: 'AI recommendation',
    description: 'AI Chief and operational intelligence interventions.',
    sourceModules: ['aiChiefOrchestrator', 'unifiedOperationalIntelligence'],
    relationshipTypes: ['recommends', 'affects'],
  }),
  Object.freeze({
    entityType: 'service',
    label: 'Service',
    description: 'Backend and SaaS service health from bottleneckRegistry.',
    sourceModules: ['bottleneckRegistry'],
    relationshipTypes: ['depends_on', 'affects', 'monitored_by'],
  }),
  Object.freeze({
    entityType: 'queue',
    label: 'Queue',
    description: 'ED queue summaries from emergencyStore.queues.',
    sourceModules: ['emergencyStore.queues'],
    relationshipTypes: ['waiting_in', 'affects'],
  }),
  Object.freeze({
    entityType: 'room',
    label: 'Room',
    description: 'Treatment and observation rooms from emergencyStore.rooms.',
    sourceModules: ['emergencyStore.rooms'],
    relationshipTypes: ['located_in'],
  }),
  Object.freeze({
    entityType: 'bed',
    label: 'Bed',
    description: 'Occupied bed capacity derived from room occupancy.',
    sourceModules: ['emergencyStore.rooms', 'capacityEngine'],
    relationshipTypes: ['located_in', 'part_of'],
  }),
  Object.freeze({
    entityType: 'diagnostic',
    label: 'Diagnostic',
    description: 'Orders, results, and clinical scores tied to patients.',
    sourceModules: ['emergencyStore.patients', 'workflowLogs'],
    relationshipTypes: ['part_of', 'resulted_in'],
  }),
  Object.freeze({
    entityType: 'operational_event',
    label: 'Operational event',
    description: 'Workflow logs and backend realtime events.',
    sourceModules: ['emergencyStore.workflowLogs', 'websocket'],
    relationshipTypes: ['triggered_by', 'connected_to', 'resulted_in'],
  }),
]);

export const UNIFIED_APPLICATION_KNOWLEDGE_GRAPH_SAFETY = Object.freeze({
  statement: OPERATIONAL_INTELLIGENCE_DISCLAIMERS.operational,
  humanReviewRequired: true as const,
  advisoryOnly: true as const,
  referencesExistingRecords: true as const,
});

export const UNIFIED_APPLICATION_KNOWLEDGE_GRAPH_CONTRACT = Object.freeze({
  engineId: 'unified-application-knowledge-graph',
  entityTypeCount: KNOWLEDGE_GRAPH_ENTITY_TYPES.length,
  relationshipTypeCount: KNOWLEDGE_GRAPH_RELATIONSHIP_TYPES.length,
  safety: UNIFIED_APPLICATION_KNOWLEDGE_GRAPH_SAFETY,
  referencesExistingRecords: true,
  humanOversightRequired: true,
});

export function knowledgeGraphNodeId(
  entityType: KnowledgeGraphEntityType,
  sourceId: string,
): string {
  return `kg:${entityType}:${sourceId}`;
}

export function parseKnowledgeGraphNodeId(nodeId: string): {
  entityType: KnowledgeGraphEntityType;
  sourceId: string;
} | null {
  const match = /^kg:([^:]+):(.+)$/.exec(nodeId);
  if (!match) return null;
  const entityType = match[1] as KnowledgeGraphEntityType;
  if (!(KNOWLEDGE_GRAPH_ENTITY_TYPES as readonly string[]).includes(entityType)) return null;
  return { entityType, sourceId: match[2] };
}

export function listKnowledgeGraphEntities(): readonly KnowledgeGraphEntityDefinition[] {
  return KNOWLEDGE_GRAPH_ENTITIES;
}