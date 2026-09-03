/**
 * AI Chief orchestration model — canonical map of monitoring domains, AI capabilities,
 * safety constraints, and backend contracts for the unified orchestration engine.
 */
import { CLINICAL_DECISION_SUPPORT_DISCLAIMER } from '../../lib/ai/careDroidAI';
import {
  PLATFORM_AI_SERVICE_NODE_MAP,
  AI_SYSTEM_TOOL_NODE_MAP,
  type UnifiedAiNodeCapability,
} from './careDroidUnifiedAiNode.config';
import { EMERGENCY_OS_API_ENDPOINTS } from '../services/emergencyOsApi';
import { AI_CHIEF_ORCHESTRATOR_VERSION } from '../services/aiChiefOrchestrator';

export type AiChiefMonitoringDomain =
  | 'patient_flow'
  | 'department_capacity'
  | 'staffing'
  | 'bottlenecks'
  | 'alerts'
  | 'service_health'
  | 'ems_arrivals'
  | 'patient_prioritization'
  | 'operational_intelligence'
  | 'clinical_workflow';

export type AiChiefMonitoringDomainDefinition = Readonly<{
  id: AiChiefMonitoringDomain;
  label: string;
  description: string;
  ownerRole: string;
  signalSources: readonly string[];
  backendEndpoints: readonly string[];
}>;

export type AiChiefExplainableRecommendation = Readonly<{
  id: string;
  domain: AiChiefMonitoringDomain;
  action: string;
  rationale: string;
  reasonCodes: readonly string[];
  confidence: number;
  route?: string;
  patientId?: string;
  ownerRole: string;
  priority: 'P0' | 'P1' | 'P2' | 'P3';
  tone: 'critical' | 'warning' | 'info' | 'neutral';
  humanReviewRequired: true;
  advisoryOnly: true;
  modelOrRuleId: string;
}>;

export type AiChiefOperationalRisk = Readonly<{
  id: string;
  domain: AiChiefMonitoringDomain;
  title: string;
  summary: string;
  severity: 'critical' | 'warning' | 'info';
  reasonCodes: readonly string[];
  route?: string;
  patientId?: string;
  humanReviewRequired: true;
}>;

export type AiChiefPatientContextSummary = Readonly<{
  patientId: string;
  label: string;
  phaseLabel: string;
  stageLabel: string;
  priority: string;
  chiefComplaint: string;
  whatHappensNext: string | null;
  riskSignals: readonly string[];
  humanReviewRequired: true;
}>;

export type AiChiefDomainStatus = 'healthy' | 'watch' | 'critical';

export type AiChiefMonitoringDomainStatus = Readonly<{
  id: AiChiefMonitoringDomain;
  label: string;
  status: AiChiefDomainStatus;
  signalCount: number;
  riskCount: number;
}>;

export const AI_CHIEF_SAFETY_STATEMENT = Object.freeze({
  disclaimer: CLINICAL_DECISION_SUPPORT_DISCLAIMER,
  advisoryOnly: true,
  humanReviewRequired: true as const,
  clinicianOverrideAvailable: true,
  replacesClinicianJudgment: false,
});

