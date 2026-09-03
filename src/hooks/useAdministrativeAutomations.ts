import { useCallback, useMemo } from 'react';
import {
  applyBackendAdministrativeAutomationQueue,
  mergeBackendAdministrativeAutomationTasks,
} from '../engine/administrativeAutomationEngine';
import { useEmergencyStore } from '../store/emergencyStore';
import { fetchWorkflowOrchestration, reviewWorkflowAutomation } from '../services/emergencyOsApi';
import {
  extractWorkflowOrchestrationTasks,
  logEmergencyApiWarning,
  unwrapEmergencyEnvelope,
} from '../services/emergencyApiHelpers';
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
          documentation_handoff: queue.filter((task) => task.category === 'documentation_handoff')
            .length,
          ai_patient_summary: queue.filter((task) => task.category === 'ai_patient_summary').length,
          triage_preparation: queue.filter((task) => task.category === 'triage_preparation').length,
          department_notification: queue.filter(
            (task) => task.category === 'department_notification',
          ).length,
          staff_assignment: queue.filter((task) => task.category === 'staff_assignment').length,
          queue_prioritization: queue.filter((task) => task.category === 'queue_prioritization')
            .length,
          escalation_workflow: queue.filter((task) => task.category === 'escalation_workflow')
            .length,
        },
      },
      safetyStatement:
        'Administrative automations are advisory until a licensed clinician approves, modifies, or overrides each task.',
    };
  }, [queue]);

  const refresh = useCallback(async () => {
    if (backendAvailable) {
      try {
        const response = await fetchWorkflowOrchestration();
        const tasks = extractWorkflowOrchestrationTasks(response) as
          | AdministrativeAutomationTask[]
          | null;
        if (tasks?.length) {
          return applyBackendAdministrativeAutomationQueue(tasks);
        }
      } catch (error) {
        logEmergencyApiWarning('useAdministrativeAutomations.refresh', error, {
          endpoint: '/api/emergency/workflow-orchestration',
        });
      }
    }
    return refreshLocal();
  }, [backendAvailable, refreshLocal]);

  const review = useCallback(
    async (
      input: Omit<ReviewAdministrativeAutomationInput, 'actorStaffId'> & { actorStaffId?: string },
    ) => {
      const actorStaffId = input.actorStaffId || activeShift.chargeStaffId || 'charge-nurse';
      const payload = { ...input, actorStaffId };
      if (backendAvailable) {
        try {
          const response = await reviewWorkflowAutomation(payload as Record<string, unknown>);
          const data = unwrapEmergencyEnvelope<{
            task?: AdministrativeAutomationTask | null;
            snapshot?: AdministrativeAutomationSnapshot;
          }>(response);
          const tasks = data?.snapshot?.tasks ?? extractWorkflowOrchestrationTasks(response);
          if (Array.isArray(tasks)) {
            const merged = await mergeBackendAdministrativeAutomationTasks(
              tasks as AdministrativeAutomationTask[],
            );
            setQueue([...merged]);
            return data?.task ?? null;
          }
          if (data?.task) {
            return data.task;
          }
          return null;
        } catch (error) {
          logEmergencyApiWarning('useAdministrativeAutomations.review', error, {
            endpoint: '/api/emergency/workflow-orchestration/review',
            taskId: payload.taskId,
          });
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
