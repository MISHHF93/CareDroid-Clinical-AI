/**
 * Stage F event catalogue for Clinical Intelligence Graph.
 *
 * Producers are classified honestly:
 * - be_emitted: Nest (or BE path) can emit now or near-term
 * - fe_session: FE store/engines only until promoted — durability: session
 * - unavailable_for_t1: not wired for multi-user twin yet
 *
 * @see docs/architecture/architect-mode/event-catalogue.md
 * @see docs/architecture/clinical-intelligence-graph-design.md
 */

import type { CigEventCatalogueEntry } from '../types';

export const CIG_EVENT_CATALOGUE_VERSION = '1.0.0-stage-f-contracts';

/**
 * Canonical Stage F catalogue entries used by CIG projectors and dual-read labels.
 * Payload schemas are summarized; full JSON Schema validation lands with Nest ingest.
 */
export const CIG_EVENT_CATALOGUE: readonly CigEventCatalogueEntry[] = Object.freeze([
  // —— BE-emitted / near-term Nest ——
  Object.freeze({
    name: 'patient.created',
    version: 1,
    producerClass: 'be_emitted' as const,
    producer: 'EmergencyPatientService | emergencyStore',
    consumers: ['cig-projector', 'queues', 'kpis', 'audit'],
    durabilityDefault: 'session' as const,
    piiClassification: 'direct' as const,
    authz: { requiredPermissions: Object.freeze(['WRITE_PHI', 'READ_PHI']) },
    payloadSummary: '{ patientId, state, acuity?, roomId?, queueId? }',
    notes:
      'BE path Mode B session until durable read cutover (K13). FE store path is also session.',
  }),
  Object.freeze({
    name: 'patient.updated',
    version: 1,
    producerClass: 'be_emitted' as const,
    producer: 'EmergencyPatientService | emergencyStore',
    consumers: ['cig-projector', 'whiteboard', 'cards'],
    durabilityDefault: 'session' as const,
    piiClassification: 'direct' as const,
    authz: { requiredPermissions: Object.freeze(['WRITE_PHI', 'READ_PHI']) },
    payloadSummary: '{ patientId, fields[], sourceUpdatedAt }',
  }),
  Object.freeze({
    name: 'patient.state.changed',
    version: 1,
    producerClass: 'be_emitted' as const,
    producer: 'EmergencyPatientService | journeyEngine',
    consumers: ['cig-projector', 'workflow', 'kpis'],
    durabilityDefault: 'session' as const,
    piiClassification: 'direct' as const,
    authz: { requiredPermissions: Object.freeze(['WRITE_PHI', 'READ_PHI']) },
    payloadSummary: '{ patientId, fromState, toState, transitionAt }',
  }),
  Object.freeze({
    name: 'patient.assigned',
    version: 1,
    producerClass: 'be_emitted' as const,
    producer: 'EmergencyPatientService | room/staff assign',
    consumers: ['cig-projector', 'whiteboard'],
    durabilityDefault: 'session' as const,
    piiClassification: 'direct' as const,
    authz: { requiredPermissions: Object.freeze(['WRITE_PHI', 'READ_PHI']) },
    payloadSummary: '{ patientId, roomId?, staffId?, role? }',
  }),
  Object.freeze({
    name: 'alert.clinical.raised',
    version: 1,
    producerClass: 'be_emitted' as const,
    producer: 'clinical-alerts | flags | Nest alerts',
    consumers: ['cig-projector', 'alarm-dock'],
    durabilityDefault: 'session' as const,
    piiClassification: 'direct' as const,
    authz: { requiredPermissions: Object.freeze(['READ_PHI']) },
    payloadSummary: '{ alertId, severity, patientId?, kind }',
  }),
  Object.freeze({
    name: 'operational_intelligence_updated',
    version: 1,
    producerClass: 'be_emitted' as const,
    producer: 'CareDroidOperationalIntelligence Nest service',
    consumers: ['cig-projector', 'OI consumers'],
    durabilityDefault: 'session' as const,
    piiClassification: 'indirect' as const,
    authz: { requiredPermissions: Object.freeze(['VIEW_ANALYTICS']) },
    payloadSummary: '{ tenantId, generatedAt, mode, featureVector summary }',
  }),
  Object.freeze({
    name: 'bottleneck_detected',
    version: 1,
    producerClass: 'be_emitted' as const,
    producer: 'OI Nest publish | bottleneckRegistry',
    consumers: ['cig-projector', 'capacity boards'],
    durabilityDefault: 'session' as const,
    piiClassification: 'indirect' as const,
    authz: { requiredPermissions: Object.freeze(['VIEW_ANALYTICS']) },
    payloadSummary: '{ bottleneckId, location, severity, patientCount? }',
  }),
  Object.freeze({
    name: 'whiteboard_snapshot',
    version: 1,
    producerClass: 'be_emitted' as const,
    producer: 'EmergencyRealtimeService',
    consumers: ['SPA realtime', 'cig-projector (optional)'],
    durabilityDefault: 'session' as const,
    piiClassification: 'direct' as const,
    authz: { requiredPermissions: Object.freeze(['READ_PHI']) },
    payloadSummary: '{ snapshotVersion, generatedAt, patientIds[] }',
    notes: 'Snapshot transport; not a full graph event stream.',
  }),
  Object.freeze({
    name: 'central_node_snapshot',
    version: 1,
    producerClass: 'be_emitted' as const,
    producer: 'CareDroidCentralNodeService',
    consumers: ['OI', 'cig-projector'],
    durabilityDefault: 'session' as const,
    piiClassification: 'indirect' as const,
    authz: { requiredPermissions: Object.freeze(['VIEW_ANALYTICS']) },
    payloadSummary: '{ generatedAt, activePatients, waitingPatients, capacityStatus }',
  }),
  Object.freeze({
    name: 'audit.phi.access',
    version: 1,
    producerClass: 'be_emitted' as const,
    producer: 'audit interceptors',
    consumers: ['compliance', 'audit log'],
    durabilityDefault: 'durable' as const,
    piiClassification: 'direct' as const,
    authz: { requiredPermissions: Object.freeze(['VIEW_AUDIT_LOGS']) },
    payloadSummary: '{ actorId, resourceType, resourceId, action }',
    notes: 'Durable audit — not projected as board graph topology.',
  }),
  Object.freeze({
    name: 'workflow.action.logged',
    version: 1,
    producerClass: 'be_emitted' as const,
    producer: 'WorkflowActionLogService | emergencyStore',
    consumers: ['living docs', 'cig-projector'],
    durabilityDefault: 'session' as const,
    piiClassification: 'direct' as const,
    authz: { requiredPermissions: Object.freeze(['READ_PHI']) },
    payloadSummary: '{ actionId, patientId?, actionType, at }',
    notes: 'Claim durable only if Nest path persists; store-only remains session.',
  }),
  Object.freeze({
    name: 'ems.arrival.registered',
    version: 1,
    producerClass: 'be_emitted' as const,
    producer: 'EMS routes / Nest EMS',
    consumers: ['EMSPipeline', 'reception', 'cig-projector'],
    durabilityDefault: 'session' as const,
    piiClassification: 'direct' as const,
    authz: { requiredPermissions: Object.freeze(['READ_PHI']) },
    payloadSummary: '{ unitId, eta?, condition?, status }',
  }),
  Object.freeze({
    name: 'ems.handoff.completed',
    version: 1,
    producerClass: 'be_emitted' as const,
    producer: 'handoff services',
    consumers: ['copilot', 'nursing', 'cig-projector'],
    durabilityDefault: 'session' as const,
    piiClassification: 'direct' as const,
    authz: { requiredPermissions: Object.freeze(['WRITE_PHI', 'READ_PHI']) },
    payloadSummary: '{ unitId, patientId?, handoffAt }',
  }),
  Object.freeze({
    name: 'rag.query.completed',
    version: 1,
    producerClass: 'be_emitted' as const,
    producer: 'rag.service',
    consumers: ['metrics', 'optional cig document edges'],
    durabilityDefault: 'session' as const,
    piiClassification: 'indirect' as const,
    authz: { requiredPermissions: Object.freeze(['READ_PHI']) },
    payloadSummary: '{ queryId, organizationId, topK, latencyMs }',
  }),
  Object.freeze({
    name: 'auth.login',
    version: 1,
    producerClass: 'be_emitted' as const,
    producer: 'auth.service',
    consumers: ['session', 'audit'],
    durabilityDefault: 'durable' as const,
    piiClassification: 'none' as const,
    authz: { requiredPermissions: Object.freeze([]) },
    payloadSummary: '{ userId, at }',
    notes: 'Not a board graph event; catalogue completeness only.',
  }),
  Object.freeze({
    name: 'cig.graph.updated',
    version: 1,
    producerClass: 'be_emitted' as const,
    producer: 'CigProjectionFacade',
    consumers: ['SPA dual-read', 'SSE/WS subscribers'],
    durabilityDefault: 'session' as const,
    piiClassification: 'none' as const,
    authz: { requiredPermissions: Object.freeze(['VIEW_ANALYTICS']) },
    payloadSummary: '{ tenantId, snapshotVersion, projectorGeneration, nodeIds? }',
    notes:
      'Version-bump notification; non-READ_PHI subscribers get version only (no PHI payload).',
  }),

  // —— FE-session until promoted ——
  Object.freeze({
    name: 'patient.queue.moved',
    version: 1,
    producerClass: 'fe_session' as const,
    producer: 'queueAssignment / emergencyStore',
    consumers: ['reception/triage queues', 'T2 KG'],
    durabilityDefault: 'session' as const,
    piiClassification: 'direct' as const,
    authz: { requiredPermissions: Object.freeze(['WRITE_PHI', 'READ_PHI']) },
    payloadSummary: '{ patientId, fromQueue, toQueue }',
    notes: 'Exclude multi-user twin badge until Nest funnel (PR-5d) + cutover.',
  }),
  Object.freeze({
    name: 'reassessment.due',
    version: 1,
    producerClass: 'fe_session' as const,
    producer: 'reassessmentEngine',
    consumers: ['drawer', 'flags', 'T2 KG'],
    durabilityDefault: 'session' as const,
    piiClassification: 'direct' as const,
    authz: { requiredPermissions: Object.freeze(['READ_PHI']) },
    payloadSummary: '{ patientId, dueAt, acuity }',
    notes: 'Session timers; not multi-user T1.',
  }),
  Object.freeze({
    name: 'capacity.changed',
    version: 1,
    producerClass: 'fe_session' as const,
    producer: 'capacityEngine | capacity API',
    consumers: ['crisis mode', 'boards', 'T2 KG'],
    durabilityDefault: 'session' as const,
    piiClassification: 'indirect' as const,
    authz: { requiredPermissions: Object.freeze(['VIEW_ANALYTICS']) },
    payloadSummary: '{ score, band, generatedAt }',
    notes: 'High-chatter; coalesce on ingest. Session unless API snapshot overwrites.',
  }),
  Object.freeze({
    name: 'ems.arrival.converted',
    version: 1,
    producerClass: 'fe_session' as const,
    producer: 'convertEmsArrivalForReception',
    consumers: ['registration queue', 'T2 KG'],
    durabilityDefault: 'session' as const,
    piiClassification: 'direct' as const,
    authz: { requiredPermissions: Object.freeze(['WRITE_PHI', 'READ_PHI']) },
    payloadSummary: '{ unitId, patientId }',
    notes: 'Mixed FE + optional API; treat as session until BE path confirmed.',
  }),
  Object.freeze({
    name: 'intake.verified',
    version: 1,
    producerClass: 'fe_session' as const,
    producer: 'reception verify',
    consumers: ['pretriage queue'],
    durabilityDefault: 'session' as const,
    piiClassification: 'direct' as const,
    authz: { requiredPermissions: Object.freeze(['WRITE_PHI', 'READ_PHI']) },
    payloadSummary: '{ patientId, verifiedAt }',
  }),
  Object.freeze({
    name: 'intake.escalated',
    version: 1,
    producerClass: 'fe_session' as const,
    producer: 'receptionEscalationWorkflow',
    consumers: ['alerts', 'charge'],
    durabilityDefault: 'session' as const,
    piiClassification: 'direct' as const,
    authz: { requiredPermissions: Object.freeze(['WRITE_PHI', 'READ_PHI']) },
    payloadSummary: '{ patientId, reason, severity }',
  }),
  Object.freeze({
    name: 'copilot.recommendation',
    version: 1,
    producerClass: 'fe_session' as const,
    producer: 'copilot / AI gateway',
    consumers: ['CopilotPanel', 'optional ai_recommendation nodes'],
    durabilityDefault: 'session' as const,
    piiClassification: 'direct' as const,
    authz: { requiredPermissions: Object.freeze(['READ_PHI']) },
    payloadSummary: '{ recommendationId, patientId?, confidence, humanReviewRequired }',
  }),

  // —— Not available for T1 until wired ——
  Object.freeze({
    name: 'fhir.observation.streamed',
    version: 1,
    producerClass: 'unavailable_for_t1' as const,
    producer: 'FHIR integration (partial)',
    consumers: ['future cig observation nodes'],
    durabilityDefault: 'session' as const,
    piiClassification: 'direct' as const,
    authz: { requiredPermissions: Object.freeze(['READ_PHI']) },
    payloadSummary: '{ observationId, patientId, code, value }',
    notes: 'Interoperability normalized events partial — not T1 eligible.',
  }),
  Object.freeze({
    name: 'reassessment.scheduler.tick',
    version: 1,
    producerClass: 'unavailable_for_t1' as const,
    producer: 'Mongoose-backed cron (when enabled)',
    consumers: ['reassessment'],
    durabilityDefault: 'session' as const,
    piiClassification: 'direct' as const,
    authz: { requiredPermissions: Object.freeze(['READ_PHI']) },
    payloadSummary: '{ duePatientIds[] }',
    notes: 'Durable scheduler only when Mongoose emergency-os flag on.',
  }),
]);

