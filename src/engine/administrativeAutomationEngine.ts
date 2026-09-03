import {
  buildAutomationEngineContext,
  isAutomationEntitled,
} from '../config/automationEntitlement.config';
import { useEmergencyStore } from '../store/emergencyStore';
import { ADMINISTRATIVE_AUTOMATION_SAFETY_STATEMENT } from '../config/administrativeAutomationCatalog';
import {
  taskHasAiDecision,
  taskNeedsAiEnrichment,
} from '../services/administrativeAutomationAiUtils';
import { enrichAdministrativeAutomationSnapshotWithAi } from '../services/enrichAdministrativeAutomationsWithAi';
import { buildAdministrativeAutomationSnapshot } from '../services/unifiedClinicalWorkflowOrchestrator';
import type {
  AdministrativeAutomationCategory,
  AdministrativeAutomationSnapshot,
  AdministrativeAutomationTask,
} from '../types/administrativeAutomation';
import type {
  Alert,
  CapacitySnapshot,
  EMSArrival,
  Patient,
  Referral,
  Staff,
} from '../types/emergency';
import { startWorkflowTrace } from '../services/observabilityTrace';

export type AdministrativeAutomationEngineInput = Readonly<{
  patients: Patient[];
  staff: Staff[];
  referrals: Referral[];
  alerts: Alert[];
  emsArrivals: EMSArrival[];
  capacity?: CapacitySnapshot | null;
  existingTasks?: readonly AdministrativeAutomationTask[];
  now?: Date;
}>;

function filterEntitledAdministrativeTasks(
  tasks: readonly AdministrativeAutomationTask[],
): AdministrativeAutomationTask[] {
  const context = buildAutomationEngineContext();
  if (!context.strictEntitlements) return [...tasks];

  return tasks.filter((task) => {
    if (!task.automationId) return true;
    return isAutomationEntitled(task.automationId, context);
  });
}

function finalizeAdministrativeAutomationSnapshot(
  enriched: AdministrativeAutomationSnapshot,
  entitledTasks: AdministrativeAutomationTask[],
): AdministrativeAutomationSnapshot {
  return Object.freeze({
    ...enriched,
    tasks: Object.freeze(entitledTasks),
    metrics: Object.freeze({
      ...enriched.metrics,
      pendingReview: entitledTasks.filter((task) => task.status === 'pending_review').length,
      byCategory: Object.freeze(
        Object.fromEntries(
          Object.entries(enriched.metrics.byCategory).map(([category]) => [
            category,
            entitledTasks.filter((task) => task.category === category).length,
          ]),
        ) as Record<AdministrativeAutomationCategory, number>,
      ),
    }),
  });
}

/** Build, AI-enrich, and entitlement-filter the administrative automation queue. */
export async function buildEnrichedAdministrativeAutomationSnapshot(
  input: AdministrativeAutomationEngineInput,
): Promise<AdministrativeAutomationSnapshot> {
  const baseSnapshot = buildAdministrativeAutomationSnapshot(input);
  const enriched = await enrichAdministrativeAutomationSnapshotWithAi(baseSnapshot, {
    patients: input.patients,
    emsArrivals: input.emsArrivals,
  });
  const entitledTasks = filterEntitledAdministrativeTasks(enriched.tasks);
  return finalizeAdministrativeAutomationSnapshot(enriched, entitledTasks);
}

function buildMetricsFromTasks(tasks: readonly AdministrativeAutomationTask[]) {
  return Object.freeze({
    pendingReview: tasks.filter((task) => task.status === 'pending_review').length,
    executedToday: tasks.filter((task) => task.status === 'executed').length,
    overridden: tasks.filter((task) => task.status === 'overridden').length,
    byCategory: Object.freeze(
      Object.fromEntries(
        (
          [
            'patient_routing',
            'documentation_handoff',
            'ai_patient_summary',
            'triage_preparation',
            'department_notification',
            'staff_assignment',
            'queue_prioritization',
            'escalation_workflow',
          ] as AdministrativeAutomationCategory[]
        ).map((category) => [category, tasks.filter((task) => task.category === category).length]),
      ) as Record<AdministrativeAutomationCategory, number>,
    ),
  });
}

