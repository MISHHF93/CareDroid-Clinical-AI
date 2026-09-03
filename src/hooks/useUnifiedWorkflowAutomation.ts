import { useCallback, useEffect, useMemo } from 'react';
import { useLocation } from 'react-router-dom';
import useAdministrativeAutomations from './useAdministrativeAutomations';
import useThreeMinuteMission from './useThreeMinuteMission';
import { buildUnifiedWorkflowAutomationSnapshot } from '../services/unifiedWorkflowAutomationService';
import { getLastWorkflowAutomationBackendEvent } from '../engine/unifiedWorkflowAutomationEngine';
import { useEmergencyStore } from '../store/emergencyStore';
import type { ReviewAdministrativeAutomationInput } from '../types/administrativeAutomation';

export function useUnifiedWorkflowAutomation(options: { realtime?: boolean } = {}) {
  const { pathname } = useLocation();
  const { snapshot: adminSnapshot, pendingTasks, refresh, review } = useAdministrativeAutomations();
  // Mission bar owns the 1s realtime tick; unified workflow reads snapshot from store/service.
  const missionState = useThreeMinuteMission({ realtime: false });
  const backendAvailable = useEmergencyStore((state) => state.backendAvailable);
  const activeShift = useEmergencyStore((state) => state.activeShift);
  const patients = useEmergencyStore((state) => state.patients);
  const patientFlowSnapshot = useEmergencyStore((state) => state.patientFlowSnapshot);

  useEffect(() => {
    if (options.realtime === false) return undefined;
    const timer = window.setInterval(() => {
      void refresh();
    }, 30_000);
    return () => window.clearInterval(timer);
  }, [options.realtime, refresh, backendAvailable]);

  const snapshot = useMemo(
    () =>
      buildUnifiedWorkflowAutomationSnapshot({
        administrativeTasks: adminSnapshot.tasks,
        patients,
        patientFlowSnapshot,
        pathname,
        lastBackendEventType: getLastWorkflowAutomationBackendEvent(),
      }),
    [
      adminSnapshot.tasks,
      patients,
      patientFlowSnapshot,
      pathname,
      missionState.snapshot.generatedAt,
      pendingTasks.length,
    ],
  );

  const pendingItems = useMemo(
    () =>
      snapshot.items.filter((item) => item.status === 'pending_review' || item.status === 'active'),
    [snapshot.items],
  );

  const reviewItem = useCallback(
    async (
      itemId: string,
      decision: ReviewAdministrativeAutomationInput['decision'] = 'approve',
      extra: Partial<ReviewAdministrativeAutomationInput> = {},
    ) => {
      const item = snapshot.items.find((entry) => entry.id === itemId);
      if (!item?.linkedTaskId) return null;
      return review({
        taskId: item.linkedTaskId,
        decision,
        actorStaffId: extra.actorStaffId || activeShift.chargeStaffId || 'charge-nurse',
        actorName: extra.actorName,
        modifiedAction: extra.modifiedAction,
        overrideReason: extra.overrideReason,
        executeOnApprove: decision === 'approve',
      });
    },
    [activeShift.chargeStaffId, review, snapshot.items],
  );

  const acknowledgeItem = useCallback(
    (itemId: string, actorId: string) => {
      const item = snapshot.items.find((entry) => entry.id === itemId);
      if (!item?.linkedMissionId) return null;
      return missionState.acknowledgeMission(item.linkedMissionId, actorId);
    },
    [missionState, snapshot.items],
  );

  return useMemo(
    () =>
      Object.freeze({
        snapshot,
        items: snapshot.items,
        pendingItems,
        topItem: pendingItems[0] ?? null,
        pendingCount: snapshot.pendingReview,
        criticalCount: snapshot.metrics.critical,
        clicksSavedEstimate: snapshot.metrics.clicksSavedEstimate,
        refresh,
        reviewItem,
        acknowledgeItem,
      }),
    [snapshot, pendingItems, refresh, reviewItem, acknowledgeItem],
  );
}

export default useUnifiedWorkflowAutomation;
