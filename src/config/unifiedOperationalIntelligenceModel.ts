/**
 * Unified operational intelligence model — single contract connecting backend events,
 * patient flow, staffing, AI recommendations, service health, capacity, alerts, and
 * workflow metrics into one event-driven operational surface.
 */
import { OPERATIONAL_INTELLIGENCE_DISCLAIMERS } from '../operational-intelligence/operationalIntelligence.types';
import { EMERGENCY_OS_API_ENDPOINTS } from '../services/emergencyOsApi';
import { WORKFLOW_AUTOMATION_TRIGGER_EVENTS } from './unifiedWorkflowAutomationModel';

export type UnifiedOperationalIntelligenceDomain =
  | 'patient_flow'
  | 'staffing'
  | 'capacity'
  | 'alerts'
  | 'workflow'
  | 'service_health'
  | 'ai_recommendations';

export type UnifiedOperationalInsightType =
  | 'bottleneck'
  | 'congestion_prediction'
  | 'intervention'
  | 'anomaly'
  | 'alert'
  | 'recommendation';

export type UnifiedOperationalIntelligenceInsight = Readonly<{
  id: string;
  domain: UnifiedOperationalIntelligenceDomain;
  type: UnifiedOperationalInsightType;
  title: string;
  summary: string;
  severity: 'critical' | 'warning' | 'info';
  route?: string;
  patientId?: string;
  ownerRole: string;
  reasonCodes: readonly string[];
  confidence: number;
  humanReviewRequired: true;
  advisoryOnly: true;
  source: 'backend' | 'backend_evaluate' | 'degraded';
  sourceEventType?: string;
  updatedAt: string;
}>;

export type UnifiedOperationalIntelligenceDomainStatus = Readonly<{
  id: UnifiedOperationalIntelligenceDomain;
  label: string;
  status: 'healthy' | 'watch' | 'critical';
  insightCount: number;
  bottleneckCount: number;
  signalSources: readonly string[];
}>;

export type UnifiedOperationalIntelligenceSnapshot = Readonly<{
  engineId: 'unified-operational-intelligence';
  generatedAt: string;
  source: 'backend' | 'backend_evaluate' | 'degraded';
  lastBackendEventType?: string;
  domainStatuses: readonly UnifiedOperationalIntelligenceDomainStatus[];
  insights: readonly UnifiedOperationalIntelligenceInsight[];
  metrics: Readonly<{
    activePatients: number;
    waitingPatients: number;
    capacityScore: number;
    capacityBand: string;
    inboundEms: number;
    activeBottlenecks: number;
    unresolvedAlerts: number;
    degradedServices: number;
    workflowPendingReview: number;
    aiRecommendationCount: number;
    congestionPredictions: number;
  }>;
  safetyStatement: string;
  backendEndpoints: readonly string[];
}>;

export type UnifiedOperationalIntelligenceDomainDefinition = Readonly<{
  id: UnifiedOperationalIntelligenceDomain;
  label: string;
  description: string;
  ownerRole: string;
  signalSources: readonly string[];
  triggerEvents: readonly string[];
}>;

/** Backend realtime events that should refresh unified operational intelligence. */
export const UNIFIED_OPERATIONAL_INTELLIGENCE_TRIGGER_EVENTS = Object.freeze([
  ...WORKFLOW_AUTOMATION_TRIGGER_EVENTS,
  'central_node_snapshot',
  'central_node_updated',
  'emergency_snapshot',
  'emergency_state',
  'whiteboard_snapshot',
  'whiteboard_updated',
  'operational_intelligence_updated',
  'service_health_updated',
  'bottleneck_detected',
  'congestion_predicted',
  'operational_alert_dispatched',
] as const);

export type UnifiedOperationalIntelligenceTriggerEvent =
  (typeof UNIFIED_OPERATIONAL_INTELLIGENCE_TRIGGER_EVENTS)[number];

