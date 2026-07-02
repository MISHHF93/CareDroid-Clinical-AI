import {
  buildAutomationEngineContext,
  isAutomationEntitled,
} from '../config/automationEntitlement.config';
import { useEmergencyStore } from '../store/emergencyStore';
import { enrichAdministrativeAutomationSnapshotWithAi } from '../services/enrichAdministrativeAutomationsWithAi';
import { buildAdministrativeAutomationSnapshot } from '../services/unifiedClinicalWorkflowOrchestrator';
import type {
  AdministrativeAutomationCategory,
  AdministrativeAutomationSnapshot,
  AdministrativeAutomationTask,
} from '../types/administrativeAutomation';
import type { Alert, CapacitySnapshot, EMSArrival, Patient, Referral, Staff } from '../types/emergency';

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

export async function runAdministrativeAutomationTick(now = new Date()) {
  const state = useEmergencyStore.getState();
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
  return snapshot;
}

export function startAdministrativeAutomationEngine(intervalMs = 45_000): number {
  void runAdministrativeAutomationTick();
  return window.setInterval(() => {
    void runAdministrativeAutomationTick();
  }, intervalMs);
}