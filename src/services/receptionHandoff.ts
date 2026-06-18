import { CANONICAL_ROUTES } from '../config/routes.config';
import { isBackendCapabilityEnabled } from '../config/backendApiCapabilities';
import { postReceptionHandoff } from './emergencyOsApi';
import { PatientState } from '../types/emergency';
import type { useEmergencyStore } from '../store/emergencyStore';

type ReceptionHandoffStore = Pick<
  ReturnType<typeof useEmergencyStore.getState>,
  'selectPatient' | 'setQueueFilter' | 'recordWorkflowAction' | 'movePatientToState' | 'patients'
>;

export type ReceptionHandoffSource =
  | 'quick-intake'
  | 'smart-intake'
  | 'reception'
  | 'ems-convert'
  | 'prepare-patient';

export type ReceptionHandoffOptions = {
  patientId: string;
  source?: ReceptionHandoffSource;
  actorName?: string;
};

export type ReceptionHandoffResult = {
  receptionPath: string;
  whiteboardPath: string;
  queuesPath: string;
};

export function completeReceptionHandoff(
  store: ReceptionHandoffStore,
  options: ReceptionHandoffOptions,
): ReceptionHandoffResult {
  const { patientId, source = 'reception', actorName } = options;
  const patient = store.patients.find((entry) => entry.id === patientId);

  if (patient && patient.state !== PatientState.Triage) {
    store.movePatientToState(patientId, PatientState.Triage, {
      staffId: 'reception-handoff',
      note: `Reception handoff to triage queue (${source}).`,
    });
  }

  store.selectPatient(patientId);
  store.setQueueFilter('Triage');
  store.recordWorkflowAction({
    type: 'journey_state_changed',
    summary: `Patient handed off from reception to triage queue (${source}).`,
    patientId,
    actorName,
    source: 'reception-workspace',
    metadata: {
      handoff: 'reception.handoff',
      source,
      queue: 'Triage',
      targetState: PatientState.Triage,
    },
  });

  if (isBackendCapabilityEnabled('emergencyReceptionHandoff')) {
    void postReceptionHandoff({ patientId, source, actorName }).catch(() => undefined);
  }

  return {
    receptionPath: `${CANONICAL_ROUTES.emergencyReception}?arrived=${encodeURIComponent(patientId)}`,
    whiteboardPath: `${CANONICAL_ROUTES.emergencyWhiteboard}?patient=${encodeURIComponent(patientId)}`,
    queuesPath: `${CANONICAL_ROUTES.emergencyReception}?queue=${encodeURIComponent('pretriage')}&patient=${encodeURIComponent(patientId)}`,
  };
}
