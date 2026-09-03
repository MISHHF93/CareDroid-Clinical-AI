/**
 * Unified workflow automation model — maps reception through reporting to backend
 * events, automation categories, and human-oversight contracts.
 */
import { ADMINISTRATIVE_AUTOMATION_SAFETY_STATEMENT } from './administrativeAutomationCatalog';
import { EMERGENCY_OS_API_ENDPOINTS } from '../services/emergencyOsApi';
import type { AdministrativeAutomationCategory } from '../types/administrativeAutomation';
import { CANONICAL_ROUTES } from './routes.config';

export type WorkflowAutomationDomain =
  | 'reception'
  | 'intake'
  | 'triage'
  | 'patient_routing'
  | 'notifications'
  | 'documentation'
  | 'handoffs'
  | 'staff_assignments'
  | 'analytics'
  | 'reporting'
  | 'ai_recommendations';

export type WorkflowAutomationSource =
  | 'admin_automation'
  | 'ai_chief'
  | 'three_minute_mission'
  | 'backend_event';

export type WorkflowAutomationItemStatus =
  | 'pending_review'
  | 'active'
  | 'acknowledged'
  | 'executed';

export type WorkflowAutomationPriority = 'critical' | 'high' | 'medium' | 'low';

export type WorkflowAutomationOneClickAction = 'approve' | 'acknowledge' | 'open';

export type WorkflowAutomationItem = Readonly<{
  id: string;
  domain: WorkflowAutomationDomain;
  source: WorkflowAutomationSource;
  sourceEventType?: string;
  status: WorkflowAutomationItemStatus;
  priority: WorkflowAutomationPriority;
  title: string;
  summary: string;
  proposedAction: string;
  route?: string;
  patientId?: string;
  patientName?: string;
  ownerRole: string;
  humanReviewRequired: true;
  oneClickAction: WorkflowAutomationOneClickAction;
  linkedTaskId?: string;
  linkedMissionId?: string;
  linkedRecommendationId?: string;
  updatedAt: string;
}>;

export type WorkflowAutomationDomainDefinition = Readonly<{
  id: WorkflowAutomationDomain;
  label: string;
  description: string;
  ownerRole: string;
  route: string;
  automationCategories: readonly AdministrativeAutomationCategory[];
  triggerEvents: readonly string[];
}>;

export type UnifiedWorkflowAutomationSnapshot = Readonly<{
  engineId: 'unified-workflow-automation';
  generatedAt: string;
  items: readonly WorkflowAutomationItem[];
  pendingReview: number;
  metrics: Readonly<{
    total: number;
    pendingReview: number;
    critical: number;
    byDomain: Readonly<Record<WorkflowAutomationDomain, number>>;
    bySource: Readonly<Record<WorkflowAutomationSource, number>>;
    clicksSavedEstimate: number;
  }>;
  safetyStatement: string;
  lastBackendEventType?: string;
  backendEndpoints: readonly string[];
}>;

export const UNIFIED_WORKFLOW_SAFETY_STATEMENT = Object.freeze({
  statement: ADMINISTRATIVE_AUTOMATION_SAFETY_STATEMENT,
  humanReviewRequired: true as const,
  advisoryOnly: true,
  clinicianOverrideAvailable: true,
  replacesClinicianJudgment: false,
});

/** Backend realtime events that should refresh the unified automation queue. */
export const WORKFLOW_AUTOMATION_TRIGGER_EVENTS = Object.freeze([
  'patient_created',
  'journey_state_changed',
  'ems_arrival',
  'ems_arrival_created',
  'ems_incoming',
  'ems_updated',
  'alert_created',
  'operational_alert_dispatched',
  'staff_assigned',
  'patient_escalated',
  'patient_flow_updated',
  'capacity_updated',
  'capacity_changed',
  'capacity_score_changed',
  'boarding_started',
  'boarding_updated',
  'workflow_orchestration_updated',
  'workflow_log_created',
  'reassessment_created',
  'reassessment_completed',
  'referral_created',
  'intake_handoff_complete',
] as const);

