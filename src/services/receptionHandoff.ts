import { CANONICAL_ROUTES } from '../config/routes.config';
import { getTriagePendingQueuePath } from '../config/triageScreenModel';
import { isBackendCapabilityEnabled } from '../config/backendApiCapabilities';
import { postReceptionHandoff } from './emergencyOsApi';
import { ensureEncounterAfterIntake, type IntakeEncounterSource } from './intakeEncounter';
import { getArrivalReasonFromPatient } from './intakeEncounterChain';
import { recordFirstContact, stampArrivalControlLayer } from './arrivalControlLayer';
import { resolveWorkflowRouteForState } from '../config/unifiedPatientWorkflowModel';
import { afterPatientWorkflowTransition } from './unifiedPatientWorkflowOrchestrator';
import { enterTriageQueue, WHITEBOARD_QUEUE_FILTER } from './queueAssignment';
import { buildClientTriageAssist, refreshTriageAssistFromBackend } from './triageAssist';
import { stampPatientArrivalAtHandoff } from './patientArrivalModel';
import { formatSyncRecoveryMessage } from '../config/errorRecoveryModel';
import { PatientState } from '../types/emergency';
import type { useEmergencyStore } from '../store/emergencyStore';
import { startWorkflowTrace } from './observabilityTrace';

export type IntakeHandoffStore = Pick<
  ReturnType<typeof useEmergencyStore.getState>,
  | 'selectPatient'
  | 'setQueueFilter'
  | 'recordWorkflowAction'
  | 'movePatientToState'
  | 'patients'
  | 'referrals'
  | 'emergencySettings'
  | 'updatePatient'
  | 'dispatchWebSocketEvent'
  | 'updateCapacity'
  | 'updateAlerts'
  | 'refreshAdministrativeAutomationsAsync'
>;

export type IntakeHandoffSource =
  | 'quick-intake'
  | 'express-register'
  | 'reception-quick-intake'
  | 'smart-intake'
  | 'self-check-in'
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
  'reception-quick-intake': 'walk-in',
  'smart-intake': 'smart-intake',
  'self-check-in': 'self-check-in',
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
  'reception-quick-intake': 'reception-quick-intake',
  'smart-intake': 'smart-intake',
  'self-check-in': 'self-arrival-check-in',
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
  /** Canonical next surface after handoff — triage queue with patient context. */
  nextRoute: string;
  encounterId: string | null;
  createdEncounter: boolean;
  queue: string;
  arrivalReason: string;
  syncPending?: boolean;
  syncErrors?: string[];
};

/** @deprecated Use IntakeHandoffOptions */
export type ReceptionHandoffOptions = IntakeHandoffOptions;

/** @deprecated Use IntakeHandoffResult */
export type ReceptionHandoffResult = IntakeHandoffResult;

/** Refresh reception, whiteboard, and operational snapshot consumers after intake handoff. */
export function refreshIntakeHandoffSurfaces(
  store: Pick<
    ReturnType<typeof useEmergencyStore.getState>,
    'updateCapacity' | 'updateAlerts' | 'initializeFromBackend'
  >,
) {
  store.updateCapacity?.();
  store.updateAlerts?.();
  void store.initializeFromBackend?.();
}

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
    queuesPath: getTriagePendingQueuePath(patientId),
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
    priorState?: PatientState;
  },
) {
  afterPatientWorkflowTransition(store, {
    patientId: options.patientId,
    fromState: options.priorState || PatientState.Registration,
    toState: PatientState.Triage,
    source: 'intake-handoff',
    actorName: options.actorName,
    encounterId: options.encounterId,
  });

  store.dispatchWebSocketEvent?.({
    type: 'intake_handoff_complete',
    payload: {
      patientId: options.patientId,
      encounterId: options.encounterId,
      arrivalReason: options.arrivalReason,
      queue: options.queue || WHITEBOARD_QUEUE_FILTER.triage,
      source: options.source,
      surfaces: 'triage-queue,whiteboard,operational-snapshot',
      generatedAt: new Date().toISOString(),
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
  const trace = startWorkflowTrace('patient-intake-handoff', {
    patientId,
    source,
    summary: `Intake handoff (${source})`,
    metadata: { actorName, sessionId },
  });

  const patient = store.patients.find((entry) => entry.id === patientId);
  const priorState = patient?.state;
  if (!patient) {
    trace.end('error', { reason: 'patient_not_found' });
    return {
      receptionPath: CANONICAL_ROUTES.emergencyReception,
      whiteboardPath: CANONICAL_ROUTES.emergencyWhiteboard,
      queuesPath: getTriagePendingQueuePath(),
      nextRoute: getTriagePendingQueuePath(),
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

  recordFirstContact(store as unknown as Parameters<typeof recordFirstContact>[0], patientId, {
    actorName,
    source: 'intake-handoff',
    note: `First contact at intake handoff (${source}).`,
  });

  stampArrivalControlLayer(store as unknown as Parameters<typeof stampArrivalControlLayer>[0], patientId, {
    triagePending: true,
    registrationStatus: 'complete',
    queueDestination: 'triage-queue',
  });

  const patientAfterStamp = store.patients.find((entry) => entry.id === patientId);
  if (patientAfterStamp) {
    store.updatePatient(patientId, stampPatientArrivalAtHandoff(patientAfterStamp));
  }

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
    priorState,
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
            ...(({ handoffSyncPending: false, handoffSyncError: undefined } as unknown) as Partial<import('../types/emergency').Patient>),
          });
        }
      })
      .catch((error) => {
        store.updatePatient(patientId, ({ handoffSyncPending: true, handoffSyncError: formatSyncRecoveryMessage(error) } as unknown) as Partial<import('../types/emergency').Patient>);
      });
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
    }).catch((error) => {
      store.updatePatient(patientId, ({ handoffSyncPending: true, handoffSyncError: formatSyncRecoveryMessage(error) } as unknown) as Partial<import('../types/emergency').Patient>);
    });
  }

  const syncPending =
    isBackendCapabilityEnabled('emergencyTriageAssist') ||
    isBackendCapabilityEnabled('emergencyReceptionHandoff');

  void import('./emergencyCareJourneyOrchestrator').then(({ onPatientArrivalAtReception, onRapidIntakeCompleted }) => {
    onPatientArrivalAtReception(patientId, { actorName });
    const latest = store.patients.find((entry) => entry.id === patientId);
    if (latest) {
      onRapidIntakeCompleted(latest, { actorName });
    }
  });

  const result = {
    receptionPath: `${CANONICAL_ROUTES.emergencyReception}?arrived=${encodeURIComponent(patientId)}`,
    whiteboardPath: buildWhiteboardPath(patientId, encounterResult.encounterId),
    queuesPath: getTriagePendingQueuePath(patientId),
    nextRoute: resolveWorkflowRouteForState(PatientState.Triage, patientId),
    encounterId: encounterResult.encounterId,
    createdEncounter: encounterResult.created,
    queue,
    arrivalReason,
    syncPending,
  };
  trace.end('success', {
    encounterId: encounterResult.encounterId,
    createdEncounter: encounterResult.created,
    queue,
    syncPending,
  });
  return result;
}

/** Reception-context alias for completeIntakeHandoff. */
export function completeReceptionHandoff(
  store: IntakeHandoffStore,
  options: IntakeHandoffOptions,
): IntakeHandoffResult {
  return completeIntakeHandoff(store, options);
}