export const UNIFIED_OPERATIONAL_INTELLIGENCE_DOMAINS: readonly UnifiedOperationalIntelligenceDomainDefinition[] =
  Object.freeze([
    Object.freeze({
      id: 'patient_flow',
      label: 'Patient flow',
      description: 'Queue movement, stage waits, handoff delays, and congestion signals.',
      ownerRole: 'patient_flow_coordinator',
      signalSources: ['backend_snapshot', 'patient_flow_api', 'websocket_events'],
      triggerEvents: ['journey_state_changed', 'patient_flow_updated', 'bottleneck_detected'],
    }),
    Object.freeze({
      id: 'staffing',
      label: 'Staffing',
      description: 'Shift coverage, assignment load, and routing recommendations.',
      ownerRole: 'charge_nurse',
      signalSources: ['backend_snapshot', 'workflow_orchestration'],
      triggerEvents: ['staff_assigned', 'workflow_orchestration_updated'],
    }),
    Object.freeze({
      id: 'capacity',
      label: 'Capacity',
      description: 'Bed occupancy, boarding load, and surge posture.',
      ownerRole: 'ed_manager',
      signalSources: ['backend_snapshot', 'capacity_api'],
      triggerEvents: ['capacity_updated', 'capacity_changed', 'boarding_started'],
    }),
    Object.freeze({
      id: 'alerts',
      label: 'Alerts',
      description: 'Unresolved operational and clinical alerts requiring acknowledgement.',
      ownerRole: 'charge_nurse',
      signalSources: ['backend_snapshot', 'alerts_api'],
      triggerEvents: ['alert_created', 'operational_alert_dispatched'],
    }),
    Object.freeze({
      id: 'workflow',
      label: 'Workflow',
      description: 'Automation queue depth, pending reviews, and orchestration metrics.',
      ownerRole: 'ed_manager',
      signalSources: ['workflow_orchestration', 'workflow_logs'],
      triggerEvents: ['workflow_orchestration_updated', 'workflow_log_created'],
    }),
    Object.freeze({
      id: 'service_health',
      label: 'Service health',
      description: 'Degraded integrations, stale sync, and model health posture.',
      ownerRole: 'ed_manager',
      signalSources: ['model_health_api', 'central_node_snapshot'],
      triggerEvents: ['central_node_snapshot', 'service_health_updated'],
    }),
    Object.freeze({
      id: 'ai_recommendations',
      label: 'AI recommendations',
      description: 'Explainable AI Chief and backend OI interventions awaiting review.',
      ownerRole: 'emergency_physician',
      signalSources: ['operational_intelligence_evaluate', 'copilot_api'],
      triggerEvents: ['workflow_orchestration_updated', 'operational_intelligence_updated'],
    }),
  ]);

const DOMAIN_BY_ID = Object.freeze(
  Object.fromEntries(UNIFIED_OPERATIONAL_INTELLIGENCE_DOMAINS.map((domain) => [domain.id, domain])),
) as Record<UnifiedOperationalIntelligenceDomain, UnifiedOperationalIntelligenceDomainDefinition>;

export const UNIFIED_OPERATIONAL_INTELLIGENCE_SAFETY_STATEMENT = Object.freeze({
  statement: OPERATIONAL_INTELLIGENCE_DISCLAIMERS.operational,
  humanReviewRequired: true as const,
  advisoryOnly: true as const,
  eventDriven: true as const,
  backendAuthoritative: true as const,
});

export const UNIFIED_OPERATIONAL_INTELLIGENCE_CONTRACT = Object.freeze({
  engineId: 'unified-operational-intelligence',
  domainCount: UNIFIED_OPERATIONAL_INTELLIGENCE_DOMAINS.length,
  triggerEventCount: UNIFIED_OPERATIONAL_INTELLIGENCE_TRIGGER_EVENTS.length,
  safety: UNIFIED_OPERATIONAL_INTELLIGENCE_SAFETY_STATEMENT,
  eventDriven: true,
  humanOversightRequired: true,
  backendAuthoritative: true,
});

export function getUnifiedOperationalIntelligenceDomain(
  id: UnifiedOperationalIntelligenceDomain,
): UnifiedOperationalIntelligenceDomainDefinition {
  return DOMAIN_BY_ID[id];
}

export function listUnifiedOperationalIntelligenceDomains(): readonly UnifiedOperationalIntelligenceDomainDefinition[] {
  return UNIFIED_OPERATIONAL_INTELLIGENCE_DOMAINS;
}

export function isUnifiedOperationalIntelligenceTriggerEvent(
  eventType: string,
): eventType is UnifiedOperationalIntelligenceTriggerEvent {
  return (UNIFIED_OPERATIONAL_INTELLIGENCE_TRIGGER_EVENTS as readonly string[]).includes(eventType);
}

export function listUnifiedOperationalIntelligenceBackendEndpoints(): readonly string[] {
  return Object.freeze([
    EMERGENCY_OS_API_ENDPOINTS.operationalIntelligenceSnapshot,
    EMERGENCY_OS_API_ENDPOINTS.operationalIntelligenceEvaluate,
    EMERGENCY_OS_API_ENDPOINTS.operationalIntelligenceModelHealth,
    EMERGENCY_OS_API_ENDPOINTS.operationalIntelligenceAlerts,
    EMERGENCY_OS_API_ENDPOINTS.centralNodeSnapshot,
    EMERGENCY_OS_API_ENDPOINTS.patientFlow,
    EMERGENCY_OS_API_ENDPOINTS.workflowOrchestration,
    EMERGENCY_OS_API_ENDPOINTS.capacity,
  ]);
}

export function resolveDomainForAnomalyCategory(
  category: string,
): UnifiedOperationalIntelligenceDomain {
  const normalized = category.toLowerCase();
  if (normalized.includes('capacity') || normalized.includes('boarding')) return 'capacity';
  if (normalized.includes('staff') || normalized.includes('routing')) return 'staffing';
  if (normalized.includes('alert')) return 'alerts';
  if (
    normalized.includes('service') ||
    normalized.includes('sync') ||
    normalized.includes('health')
  ) {
    return 'service_health';
  }
  if (normalized.includes('workflow') || normalized.includes('automation')) return 'workflow';
  if (normalized.includes('ems') || normalized.includes('flow') || normalized.includes('queue')) {
    return 'patient_flow';
  }
  return 'patient_flow';
}