export const AI_CHIEF_MONITORING_DOMAINS: readonly AiChiefMonitoringDomainDefinition[] =
  Object.freeze([
    Object.freeze({
      id: 'patient_flow',
      label: 'Patient flow',
      description:
        'Arrival throughput, queue movement, disposition blockers, and boarding pressure.',
      ownerRole: 'Patient flow coordinator',
      signalSources: ['emergencyStore.patients', 'patientFlowSnapshot', 'hospitalOperatingSystem'],
      backendEndpoints: [EMERGENCY_OS_API_ENDPOINTS.patientFlow, EMERGENCY_OS_API_ENDPOINTS.queues],
    }),
    Object.freeze({
      id: 'department_capacity',
      label: 'Department capacity',
      description: 'Bed availability, occupancy bands, boarding load, and surge posture.',
      ownerRole: 'Charge nurse',
      signalSources: ['capacityEngine', 'centralNode.capacityStatus'],
      backendEndpoints: [EMERGENCY_OS_API_ENDPOINTS.capacity, EMERGENCY_OS_API_ENDPOINTS.boarding],
    }),
    Object.freeze({
      id: 'staffing',
      label: 'Staffing & routing',
      description: 'Assignments, workload balance, pending acknowledgements, and role coverage.',
      ownerRole: 'ED manager',
      signalSources: ['emergencyStore.staff', 'staffRoutingService'],
      backendEndpoints: [EMERGENCY_OS_API_ENDPOINTS.workflowOrchestration],
    }),
    Object.freeze({
      id: 'bottlenecks',
      label: 'Bottlenecks',
      description: 'Service delays, three-minute risk projection, and root-cause bottlenecks.',
      ownerRole: 'ED manager',
      signalSources: ['bottleneckRegistry'],
      backendEndpoints: [EMERGENCY_OS_API_ENDPOINTS.operationalIntelligenceSnapshot],
    }),
    Object.freeze({
      id: 'alerts',
      label: 'Alerts & escalation',
      description: 'Critical alerts, acknowledgement deadlines, and escalation routing.',
      ownerRole: 'Assigned clinician',
      signalSources: ['alertEngine', 'alertLifecycleOrchestrator', 'clinicalAlertsApi'],
      backendEndpoints: [
        EMERGENCY_OS_API_ENDPOINTS.operationalIntelligenceAlerts,
        `${EMERGENCY_OS_API_ENDPOINTS.operatingSurface}/alerts`,
      ],
    }),
    Object.freeze({
      id: 'service_health',
      label: 'Service health',
      description: 'Backend availability, degraded integrations, and fallback readiness.',
      ownerRole: 'IT administrator',
      signalSources: ['bottleneckRegistry.serviceHealth', 'backendReachability'],
      backendEndpoints: [EMERGENCY_OS_API_ENDPOINTS.operationalIntelligenceModelHealth],
    }),
    Object.freeze({
      id: 'ems_arrivals',
      label: 'EMS arrivals',
      description: 'Inbound units, pre-arrival packets, offload readiness, and handoff timing.',
      ownerRole: 'EMS coordinator',
      signalSources: ['emergencyStore.emsArrivals', 'emsPreArrivalPipelineService'],
      backendEndpoints: [EMERGENCY_OS_API_ENDPOINTS.ems],
    }),
    Object.freeze({
      id: 'patient_prioritization',
      label: 'Patient prioritization',
      description:
        'Acuity ordering, P1/P2 concentration, deterioration signals, and reassessment due.',
      ownerRole: 'Triage nurse',
      signalSources: ['patientOrchestration', 'threeMinuteTimerEngine'],
      backendEndpoints: [
        EMERGENCY_OS_API_ENDPOINTS.triageAssist,
        EMERGENCY_OS_API_ENDPOINTS.reassessment,
      ],
    }),
    Object.freeze({
      id: 'operational_intelligence',
      label: 'Operational intelligence',
      description: 'Rule-based and ML-assisted scores, anomalies, and command-center insights.',
      ownerRole: 'ED manager',
      signalSources: ['careDroidOperationalIntelligence', 'centralNode'],
      backendEndpoints: [
        EMERGENCY_OS_API_ENDPOINTS.operationalIntelligenceSnapshot,
        EMERGENCY_OS_API_ENDPOINTS.centralNodeSnapshot,
      ],
    }),
    Object.freeze({
      id: 'clinical_workflow',
      label: 'Clinical workflow support',
      description: 'Tool recommendations, calculators, protocols, and AI Chief structured intents.',
      ownerRole: 'Clinician',
      signalSources: ['patientOrchestration', 'aiChiefOrchestrator', 'careDroidUnifiedAiNode'],
      backendEndpoints: [
        EMERGENCY_OS_API_ENDPOINTS.copilot,
        EMERGENCY_OS_API_ENDPOINTS.copilotQuery,
      ],
    }),
  ]);

const DOMAIN_BY_ID = Object.freeze(
  Object.fromEntries(AI_CHIEF_MONITORING_DOMAINS.map((domain) => [domain.id, domain])),
) as Record<AiChiefMonitoringDomain, AiChiefMonitoringDomainDefinition>;

export function getAiChiefMonitoringDomain(
  id: AiChiefMonitoringDomain,
): AiChiefMonitoringDomainDefinition {
  return DOMAIN_BY_ID[id];
}

export function listAiChiefMonitoringDomains(): readonly AiChiefMonitoringDomainDefinition[] {
  return AI_CHIEF_MONITORING_DOMAINS;
}

export function listUnifiedAiCapabilities(): readonly UnifiedAiNodeCapability[] {
  return Object.freeze([
    ...Object.values(PLATFORM_AI_SERVICE_NODE_MAP),
    ...Object.values(AI_SYSTEM_TOOL_NODE_MAP),
  ]);
}

export function listAiChiefBackendEndpoints(): readonly string[] {
  const endpoints = new Set<string>();
  for (const domain of AI_CHIEF_MONITORING_DOMAINS) {
    domain.backendEndpoints.forEach((endpoint) => endpoints.add(endpoint));
  }
  endpoints.add('/api/ai/node');
  return Object.freeze([...endpoints]);
}

export const AI_CHIEF_ORCHESTRATION_CONTRACT = Object.freeze({
  orchestratorVersion: AI_CHIEF_ORCHESTRATOR_VERSION,
  monitoringDomainCount: AI_CHIEF_MONITORING_DOMAINS.length,
  capabilityCount: listUnifiedAiCapabilities().length,
  safety: AI_CHIEF_SAFETY_STATEMENT,
  continuousMonitoring: true,
});