const byName = new Map(CIG_EVENT_CATALOGUE.map((e) => [e.name, e]));

export function getCigEventCatalogueEntry(name: string): CigEventCatalogueEntry | undefined {
  return byName.get(name);
}

export function listCigEventsByProducerClass(
  producerClass: CigEventCatalogueEntry['producerClass'],
): readonly CigEventCatalogueEntry[] {
  return CIG_EVENT_CATALOGUE.filter((e) => e.producerClass === producerClass);
}

/**
 * Whether an event may contribute to multi-user T1 twin badges.
 * Only durable BE events after Mode A cutover qualify; catalogue defaults are conservative.
 */
export function isEventEligibleForMultiUserTwin(name: string): boolean {
  const entry = byName.get(name);
  if (!entry) return false;
  if (entry.producerClass === 'unavailable_for_t1') return false;
  if (entry.producerClass === 'fe_session') return false;
  // Even be_emitted defaults to session until K13 cutover promotes durability.
  return entry.durabilityDefault === 'durable';
}

export function buildCigDomainEvent(input: {
  name: string;
  tenantId: string;
  producer: string;
  payload: Record<string, unknown>;
  eventId: string;
  occurredAt?: string;
  receivedAt?: string;
  organizationId?: string;
  workspaceId?: string;
  correlationId?: string;
  causationId?: string;
  /** Override catalogue defaults when producer has confirmed durability */
  durability?: CigEventCatalogueEntry['durabilityDefault'];
}): import('../types').CigDomainEvent {
  const entry = byName.get(input.name);
  if (!entry) {
    throw new Error(`Unknown CIG event name (not in Stage F catalogue): ${input.name}`);
  }
  const now = new Date().toISOString();
  return {
    name: entry.name,
    version: entry.version,
    eventId: input.eventId,
    tenantId: input.tenantId,
    organizationId: input.organizationId,
    workspaceId: input.workspaceId,
    occurredAt: input.occurredAt ?? now,
    receivedAt: input.receivedAt ?? now,
    producer: input.producer,
    durability: input.durability ?? entry.durabilityDefault,
    piiClassification: entry.piiClassification,
    authz: { requiredPermissions: [...entry.authz.requiredPermissions] },
    payload: input.payload,
    correlationId: input.correlationId,
    causationId: input.causationId,
  };
}
