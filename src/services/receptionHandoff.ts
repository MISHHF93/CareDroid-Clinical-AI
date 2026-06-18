import { CANONICAL_ROUTES } from '../config/routes.config';
import { isBackendCapabilityEnabled } from '../config/backendApiCapabilities';
import { postReceptionHandoff } from './emergencyOsApi';
import { ensureEncounterAfterIntake, type IntakeEncounterSource } from './intakeEncounter';
import { getArrivalReasonFromPatient } from './intakeEncounterChain';
import { enterTriageQueue, WHITEBOARD_QUEUE_FILTER } from './queueAssignment';
import { buildClientTriageAssist, refreshTriageAssistFromBackend } from './triageAssist';
import { PatientState } from '../types/emergency';
import type { useEmergencyStore } from '../store/emergencyStore';

export type IntakeHandoffStore = Pick<
  ReturnType<typeof useEmergencyStore.getState>,
  | 'selectPatient'
  | 'setQueueFilter'
  | 'recordWorkflowAction'
  | 'movePatientToState'
  | 'patients'
  | 'emergencySettings'
  | 'updatePatient'
  | 'dispatchWebSocketEvent'
>;

export type IntakeHandoffSource =
  | 'quick-intake'
  | 'express-register'
  | 'smart-intake'
  | 'reception'
  | 'ems-convert'
  | 'prepare-patient'
  | 'whiteboard-central-intake'
  | 'patient-search'
  | 'provisional-intake';

/** @deprecated Use IntakeHandoffSource */
export type ReceptionHandoffSource = IntakeHandoffSource;

const HANDOFF_ENCOUNTER_SOURCE: Record<IntakeHandoffSource, IntakeEncounterSource> = {
  'quick-intake': 'walk-in',
  'express-register': 'walk-in',
  'smart-intake': 'smart-intake',
  reception: 'walk-in',
  'ems-convert': 'ems',
  'prepare-patient': 'smart-intake',
  'whiteboard-central-intake': 'walk-in',
  'patient-search': 'walk-in',
  'provisional-intake': 'smart-intake',
};

const HANDOFF_WORKFLOW_SOURCE: Record<IntakeHandoffSource, string> = {
  'quick-intake': 'quick-intake',
  'express-register': 'express-register',
  'smart-intake': 'smart-intake',
  reception: 'reception-workspace',
  'ems-convert': 'ems-pipeline',
  'prepare-patient': 'smart-intake',
  'whiteboard-central-intake': 'whiteboard-intake',
  'patient-search': 'patient-search',
  'provisional-intake': 'provisional-intake',
};

export type IntakeHandoffOptions = {
  patientId: string;
  source?: IntakeHandoffSource;
  actorName?: string;
  sessionId?: string;
};

export type IntakeHandoffResult = {
  receptionPath: string;
  whiteboardPath: string;
  queuesPath: string;
  encounterId: string | null;
  createdEncounter: boolean;
  queue: string;
  arrivalReason: string;
};

/** @deprecated Use IntakeHandoffOptions */
export type ReceptionHandoffOptions = IntakeHandoffOptions;

/** @deprecated Use IntakeHandoffResult */
export type ReceptionHandoffResult = IntakeHandoffResult;

function buildWhiteboardPath(patientId: string, encounterId: string | null): string {
  const params = new URLSearchParams({ patient: patientId });
  if (encounterId) params.set('encounter', encounterId);
  return `${CANONICAL_ROUTES.emergencyWhiteboard}?${params.toString()}`;
}

/** Navigation targets after intake handoff without re-running queue assignment. */
export function buildPostHandoffNavigationPaths(
  patientId: string,
  encounterId: string | null = null,
): Pick<IntakeHandoffResult, 'receptionPath' | 'whiteboardPath' | 'queuesPath'> {
  return {
    receptionPath: `${CANONICAL_ROUTES.emergencyReception}?arrived=${encodeURIComponent(patientId)}`,
    whiteboardPath: buildWhiteboardPath(patientId, encounterId),
    queuesPath: `${CANONICAL_ROUTES.emergencyReception}?queue=${encodeURIComponent('pretriage')}&patient=${encodeURIComponent(patientId)}`,
  };
}

