import { useCallback, useMemo } from 'react';
import { buildEnrichedAdministrativeAutomationSnapshot } from '../engine/administrativeAutomationEngine';
import { useEmergencyStore } from '../store/emergencyStore';
import { fetchWorkflowOrchestration, reviewWorkflowAutomation } from '../services/emergencyOsApi';
import type {
  AdministrativeAutomationSnapshot,
  AdministrativeAutomationTask,
  ReviewAdministrativeAutomationInput,
} from '../types/administrativeAutomation';

export function useAdministrativeAutomations() {
  const queue = useEmergencyStore((state) => state.administrativeAutomationQueue);
  const refreshLocal = useEmergencyStore((state) => state.refreshAdministrativeAutomationsAsync);
  const reviewLocal = useEmergencyStore((state) => state.reviewAdministrativeAutomation);
  const setQueue = useEmergencyStore((state) => state.setAdministrativeAutomationQueue);
  const backendAvailable = useEmergencyStore((state) => state.backendAvailable);
  const activeShift = useEmergencyStore((state) => state.activeShift);

  const snapshot = useMemo<AdministrativeAutomationSnapshot>(() => {
    const pendingReview = queue.filter((task) => task.status === 'pending_review').length;
    return {
      engineId: 'unified-clinical-workflow-orchestrator',
      generatedAt: queue[0]?.updatedAt || new Date().toISOString(),
      tasks: queue,
      metrics: {
        pendingReview,
        executedToday: queue.filter((task) => task.status === 'executed').length,
        overridden: queue.filter((task) => task.status === 'overridden').length,
        byCategory: {
          patient_routing: queue.filter((task) => task.category === 'patient_routing').length,
          documentation_handoff: queue.filter((task) => task.category === 'documentation_handoff').length,
          ai_patient_summary: queue.filter((task) => task.category === 'ai_patient_summary').length,
          triage_preparation: queue.filter((task) => task.category === 'triage_preparation').length,
          department_notification: queue.filter((task) => task.category === 'department_notification').length,
          staff_assignment: queue.filter((task) => task.category === 'staff_assignment').length,
          queue_prioritization: queue.filter((task) => task.category === 'queue_prioritization').length,
          escalation_workflow: queue.filter((task) => task.category === 'escalation_workflow').length,
        },
      },
      safetyStatement:
        'Administrative automations are advisory until a licensed clinician approves, modifies, or overrides each task.',
    };
  }, [queue]);

  const refresh = useCallback(async () => {
    if (backendAvailable) {
      try {
        const envelope = (await fetchWorkflowOrchestration()) as {
          data?: { tasks?: AdministrativeAutomationTask[]; snapshot?: AdministrativeAutomationSnapshot };
        };
        const tasks = envelope?.data?.tasks || envelope?.data?.snapshot?.tasks;
        if (tasks) {
          const state = useEmergencyStore.getState();
          const enrichedSnapshot = await buildEnrichedAdministrativeAutomationSnapshot({
            patients: state.patients,
            staff: state.staff,
            referrals: state.referrals,
            alerts: state.alerts,
            emsArrivals: state.emsArrivals,
            capacity: state.capacity,
            existingTasks: tasks,
          });
          setQueue([...enrichedSnapshot.tasks]);
          return enrichedSnapshot;
        }
      } catch {
        // Fall back to local orchestrator snapshot.
      }
    }
    return refreshLocal();
  }, [backendAvailable, refreshLocal, setQueue, snapshot]);

  const review = useCallback(
    async (input: Omit<ReviewAdministrativeAutomationInput, 'actorStaffId'> & { actorStaffId?: string }) => {
      const actorStaffId = input.actorStaffId || activeShift.chargeStaffId || 'charge-nurse';
      const payload = { ...input, actorStaffId };
      if (backendAvailable) {
        try {
          await reviewWorkflowAutomation(payload as Record<string, unknown>);
        } catch {
          // Local review still records audit trail when backend is unavailable.
        }
      }
      return reviewLocal(payload);
    },
    [activeShift.chargeStaffId, backendAvailable, reviewLocal],
  );

  const pendingTasks = useMemo(
    () => queue.filter((task) => task.status === 'pending_review'),
    [queue],
  );

  return {
    snapshot,
    tasks: queue,
    pendingTasks,
    refresh,
    review,
  };
}

export default useAdministrativeAutomations;