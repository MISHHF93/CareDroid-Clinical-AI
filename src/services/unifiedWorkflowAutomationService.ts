import {
  UNIFIED_WORKFLOW_SAFETY_STATEMENT,
  listWorkflowAutomationBackendEndpoints,
  resolvePrimaryDomainForAutomationCategory,
  type UnifiedWorkflowAutomationSnapshot,
  type WorkflowAutomationDomain,
  type WorkflowAutomationItem,
  type WorkflowAutomationPriority,
  type WorkflowAutomationSource,
} from '../config/unifiedWorkflowAutomationModel';
import { buildAiChiefOrchestrationSnapshot } from './aiChiefContinuousMonitoringService';
import { buildThreeMinuteMissionSnapshot } from './threeMinuteMissionService';
import type { AdministrativeAutomationTask } from '../types/administrativeAutomation';
import type { AiChiefExplainableRecommendation } from '../config/aiChiefOrchestrationModel';
import {
  THREE_MINUTE_MISSION_TARGET_SECONDS,
  type ThreeMinuteMission,
} from '../config/threeMinuteMissionModel';
import { CANONICAL_ROUTES } from '../config/routes.config';
import type { ContinuousPatientFlowSnapshot } from '../engine/continuousPatientFlowEngine';
import { PatientState, Priority, type Patient } from '../types/emergency';

export type BuildUnifiedWorkflowAutomationInput = Readonly<{
  administrativeTasks?: readonly AdministrativeAutomationTask[];
  patients?: readonly Patient[];
  patientFlowSnapshot?: ContinuousPatientFlowSnapshot | null;
  lastBackendEventType?: string;
  pathname?: string;
  now?: Date;
}>;

const DOMAIN_ORDER: readonly WorkflowAutomationDomain[] = Object.freeze([
  'triage',
  'patient_routing',
  'notifications',
  'reception',
  'intake',
  'documentation',
  'handoffs',
  'staff_assignments',
  'ai_recommendations',
  'analytics',
  'reporting',
]);

const EMPTY_DOMAIN_COUNTS = Object.freeze(
  Object.fromEntries(DOMAIN_ORDER.map((domain) => [domain, 0])),
) as Record<WorkflowAutomationDomain, number>;

const EMPTY_SOURCE_COUNTS = Object.freeze({
  admin_automation: 0,
  ai_chief: 0,
  three_minute_mission: 0,
  backend_event: 0,
}) as Record<WorkflowAutomationSource, number>;

function priorityRank(priority: WorkflowAutomationPriority): number {
  return { critical: 0, high: 1, medium: 2, low: 3 }[priority];
}

function sortWorkflowItems(items: WorkflowAutomationItem[]): WorkflowAutomationItem[] {
  return [...items].sort((left, right) => {
    const priorityDelta = priorityRank(left.priority) - priorityRank(right.priority);
    if (priorityDelta !== 0) return priorityDelta;
    return new Date(right.updatedAt).getTime() - new Date(left.updatedAt).getTime();
  });
}

function mapAdminTaskToWorkflowItem(task: AdministrativeAutomationTask): WorkflowAutomationItem {
  const domain = resolvePrimaryDomainForAutomationCategory(task.category);
  return Object.freeze({
    id: `uwa-admin-${task.id}`,
    domain,
    source: 'admin_automation',
    status: task.status === 'pending_review' ? 'pending_review' : 'executed',
    priority: task.priority,
    title: task.title,
    summary: task.summary,
    proposedAction: task.proposedAction,
    route: task.route,
    patientId: task.patientId,
    patientName: task.patientName,
    ownerRole: task.ownerRole,
    humanReviewRequired: true,
    oneClickAction: task.status === 'pending_review' ? 'approve' : 'open',
    linkedTaskId: task.id,
    updatedAt: task.updatedAt,
  });
}

function mapAiChiefRecommendationToWorkflowItem(
  recommendation: AiChiefExplainableRecommendation,
): WorkflowAutomationItem {
  return Object.freeze({
    id: `uwa-ai-${recommendation.id}`,
    domain: 'ai_recommendations',
    source: 'ai_chief',
    status: 'pending_review',
    priority:
      recommendation.priority === 'P0' || recommendation.priority === 'P1'
        ? 'critical'
        : recommendation.priority === 'P2'
          ? 'high'
          : 'medium',
    title: recommendation.action,
    summary: recommendation.rationale,
    proposedAction: recommendation.action,
    route: recommendation.route || CANONICAL_ROUTES.emergencyCopilot,
    patientId: recommendation.patientId,
    ownerRole: recommendation.ownerRole,
    humanReviewRequired: true,
    oneClickAction: 'open',
    linkedRecommendationId: recommendation.id,
    updatedAt: new Date().toISOString(),
  });
}