function buildSnapshotFromTasks(
  tasks: readonly AdministrativeAutomationTask[],
  generatedAt?: string,
): AdministrativeAutomationSnapshot {
  return Object.freeze({
    engineId: 'unified-clinical-workflow-orchestrator',
    generatedAt: generatedAt || tasks[0]?.updatedAt || new Date().toISOString(),
    tasks: Object.freeze([...tasks]),
    metrics: buildMetricsFromTasks(tasks),
    safetyStatement: ADMINISTRATIVE_AUTOMATION_SAFETY_STATEMENT,
  });
}

function carryForwardAiDecisionsFromQueue(
  backendTasks: readonly AdministrativeAutomationTask[],
  existingTasks: readonly AdministrativeAutomationTask[],
): AdministrativeAutomationTask[] {
  const existingById = new Map(existingTasks.map((task) => [task.id, task]));

  return backendTasks.map((task) => {
    if (taskHasAiDecision(task)) return task;
    const existing = existingById.get(task.id);
    if (!existing || !taskHasAiDecision(existing)) return task;
    return Object.freeze({
      ...task,
      proposedPayload: Object.freeze({
        ...task.proposedPayload,
        aiDecision: existing.proposedPayload.aiDecision,
      }),
    });
  });
}

/** Apply backend tasks without rebuilding the queue from local patient state. */
export async function mergeBackendAdministrativeAutomationTasks(
  backendTasks: readonly AdministrativeAutomationTask[],
): Promise<AdministrativeAutomationTask[]> {
  const state = useEmergencyStore.getState();
  const tasksWithCarriedDecisions = carryForwardAiDecisionsFromQueue(
    backendTasks,
    state.administrativeAutomationQueue,
  );

  if (!tasksWithCarriedDecisions.some(taskNeedsAiEnrichment)) {
    return [...tasksWithCarriedDecisions];
  }

  const snapshot = buildSnapshotFromTasks(tasksWithCarriedDecisions);
  const enriched = await enrichAdministrativeAutomationSnapshotWithAi(snapshot, {
    patients: state.patients,
    emsArrivals: state.emsArrivals,
  });
  return [...enriched.tasks];
}

export async function applyBackendAdministrativeAutomationQueue(
  backendTasks: readonly AdministrativeAutomationTask[],
): Promise<AdministrativeAutomationSnapshot> {
  const merged = await mergeBackendAdministrativeAutomationTasks(backendTasks);
  useEmergencyStore.getState().setAdministrativeAutomationQueue([...merged]);
  return buildSnapshotFromTasks(merged);
}

export async function runAdministrativeAutomationTick(now = new Date()) {
  const trace = startWorkflowTrace('administrative-automation-refresh', {
    source: 'administrativeAutomationEngine',
    summary: 'Administrative automation queue refresh',
  });
  const state = useEmergencyStore.getState();
  try {
    const snapshot = await buildEnrichedAdministrativeAutomationSnapshot({
      patients: state.patients,
      staff: state.staff,
      referrals: state.referrals,
      alerts: state.alerts,
      emsArrivals: state.emsArrivals,
      capacity: state.capacity,
      existingTasks: state.administrativeAutomationQueue,
      now,
    });
    state.setAdministrativeAutomationQueue([...snapshot.tasks]);
    trace.end('success', {
      taskCount: snapshot.tasks.length,
      pendingReview: snapshot.metrics.pendingReview,
    });
    return snapshot;
  } catch (error: unknown) {
    trace.end('error', {
      message: error instanceof Error ? error.message : String(error),
    });
    throw error;
  }
}

export async function runAdministrativeAutomationTickIfLocal(now = new Date()) {
  if (useEmergencyStore.getState().backendAvailable) return null;
  return runAdministrativeAutomationTick(now);
}

export function startAdministrativeAutomationEngine(intervalMs = 45_000): number {
  void runAdministrativeAutomationTickIfLocal();
  return window.setInterval(() => {
    void runAdministrativeAutomationTickIfLocal();
  }, intervalMs);
}
