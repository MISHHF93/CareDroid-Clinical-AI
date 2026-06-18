import { CANONICAL_ROUTES } from '../config/routes.config';
import { isBackendCapabilityEnabled } from '../config/backendApiCapabilities';
import { postReceptionHandoff } from './emergencyOsApi';
import { ensureEncounterAfterIntake } from './intakeEncounter';
import { enterTriageQueue } from './queueAssignment';
import { PatientState } from '../types/emergency';
import type { useEmergencyStore } from '../store/emergencyStore';

type ReceptionHandoffStore = Pick<
  ReturnType<typeof useEmergencyStore.getState>,
  | 'selectPatient'
  | 'setQueueFilter'
  | 'recordWorkflowAction'
  | 'movePatientToState'
  | 'patients'
  | 'emergencySettings'
  | 'updatePatient'
>;

export type ReceptionHandoffSource =
  | 'quick-intake'
  | 'smart-intake'
  | 'reception'
  | 'ems-convert'
  | 'prepare-patient';

const HANDOFF_ENCOUNTER_SOURCE: Record<ReceptionHandoffSource, 'walk-in' | 'smart-intake' | 'ems'> = {
  'quick-intake': 'walk-in',
  'smart-intake': 'smart-intake',
  reception: 'walk-in',
  'ems-convert': 'ems',
  'prepare-patient': 'smart-intake',
};

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

  enterTriageQueue(store, {
    patientId,
    source,
    actorName,
    actorId: 'reception-handoff',
    note: `Reception handoff to triage queue (${source}).`,
    recordWorkflow: false,
  });

  store.selectPatient(patientId);
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

  ensureEncounterAfterIntake(store, {
    patientId,
    source: HANDOFF_ENCOUNTER_SOURCE[source],
    actorName,
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
