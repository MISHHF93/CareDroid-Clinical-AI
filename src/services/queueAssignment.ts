import { isEmsRegistrationPatient } from '../components/reception/receptionQueueModel';
import { movePatientToState as moveWithJourneyRules } from '../../engine/journeyEngine';
import { PatientFlag, PatientState, type Patient } from '../types/emergency';
import type { useEmergencyStore } from '../store/emergencyStore';
import QueueIntelligenceService from './queueIntelligenceService';
import { getPatientDisplayName } from '../utils/patientSearch';

export const WHITEBOARD_QUEUE_FILTER = Object.freeze({
  triage: 'Triage',
  waiting: 'Waiting',
  ems: 'EMS',
  reassessment: 'Reassessment',
});

export const RECEPTION_QUEUE_TAB = Object.freeze({
  ems: 'ems',
  verification: 'verification',
  pretriage: 'pretriage',
});

export type QueueAssignmentStore = Pick<
  ReturnType<typeof useEmergencyStore.getState>,
  | 'patients'
  | 'movePatientToState'
  | 'updatePatient'
  | 'setQueueFilter'
  | 'selectPatient'
  | 'recordWorkflowAction'
  | 'emergencySettings'
>;

export type IntakeQueueSettings = {
  intakeSettings?: {
    autoAssignTriageQueue?: boolean;
    autoAssignWaitingQueue?: boolean;
  };
};

export function isAutoAssignTriageQueueEnabled(settings?: IntakeQueueSettings | null): boolean {
  return settings?.intakeSettings?.autoAssignTriageQueue !== false;
}

export function isAutoAssignWaitingQueueEnabled(settings?: IntakeQueueSettings | null): boolean {
  return settings?.intakeSettings?.autoAssignWaitingQueue !== false;
}

export function receptionTabToWhiteboardFilter(tabId: string): string | null {
  if (tabId === RECEPTION_QUEUE_TAB.pretriage) return WHITEBOARD_QUEUE_FILTER.triage;
  if (tabId === RECEPTION_QUEUE_TAB.ems) return WHITEBOARD_QUEUE_FILTER.ems;
  return null;
}

export function isPatientInEmsRegistrationQueue(patient: {
  state?: PatientState | string;
  flags?: unknown[];
}) {
  return (
    isEmsRegistrationPatient(patient) &&
    (patient.state === PatientState.Registration || patient.state === PatientState.Arrival)
  );
}

export function enterTriageQueue(
  store: QueueAssignmentStore,
  options: {
    patientId: string;
    source?: string;
    actorName?: string;
    actorId?: string;
    note?: string;
    syncWhiteboardFilter?: boolean;
    recordWorkflow?: boolean;
  },
) {
  const patient = store.patients.find((entry) => entry.id === options.patientId);
  if (!patient) {
    return { ok: false as const, reason: 'not_found' as const };
  }

  const staffId = options.actorId || 'queue-assignment';
  const note =
    options.note ||
    `Assigned to triage queue${options.source ? ` (${options.source})` : ''}.`;

  if (patient.state !== PatientState.Triage) {
    store.movePatientToState(options.patientId, PatientState.Triage, {
      staffId,
      note,
    });
  }

  if (!patient.triageTime) {
    store.updatePatient(options.patientId, {
      triageTime: new Date().toISOString(),
    });
  }

  const syncFilter =
    options.syncWhiteboardFilter !== false &&
    isAutoAssignTriageQueueEnabled(store.emergencySettings);
  if (syncFilter) {
    store.setQueueFilter(WHITEBOARD_QUEUE_FILTER.triage);
  }

  if (options.recordWorkflow !== false) {
    store.recordWorkflowAction({
      type: 'journey_state_changed',
      summary: note,
      patientId: options.patientId,
      actorName: options.actorName,
      source: 'queue-assignment',
      metadata: {
        queue: WHITEBOARD_QUEUE_FILTER.triage,
        targetState: PatientState.Triage,
        intakeSource: options.source || null,
        autoAssigned: syncFilter,
      },
    });
  }

  return {
    ok: true as const,
    queue: WHITEBOARD_QUEUE_FILTER.triage,
    whiteboardFilter: syncFilter ? WHITEBOARD_QUEUE_FILTER.triage : null,
  };
}

export function enterWaitingQueue(
  store: QueueAssignmentStore,
  options: {
    patientId: string;
    actorName?: string;
    actorId?: string;
    note?: string;
    syncWhiteboardFilter?: boolean;
  },
) {
  const patient = store.patients.find((entry) => entry.id === options.patientId);
  if (!patient) {
    return { ok: false as const, reason: 'not_found' as const };
  }

  const staffId = options.actorId || 'queue-assignment';
  const note = options.note || 'Triage completed — entered waiting queue.';
  const syncFilter =
    options.syncWhiteboardFilter !== false &&
    isAutoAssignWaitingQueueEnabled(store.emergencySettings);

  if (patient.state === PatientState.Waiting) {
    if (syncFilter) store.setQueueFilter(WHITEBOARD_QUEUE_FILTER.waiting);
    return {
      ok: true as const,
      queue: WHITEBOARD_QUEUE_FILTER.waiting,
      created: false,
      whiteboardFilter: syncFilter ? WHITEBOARD_QUEUE_FILTER.waiting : null,
    };
  }

  if (patient.state !== PatientState.Triage) {
    return {
      ok: false as const,
      reason: 'invalid_state' as const,
      currentState: patient.state,
    };
  }

  try {
    moveWithJourneyRules(options.patientId, PatientState.Waiting, {
      staffId,
      note,
    });
  } catch {
    return { ok: false as const, reason: 'transition_blocked' as const };
  }

  if (syncFilter) {
    store.setQueueFilter(WHITEBOARD_QUEUE_FILTER.waiting);
  }

  store.recordWorkflowAction({
    type: 'journey_state_changed',
    summary: note,
    patientId: options.patientId,
    actorName: options.actorName,
    source: 'queue-assignment',
    metadata: {
      queue: WHITEBOARD_QUEUE_FILTER.waiting,
      targetState: PatientState.Waiting,
      autoAssigned: syncFilter,
    },
  });

  return {
    ok: true as const,
    queue: WHITEBOARD_QUEUE_FILTER.waiting,
    created: true,
    whiteboardFilter: syncFilter ? WHITEBOARD_QUEUE_FILTER.waiting : null,
  };
}

