import type { useEmergencyStore } from '../store/emergencyStore';
import { registerArrivalControl } from './arrivalControlLayer';
import { syncReceptionPatientToBackend } from './receptionIntakeOrchestrator';
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
  | 'referrals'
  | 'refreshAdministrativeAutomationsAsync'
>;

export type SelfCheckinWhiteboardHandoffOptions = {
  syncToBackend?: boolean;
  actorName?: string;
};

export type SelfCheckinWhiteboardHandoffResult = {
  handoff: IntakeHandoffResult;
  /**
   * Whether the patient actually reached the shared backend. self-arrival is
   * the one intake surface with no staff device physically present at
   * submission -- unlike reception's own "local-first, backend sync awaited"
   * pattern (createPatientAndRouteFromReception), a kiosk that only updates
   * its OWN browser's local store is invisible to every other device, so the
   * confirmation screen must not claim success until this is known.
   */
  backendSynced: boolean;
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
 *
 * Local-first create (immediate UI feedback on the kiosk itself); backend sync
 * is awaited explicitly, same pattern as reception's own
 * createPatientAndRouteFromReception -- reuses that same
 * syncReceptionPatientToBackend() call (same backend route, same duplicate
 * guard) rather than a second write path. Was previously local-only
 * (syncToBackend always false, no backend call anywhere in this flow): a
 * kiosk patient existed only in that kiosk's own browser tab, invisible to
 * every staff device, while the confirmation screen unconditionally told the
 * patient "you are checked in... a nurse will call you." backendSynced on
 * the result lets the caller withhold that promise until it's actually true.
 */
export async function completeSelfCheckinWhiteboardHandoff(
  store: SelfCheckinHandoffStore,
  result: SelfCheckinBuildResult,
  options: SelfCheckinWhiteboardHandoffOptions = {},
): Promise<SelfCheckinWhiteboardHandoffResult> {
  store.addPatient(result.patient, { syncToBackend: false });
  const handoffStore = withPersistedPatient(store, result.patient);

  registerArrivalControl(
    handoffStore as unknown as Parameters<typeof registerArrivalControl>[0],
    result.patient.id,
    {
      source: 'self-check-in',
      destination: 'triage-queue',
    },
  );

  const handoff = completeIntakeHandoff(handoffStore, {
    patientId: result.patient.id,
    source: 'self-check-in',
    actorName: options.actorName ?? 'self-arrival',
  });

  refreshIntakeHandoffSurfaces(handoffStore);

  const backendSync =
    options.syncToBackend === false
      ? { status: 'skipped' as const }
      : await syncReceptionPatientToBackend(result.patient);
  const backendSynced = backendSync.status === 'synced';
  if (backendSync.status === 'failed') {
    handoffStore.updatePatient(result.patient.id, {
      handoffSyncPending: true,
      handoffSyncError: backendSync.error,
    } as unknown as Partial<Patient>);
  }

  return { handoff, backendSynced };
}