function syncOperationalSurfaces(
  store: IntakeHandoffStore,
  options: {
    patientId: string;
    encounterId: string | null;
    source: IntakeHandoffSource;
    actorName?: string;
    arrivalReason?: string;
    queue?: string;
  },
) {
  const queue = options.queue || WHITEBOARD_QUEUE_FILTER.triage;
  store.dispatchWebSocketEvent?.({
    type: 'intake_handoff_complete',
    payload: {
      patientId: options.patientId,
      encounterId: options.encounterId,
      arrivalReason: options.arrivalReason,
      queue,
      source: options.source,
      surfaces: ['triage-queue', 'whiteboard', 'operational-snapshot'],
      generatedAt: new Date().toISOString(),
    },
  });

  store.recordWorkflowAction({
    type: 'integration_event_received',
    summary: `Intake chain synced: patient, encounter, arrival reason, and ${queue} queue.`,
    patientId: options.patientId,
    actorName: options.actorName,
    source: 'intake-handoff',
    metadata: {
      handoff: 'intake.complete',
      intakeSource: options.source,
      patientId: options.patientId,
      encounterId: options.encounterId,
      arrivalReason: options.arrivalReason,
      queue,
      targetState: PatientState.Triage,
      surfaces: ['triage-queue', 'whiteboard', 'operational-snapshot'],
    },
  });
}

/**
 * Canonical post-intake handoff: triage queue assignment, encounter creation,
 * patient selection, and operational surface sync.
 */
export function completeIntakeHandoff(
  store: IntakeHandoffStore,
  options: IntakeHandoffOptions,
): IntakeHandoffResult {
  const { patientId, source = 'reception', actorName, sessionId } = options;

  const patient = store.patients.find((entry) => entry.id === patientId);
  if (!patient) {
    return {
      receptionPath: CANONICAL_ROUTES.emergencyReception,
      whiteboardPath: CANONICAL_ROUTES.emergencyWhiteboard,
      queuesPath: `${CANONICAL_ROUTES.emergencyReception}?queue=pretriage`,
      encounterId: null,
      createdEncounter: false,
      queue: WHITEBOARD_QUEUE_FILTER.triage,
      arrivalReason: '',
    };
  }

  const queue = WHITEBOARD_QUEUE_FILTER.triage;
  const arrivalReason = getArrivalReasonFromPatient(patient);

  enterTriageQueue(store, {
    patientId,
    source,
    actorName,
    actorId: 'intake-handoff',
    note: `Intake handoff to triage queue (${source}) — ${arrivalReason}.`,
    recordWorkflow: false,
  });

  store.selectPatient(patientId);
  store.recordWorkflowAction({
    type: 'journey_state_changed',
    summary: `Patient handed off to triage queue after ${source}.`,
    patientId,
    actorName,
    source: HANDOFF_WORKFLOW_SOURCE[source],
    metadata: {
      handoff: 'reception.handoff',
      source,
      queue,
      targetState: PatientState.Triage,
      arrivalReason,
      complaintCategory: patient.complaintCategory || 'Other',
    },
  });

  const encounterResult = ensureEncounterAfterIntake(store, {
    patientId,
    source: HANDOFF_ENCOUNTER_SOURCE[source],
    sessionId,
    actorName,
    queue,
  });

  syncOperationalSurfaces(store, {
    patientId,
    encounterId: encounterResult.encounterId,
    source,
    actorName,
    arrivalReason,
    queue,
  });

  const triageAssist = buildClientTriageAssist(
    { ...patient, state: PatientState.Triage },
    store.patients,
    {
      arrivalReason,
      complaintCategory: patient.complaintCategory,
      handoffSource: source,
    },
  );

  store.updatePatient(patientId, {
    triageAssist,
    triageAssistGeneratedAt: triageAssist.generatedAt,
  });

  if (isBackendCapabilityEnabled('emergencyTriageAssist')) {
    void refreshTriageAssistFromBackend(patientId, {
      arrivalReason,
      complaintCategory: patient.complaintCategory,
      handoffSource: source,
    })
      .then((backendAssist) => {
        if (backendAssist) {
          store.updatePatient(patientId, {
            triageAssist: backendAssist,
            triageAssistGeneratedAt: backendAssist.generatedAt,
          });
        }
      })
      .catch(() => undefined);
  }

  if (isBackendCapabilityEnabled('emergencyReceptionHandoff')) {
    void postReceptionHandoff({
      patientId,
      source,
      actorName,
      encounterId: encounterResult.encounterId,
      arrivalReason,
      complaintCategory: patient.complaintCategory,
      queue,
      triageAssist,
      triageAssistGeneratedAt: triageAssist.generatedAt,
    }).catch(() => undefined);
  }

  return {
    receptionPath: `${CANONICAL_ROUTES.emergencyReception}?arrived=${encodeURIComponent(patientId)}`,
    whiteboardPath: buildWhiteboardPath(patientId, encounterResult.encounterId),
    queuesPath: `${CANONICAL_ROUTES.emergencyReception}?queue=${encodeURIComponent('pretriage')}&patient=${encodeURIComponent(patientId)}`,
    encounterId: encounterResult.encounterId,
    createdEncounter: encounterResult.created,
    queue,
    arrivalReason,
  };
}

/** Reception-context alias for completeIntakeHandoff. */
export function completeReceptionHandoff(
  store: IntakeHandoffStore,
  options: IntakeHandoffOptions,
): IntakeHandoffResult {
  return completeIntakeHandoff(store, options);
}
