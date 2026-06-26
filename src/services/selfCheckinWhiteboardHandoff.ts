import type { useEmergencyStore } from '../store/emergencyStore';
import { registerArrivalControl } from './arrivalControlLayer';
import {
  completeIntakeHandoff,
  refreshIntakeHandoffSurfaces,
  type IntakeHandoffResult,
} from './receptionHandoff';
import type { Patient } from '../types/emergency';
import type { SelfCheckinBuildResult } from './selfCheckinService';

export type SelfCheckinHandoffStore = Pick<
  ReturnType<typeof useEmergencyStore.getState>,
  | 'addPatient'
  | 'patients'
  | 'updatePatient'
  | 'movePatientToState'
  | 'selectPatient'
  | 'setQueueFilter'
  | 'recordWorkflowAction'
  | 'emergencySettings'
  | 'dispatchWebSocketEvent'
  | 'updateCapacity'
  | 'updateAlerts'
  | 'initializeFromBackend'
>;

export type SelfCheckinWhiteboardHandoffOptions = {
  syncToBackend?: boolean;
  actorName?: string;
};

function withPersistedPatient(
  store: SelfCheckinHandoffStore,
  patient: Patient,
): SelfCheckinHandoffStore {
  if (store.patients.some((entry) => entry.id === patient.id)) {
    return store;
  }

  return {
    ...store,
    patients: [...store.patients, patient],
  };
}

/**
 * Reception-first handoff: persist self-check-in patient, register arrival control,
 * assign triage queue, and sync whiteboard operational surfaces.
 */
export function completeSelfCheckinWhiteboardHandoff(
  store: SelfCheckinHandoffStore,
  result: SelfCheckinBuildResult,
  options: SelfCheckinWhiteboardHandoffOptions = {},
): IntakeHandoffResult {
  store.addPatient(result.patient, { syncToBackend: options.syncToBackend ?? false });
  const handoffStore = withPersistedPatient(store, result.patient);

  registerArrivalControl(handoffStore as unknown as Parameters<typeof registerArrivalControl>[0], result.patient.id, {
    source: 'self-check-in',
    destination: 'triage-queue',
  });

  const handoff = completeIntakeHandoff(handoffStore, {
    patientId: result.patient.id,
    source: 'self-check-in',
    actorName: options.actorName ?? 'self-arrival',
  });

  refreshIntakeHandoffSurfaces(handoffStore);

  return handoff;
}