export function enterEmsRegistrationQueue(
  store: QueueAssignmentStore,
  options: {
    patientId: string;
    actorName?: string;
    emsArrivalId?: string;
  },
) {
  const patient = store.patients.find((entry) => entry.id === options.patientId);
  if (!patient || !isPatientInEmsRegistrationQueue(patient)) {
    return { ok: false as const, reason: 'not_ems_registration' as const };
  }

  store.selectPatient(options.patientId);
  store.recordWorkflowAction({
    type: 'journey_state_changed',
    summary: 'Patient entered EMS registration queue.',
    patientId: options.patientId,
    actorName: options.actorName,
    source: 'ems-pipeline',
    metadata: {
      queue: RECEPTION_QUEUE_TAB.ems,
      targetState: patient.state,
      emsArrivalId: options.emsArrivalId || null,
    },
  });

  return { ok: true as const, queue: RECEPTION_QUEUE_TAB.ems };
}

function hasFlag(patient: Patient, flag: PatientFlag): boolean {
  return patient.flags?.some((entry) =>
    typeof entry === 'string' ? entry === flag : entry?.type === flag,
  );
}

function waitMinutesSince(isoTime?: string | null): number {
  if (!isoTime) return 0;
  const timestamp = new Date(isoTime).getTime();
  if (!Number.isFinite(timestamp)) return 0;
  return Math.max(0, Math.round((Date.now() - timestamp) / 60000));
}

function riskLevelForWait(waitMinutes: number, targetMinutes: number) {
  if (waitMinutes >= targetMinutes * 2) return 'critical';
  if (waitMinutes >= targetMinutes) return 'high';
  if (waitMinutes >= targetMinutes * 0.75) return 'medium';
  return 'low';
}

function buildQueueSnapshot(
  patients: Patient[],
  predicate: (patient: Patient) => boolean,
  targetWaitMinutes: number,
) {
  const queuePatients = patients.filter(predicate);
  const waits = queuePatients.map((patient) =>
    waitMinutesSince(patient.triageTime || patient.arrivalTime),
  );
  const averageWait = waits.length
    ? Math.round(waits.reduce((sum, value) => sum + value, 0) / waits.length)
    : 0;
  const oldestWait = waits.length ? Math.max(...waits) : 0;
  const oldestPatient = [...queuePatients].sort(
    (left, right) =>
      waitMinutesSince(right.triageTime || right.arrivalTime) -
      waitMinutesSince(left.triageTime || left.arrivalTime),
  )[0];

  return {
    count: queuePatients.length,
    waitTime: averageWait,
    oldestPatient: {
      id: oldestPatient?.mrn || oldestPatient?.id || 'none',
      label: oldestPatient ? getPatientDisplayName(oldestPatient) : 'No patients',
      waitMinutes: oldestWait,
      acuity: oldestPatient?.priority || 'Unknown',
    },
    riskLevel: riskLevelForWait(oldestWait, targetWaitMinutes),
    throughput: Math.max(0, Math.min(queuePatients.length, 8)),
  };
}

export function buildLiveQueueStateFromPatients(patients: Patient[] = []) {
  const active = patients.filter((patient) => patient.state !== PatientState.Discharge);

  return {
    'waiting-room': buildQueueSnapshot(
      active,
      (patient) => patient.state === PatientState.Waiting,
      20,
    ),
    'triage-queue': buildQueueSnapshot(
      active,
      (patient) => patient.state === PatientState.Triage,
      15,
    ),
    'provider-queue': buildQueueSnapshot(
      active,
      (patient) => patient.state === PatientState.Assessment,
      35,
    ),
    'results-queue': buildQueueSnapshot(
      active,
      (patient) => patient.state === PatientState.Results,
      60,
    ),
    'reassessment-queue': buildQueueSnapshot(
      active,
      (patient) => hasFlag(patient, PatientFlag.ReassessmentDue),
      30,
    ),
    'referral-queue': buildQueueSnapshot(
      active,
      (patient) => patient.state === PatientState.Disposition,
      45,
    ),
    'admission-queue': buildQueueSnapshot(
      active,
      (patient) => patient.state === PatientState.Admission,
      60,
    ),
    'discharge-queue': buildQueueSnapshot(
      active,
      (patient) => patient.state === PatientState.Disposition,
      45,
    ),
    'ems-pre-arrival-queue': buildQueueSnapshot(
      active,
      (patient) => isPatientInEmsRegistrationQueue(patient),
      20,
    ),
  };
}

export function getLiveQueueDashboard(patients: Patient[] = []) {
  return QueueIntelligenceService.getQueueDashboard(buildLiveQueueStateFromPatients(patients));
}