function missionRemainingSeconds(mission: ThreeMinuteMission): number {
  const elapsed = Math.max(
    0,
    Math.floor((Date.now() - new Date(mission.startedAt).getTime()) / 1000),
  );
  return Math.max(0, THREE_MINUTE_MISSION_TARGET_SECONDS - elapsed);
}

function patientLabel(patient: Patient): string {
  return `${patient.firstName || ''} ${patient.lastName || ''}`.trim() || patient.mrn || patient.id;
}

function buildReceptionIntakeGapItems(
  patients: readonly Patient[],
  now: string,
  existingPatientIds: Set<string>,
): WorkflowAutomationItem[] {
  return patients
    .filter(
      (patient) =>
        (patient.state === PatientState.Registration || patient.state === PatientState.Arrival) &&
        !existingPatientIds.has(patient.id),
    )
    .map((patient) =>
      Object.freeze({
        id: `uwa-reception-gap-${patient.id}`,
        domain: 'reception' as const,
        source: 'backend_event' as const,
        sourceEventType: 'patient_created',
        status: 'pending_review' as const,
        priority:
          patient.priority === Priority.P1 || patient.priority === Priority.P2
            ? ('critical' as const)
            : ('medium' as const),
        title: `Complete intake handoff — ${patientLabel(patient)}`,
        summary: 'Registration captured — automated workflow recommends triage queue placement.',
        proposedAction: 'Approve routing to triage and notify triage nurse.',
        route: CANONICAL_ROUTES.emergencyReception,
        patientId: patient.id,
        patientName: patientLabel(patient),
        ownerRole: 'registration_clerk',
        humanReviewRequired: true,
        oneClickAction: 'open' as const,
        updatedAt: now,
      }),
    );
}

function buildFlowDetectionItems(
  snapshot: ContinuousPatientFlowSnapshot | null | undefined,
  now: string,
): WorkflowAutomationItem[] {
  if (!snapshot) return [];
  const items: WorkflowAutomationItem[] = [];

  for (const detection of snapshot.detections.slice(0, 4)) {
    const domain =
      detection.type === 'delayed_handoff'
        ? ('handoffs' as const)
        : detection.type === 'prolonged_waiting'
          ? ('analytics' as const)
          : ('notifications' as const);
    items.push(
      Object.freeze({
        id: `uwa-flow-${detection.id}`,
        domain,
        source: 'backend_event',
        sourceEventType: 'patient_flow_updated',
        status: 'pending_review',
        priority:
          detection.severity === 'critical'
            ? 'critical'
            : detection.severity === 'warning'
              ? 'high'
              : 'medium',
        title: detection.title,
        summary: detection.message,
        proposedAction: detection.recommendedAction,
        route: CANONICAL_ROUTES.emergencyQueues,
        patientId: detection.patientId,
        ownerRole: detection.ownerRole,
        humanReviewRequired: true,
        oneClickAction: 'open',
        updatedAt: now,
      }),
    );
  }

  for (const recommendation of snapshot.aiRecommendations.slice(0, 3)) {
    items.push(
      Object.freeze({
        id: `uwa-flow-ai-${recommendation.id}`,
        domain: 'ai_recommendations',
        source: 'backend_event',
        sourceEventType: 'patient_flow_updated',
        status: 'pending_review',
        priority: recommendation.priority === 'high' ? 'high' : 'medium',
        title: recommendation.action,
        summary: recommendation.rationale,
        proposedAction: recommendation.action,
        route: CANONICAL_ROUTES.emergencyQueues,
        patientId: recommendation.patientId,
        ownerRole: 'patient_flow_coordinator',
        humanReviewRequired: true,
        oneClickAction: 'open',
        updatedAt: now,
      }),
    );
  }

  return items;
}

function mapThreeMinuteMissionToWorkflowItem(mission: ThreeMinuteMission): WorkflowAutomationItem {
  const priority: WorkflowAutomationPriority =
    mission.phase === 'breach' ? 'critical' : mission.phase === 'escalated_l1' ? 'high' : 'high';
  return Object.freeze({
    id: `uwa-tm-${mission.missionId}`,
    domain: 'triage',
    source: 'three_minute_mission',
    sourceEventType: mission.trigger,
    status: mission.acknowledgedAt ? 'acknowledged' : 'active',
    priority,
    title: mission.subjectLabel,
    summary: `${mission.trigger.replace(/_/g, ' ')} — ${missionRemainingSeconds(mission)}s remaining`,
    proposedAction: 'Acknowledge mission and begin clinical response.',
    route: mission.route,
    patientId: mission.patientId,
    ownerRole: mission.ownerRole,
    humanReviewRequired: true,
    oneClickAction: mission.acknowledgedAt ? 'open' : 'acknowledge',
    linkedMissionId: mission.missionId,
    updatedAt: mission.startedAt,
  });
}

