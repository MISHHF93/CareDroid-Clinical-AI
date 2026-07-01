import { useEmergencyStore } from '../store/emergencyStore';
import { buildAdministrativeAutomationSnapshot } from '../services/unifiedClinicalWorkflowOrchestrator';

export function runAdministrativeAutomationTick(now = new Date()) {
  const state = useEmergencyStore.getState();
  const snapshot = buildAdministrativeAutomationSnapshot({
    patients: state.patients,
    staff: state.staff,
    referrals: state.referrals,
    alerts: state.alerts,
    emsArrivals: state.emsArrivals,
    capacity: state.capacity,
    existingTasks: state.administrativeAutomationQueue,
    now,
  });
  state.setAdministrativeAutomationQueue(snapshot.tasks);
  return snapshot;
}

export function startAdministrativeAutomationEngine(intervalMs = 45_000): number {
  runAdministrativeAutomationTick();
  return window.setInterval(() => runAdministrativeAutomationTick(), intervalMs);
}