export type WorkflowAutomationTriggerEvent = (typeof WORKFLOW_AUTOMATION_TRIGGER_EVENTS)[number];

const CATEGORY_TO_DOMAINS: Readonly<
  Partial<Record<AdministrativeAutomationCategory, readonly WorkflowAutomationDomain[]>>
> = Object.freeze({
  patient_routing: ['patient_routing', 'triage'],
  documentation_handoff: ['documentation', 'handoffs'],
  ai_patient_summary: ['ai_recommendations', 'documentation'],
  triage_preparation: ['triage', 'intake', 'reception'],
  department_notification: ['notifications', 'analytics'],
  staff_assignment: ['staff_assignments'],
  queue_prioritization: ['patient_routing', 'triage'],
  escalation_workflow: ['notifications', 'triage'],
});

export const WORKFLOW_AUTOMATION_DOMAINS = Object.freeze([
  Object.freeze({
    id: 'reception',
    label: 'Reception',
    description: 'Arrival registration, identity capture, and intake handoff preparation.',
    ownerRole: 'registration_clerk',
    route: CANONICAL_ROUTES.emergencyReception,
    automationCategories: ['triage_preparation'],
    triggerEvents: ['patient_created', 'ems_arrival_created', 'ems_incoming'],
  }),
  Object.freeze({
    id: 'intake',
    label: 'Intake',
    description: 'Rapid intake, missing-field resolution, and pre-triage documentation.',
    ownerRole: 'registration_clerk',
    route: CANONICAL_ROUTES.emergencyIntake,
    automationCategories: ['triage_preparation', 'ai_patient_summary'],
    triggerEvents: ['patient_created', 'journey_state_changed'],
  }),
  Object.freeze({
    id: 'triage',
    label: 'Triage',
    description: 'Acuity assignment, triage packet prep, and reassessment triggers.',
    ownerRole: 'triage_nurse',
    route: CANONICAL_ROUTES.emergencyQueues,
    automationCategories: ['triage_preparation', 'queue_prioritization', 'escalation_workflow'],
    triggerEvents: ['journey_state_changed', 'alert_created', 'reassessment_created'],
  }),
  Object.freeze({
    id: 'patient_routing',
    label: 'Patient routing',
    description: 'Queue placement, state advancement, and flow rebalance.',
    ownerRole: 'patient_flow_coordinator',
    route: CANONICAL_ROUTES.emergencyQueues,
    automationCategories: ['patient_routing', 'queue_prioritization'],
    triggerEvents: ['journey_state_changed', 'patient_flow_updated'],
  }),
  Object.freeze({
    id: 'notifications',
    label: 'Notifications',
    description: 'Department alerts, capacity surge notices, and escalation broadcasts.',
    ownerRole: 'charge_nurse',
    route: CANONICAL_ROUTES.emergencyAlerts,
    automationCategories: ['department_notification', 'escalation_workflow'],
    triggerEvents: ['alert_created', 'operational_alert_dispatched', 'capacity_updated'],
  }),
  Object.freeze({
    id: 'documentation',
    label: 'Documentation',
    description: 'AI-assisted summaries and structured note drafts awaiting clinician review.',
    ownerRole: 'registered_nurse',
    route: CANONICAL_ROUTES.emergencyCopilot,
    automationCategories: ['documentation_handoff', 'ai_patient_summary'],
    triggerEvents: ['journey_state_changed', 'workflow_log_created'],
  }),
  Object.freeze({
    id: 'handoffs',
    label: 'Handoffs',
    description: 'Disposition, admission, and transfer handoff packages.',
    ownerRole: 'registered_nurse',
    route: CANONICAL_ROUTES.emergencyHandoffs,
    automationCategories: ['documentation_handoff'],
    triggerEvents: ['journey_state_changed', 'boarding_started', 'referral_created'],
  }),
  Object.freeze({
    id: 'staff_assignments',
    label: 'Staff assignments',
    description: 'Owner assignment for unassigned high-acuity patients.',
    ownerRole: 'charge_nurse',
    route: CANONICAL_ROUTES.emergencyCommandCenter,
    automationCategories: ['staff_assignment'],
    triggerEvents: ['staff_assigned', 'journey_state_changed'],
  }),
  Object.freeze({
    id: 'analytics',
    label: 'Analytics',
    description: 'Throughput signals, congestion metrics, and operational intelligence.',
    ownerRole: 'ed_manager',
    route: CANONICAL_ROUTES.emergencyAnalytics,
    automationCategories: ['department_notification', 'queue_prioritization'],
    triggerEvents: ['patient_flow_updated', 'capacity_score_changed'],
  }),
  Object.freeze({
    id: 'reporting',
    label: 'Reporting',
    description: 'Workflow action logs and audit-ready operational reporting.',
    ownerRole: 'quality_lead',
    route: CANONICAL_ROUTES.emergencyAnalytics,
    automationCategories: [],
    triggerEvents: ['workflow_log_created'],
  }),
  Object.freeze({
    id: 'ai_recommendations',
    label: 'AI recommendations',
    description: 'Explainable AI Chief suggestions — advisory until clinician review.',
    ownerRole: 'emergency_physician',
    route: CANONICAL_ROUTES.emergencyCopilot,
    automationCategories: ['ai_patient_summary'],
    triggerEvents: ['workflow_orchestration_updated'],
  }),
]) as readonly WorkflowAutomationDomainDefinition[];