function dedupeWorkflowItems(items: WorkflowAutomationItem[]): WorkflowAutomationItem[] {
  const seen = new Set<string>();
  const deduped: WorkflowAutomationItem[] = [];
  for (const item of items) {
    const key = [
      item.domain,
      item.patientId || '',
      item.linkedTaskId || '',
      item.linkedMissionId || '',
      item.linkedRecommendationId || '',
      item.title,
    ].join('::');
    if (seen.has(key)) continue;
    seen.add(key);
    deduped.push(item);
  }
  return deduped;
}

function estimateClicksSaved(items: readonly WorkflowAutomationItem[]): number {
  return items.reduce((total, item) => {
    if (item.source === 'admin_automation' && item.status === 'pending_review') return total + 3;
    if (item.source === 'three_minute_mission' && item.oneClickAction === 'acknowledge')
      return total + 2;
    if (item.source === 'ai_chief') return total + 1;
    return total;
  }, 0);
}

function buildDomainCounts(
  items: readonly WorkflowAutomationItem[],
): Record<WorkflowAutomationDomain, number> {
  const counts = { ...EMPTY_DOMAIN_COUNTS };
  for (const item of items) {
    counts[item.domain] += 1;
  }
  return counts;
}

function buildSourceCounts(
  items: readonly WorkflowAutomationItem[],
): Record<WorkflowAutomationSource, number> {
  const counts = { ...EMPTY_SOURCE_COUNTS };
  for (const item of items) {
    counts[item.source] += 1;
  }
  return counts;
}

export function buildUnifiedWorkflowAutomationSnapshot(
  input: BuildUnifiedWorkflowAutomationInput = {},
): UnifiedWorkflowAutomationSnapshot {
  const now = input.now || new Date();
  const adminTasks = (input.administrativeTasks || []).filter(
    (task) => task.status === 'pending_review' || task.status === 'executed',
  );
  const pendingAdminTasks = adminTasks.filter((task) => task.status === 'pending_review');

  const aiChief = buildAiChiefOrchestrationSnapshot({ pathname: input.pathname });
  const missionSnapshot = buildThreeMinuteMissionSnapshot();

  const adminLinkedPatients = new Set(
    pendingAdminTasks
      .map((task) => task.patientId)
      .filter((patientId): patientId is string => Boolean(patientId)),
  );
  const nowIso = now.toISOString();
  const patients = input.patients || [];

  const items: WorkflowAutomationItem[] = [
    ...pendingAdminTasks.map(mapAdminTaskToWorkflowItem),
    ...missionSnapshot.activeMissions
      .filter((mission) => !mission.acknowledgedAt)
      .map(mapThreeMinuteMissionToWorkflowItem),
    ...buildReceptionIntakeGapItems(patients, nowIso, adminLinkedPatients),
    ...buildFlowDetectionItems(input.patientFlowSnapshot, nowIso),
    ...aiChief.recommendations
      .filter(
        (recommendation) =>
          !recommendation.patientId || !adminLinkedPatients.has(recommendation.patientId),
      )
      .slice(0, 6)
      .map(mapAiChiefRecommendationToWorkflowItem),
  ];

  const sorted = sortWorkflowItems(dedupeWorkflowItems(items));
  const pendingReview = sorted.filter(
    (item) => item.status === 'pending_review' || item.status === 'active',
  ).length;
  const critical = sorted.filter((item) => item.priority === 'critical').length;

  return Object.freeze({
    engineId: 'unified-workflow-automation',
    generatedAt: now.toISOString(),
    items: Object.freeze(sorted),
    pendingReview,
    metrics: Object.freeze({
      total: sorted.length,
      pendingReview,
      critical,
      byDomain: Object.freeze(buildDomainCounts(sorted)),
      bySource: Object.freeze(buildSourceCounts(sorted)),
      clicksSavedEstimate: estimateClicksSaved(sorted),
    }),
    safetyStatement: UNIFIED_WORKFLOW_SAFETY_STATEMENT.statement,
    lastBackendEventType: input.lastBackendEventType,
    backendEndpoints: listWorkflowAutomationBackendEndpoints(),
  });
}

export default buildUnifiedWorkflowAutomationSnapshot;