const DOMAIN_BY_ID = Object.freeze(
  Object.fromEntries(WORKFLOW_AUTOMATION_DOMAINS.map((domain) => [domain.id, domain])),
) as Record<WorkflowAutomationDomain, WorkflowAutomationDomainDefinition>;

export function getWorkflowAutomationDomain(
  id: WorkflowAutomationDomain,
): WorkflowAutomationDomainDefinition {
  return DOMAIN_BY_ID[id];
}

export function listWorkflowAutomationDomains(): readonly WorkflowAutomationDomainDefinition[] {
  return WORKFLOW_AUTOMATION_DOMAINS;
}

export function resolveDomainsForAutomationCategory(
  category: AdministrativeAutomationCategory,
): readonly WorkflowAutomationDomain[] {
  return CATEGORY_TO_DOMAINS[category] || ['patient_routing'];
}

export function resolvePrimaryDomainForAutomationCategory(
  category: AdministrativeAutomationCategory,
): WorkflowAutomationDomain {
  return resolveDomainsForAutomationCategory(category)[0];
}

export function isWorkflowAutomationTriggerEvent(
  eventType: string,
): eventType is WorkflowAutomationTriggerEvent {
  return (WORKFLOW_AUTOMATION_TRIGGER_EVENTS as readonly string[]).includes(eventType);
}

export function listWorkflowAutomationBackendEndpoints(): readonly string[] {
  return Object.freeze([
    EMERGENCY_OS_API_ENDPOINTS.workflowOrchestration,
    `${EMERGENCY_OS_API_ENDPOINTS.workflowOrchestration}/review`,
    EMERGENCY_OS_API_ENDPOINTS.patientFlow,
    EMERGENCY_OS_API_ENDPOINTS.workflowLogs,
    EMERGENCY_OS_API_ENDPOINTS.receptionSnapshot,
    EMERGENCY_OS_API_ENDPOINTS.intake,
    EMERGENCY_OS_API_ENDPOINTS.queues,
    EMERGENCY_OS_API_ENDPOINTS.analytics,
    '/api/ai/node',
  ]);
}

export const UNIFIED_WORKFLOW_AUTOMATION_CONTRACT = Object.freeze({
  engineId: 'unified-workflow-automation',
  domainCount: WORKFLOW_AUTOMATION_DOMAINS.length,
  triggerEventCount: WORKFLOW_AUTOMATION_TRIGGER_EVENTS.length,
  safety: UNIFIED_WORKFLOW_SAFETY_STATEMENT,
  eventDriven: true,
  humanOversightRequired: true,
});
