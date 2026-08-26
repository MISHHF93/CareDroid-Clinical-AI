import { isEmsRegistrationPatient } from '../components/reception/receptionQueueModel';
import {
  getNextStates,
  isLegalTransition,
  movePatientToState as moveWithJourneyRules,
} from '../engine/journeyEngine';
import { PatientFlag, PatientState, type Patient } from '../types/emergency';
import { useEmergencyStore, type useEmergencyStore as UseEmergencyStoreType } from '../store/emergencyStore';
import QueueIntelligenceService from './queueIntelligenceService';
import { getPatientDisplayName } from '../utils/patientSearch';
import { recordFirstContact, stampArrivalControlLayer } from './arrivalControlLayer';

/** Trace registry: how patients enter, leave, and what triggers movement. */
export const QUEUE_MOVEMENT_REGISTRY = Object.freeze({
  receptionVerification: Object.freeze({
    id: 'verification',
    label: 'Verification',
    membership: 'Registration without EMSArrival flag',
    enter: ['Walk-in registration', 'Smart Intake capture before verify'],
    exit: ['completeIntakeHandoff → Triage'],
    exitTrigger: 'Identity verified / intake completed',
  }),
  receptionPretriage: Object.freeze({
    id: 'pretriage',
    label: 'Awaiting triage',
    membership: 'PatientState.Triage',
    enter: ['completeIntakeHandoff', 'enterTriageQueue', 'Express/Quick intake'],
    exit: ['enterWaitingQueue → Waiting'],
    exitTrigger: 'Triage completed (staff Move next)',
  }),
  receptionEms: Object.freeze({
    id: 'ems',
    label: 'EMS registration',
    membership: 'EMSArrival flag + Registration or Arrival',
    enter: ['convertEMSArrivalToPatient', 'enterEmsRegistrationQueue'],
    exit: ['Smart Intake verify → completeIntakeHandoff → Triage'],
    exitTrigger: 'EMS registration verified',
  }),
  whiteboardTriage: Object.freeze({
    id: 'Triage',
    label: 'Triage',
    membership: 'PatientState.Triage',
    enter: ['enterTriageQueue', 'completeIntakeHandoff'],
    exit: ['enterWaitingQueue'],
    exitTrigger: 'Staff advances Triage → Waiting',
  }),
  whiteboardWaiting: Object.freeze({
    id: 'Waiting',
    label: 'Waiting',
    membership: 'PatientState.Waiting',
    enter: ['enterWaitingQueue'],
    exit: ['journeyEngine → Assessment'],
    exitTrigger: 'Provider pickup / Move next',
  }),
  whiteboardEms: Object.freeze({
    id: 'EMS',
    label: 'EMS',
    membership: 'EMSArrival flag or EMS registration queue',
    enter: ['EMS convert', 'Provisional temporary intake'],
    exit: ['Handoff to triage clears flag on later states'],
    exitTrigger: 'Registration complete',
  }),
  whiteboardReassessment: Object.freeze({
    id: 'Reassessment',
    label: 'Reassessment',
    membership: 'ReassessmentDue / DeteriorationRisk / SepsisAlert flags',
    enter: ['Reassessment engine flags', 'Staff flag actions'],
    exit: ['Reassessment completed / flag cleared on state change'],
    exitTrigger: 'Reassessment addressed',
  }),
});

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
  ReturnType<typeof UseEmergencyStoreType.getState>,
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

export function isPatientInVerificationQueue(patient: Patient): boolean {
  return patient.state === PatientState.Registration && !isEmsRegistrationPatient(patient);
}

export function matchesWhiteboardQueueFilter(
  patient: Patient,
  activeQueueFilter: string | null,
  pendingReferralPatientIds: Set<string> = new Set(),
): boolean {
  if (!activeQueueFilter) return true;
  const filter = activeQueueFilter.trim().toLowerCase();

  if (filter === 'waiting') return patient.state === PatientState.Waiting;
  if (filter === 'triage') return patient.state === PatientState.Triage;
  if (filter === 'provider' || filter === 'assessment') {
    return patient.state === PatientState.Assessment;
  }
  if (filter === 'orders') return patient.state === PatientState.Orders;
  if (filter === 'results') return patient.state === PatientState.Results;
  if (filter === 'admission' || filter === 'boarding') {
    return (
      patient.state === PatientState.Admission ||
      hasFlag(patient, PatientFlag.PendingAdmission)
    );
  }
  if (filter === 'referral') return pendingReferralPatientIds.has(patient.id);
  if (filter === 'discharge') {
    return (
      patient.state === PatientState.Disposition &&
      !pendingReferralPatientIds.has(patient.id)
    );
  }
  if (filter === 'ems') {
    return hasFlag(patient, PatientFlag.EMSArrival) || isPatientInEmsRegistrationQueue(patient);
  }
  if (filter === 'reassessment') {
    return (
      hasFlag(patient, PatientFlag.ReassessmentDue) ||
      hasFlag(patient, PatientFlag.DeteriorationRisk) ||
      hasFlag(patient, PatientFlag.SepsisAlert)
    );
  }

  return true;
}

function hasFlag(patient: Patient, flag: PatientFlag): boolean {
  return patient.flags?.some((entry) =>
    typeof entry === 'string' ? entry === flag : (entry as unknown as { type: string })?.type === flag,
  );
}

function findPatient(store: QueueAssignmentStore, patientId: string): Patient | undefined {
  return store.patients.find((entry) => entry.id === patientId);
}

/** Picks the default "Move next" target using journey rules, not enum order. */
export function getDefaultNextPatientState(patient: Patient): PatientState | null {
  const nextStates = getNextStates(patient.state);
  if (!nextStates.length) return null;

  if (patient.state === PatientState.Disposition) {
    if (nextStates.includes(PatientState.Admission) && hasFlag(patient, PatientFlag.PendingAdmission)) {
      return PatientState.Admission;
    }
    if (nextStates.includes(PatientState.Discharge)) {
      return PatientState.Discharge;
    }
  }

  if (patient.state === PatientState.Results && nextStates.includes(PatientState.Disposition)) {
    return PatientState.Disposition;
  }

  return nextStates[0] || null;
}

export function hasAdvanceablePatientState(patient: Patient): boolean {
  return getDefaultNextPatientState(patient) !== null;
}

function getBoardingPathStep(patient: Patient): PatientState | null {
  if (isLegalTransition(patient.state, PatientState.Admission)) {
    return PatientState.Admission;
  }
  if (isLegalTransition(patient.state, PatientState.Disposition)) {
    return PatientState.Disposition;
  }

  const nextStates = getNextStates(patient.state);
  if (nextStates.includes(PatientState.Disposition)) return PatientState.Disposition;
  if (nextStates.includes(PatientState.Orders)) return PatientState.Orders;
  if (nextStates.includes(PatientState.Results)) return PatientState.Results;
  return nextStates[0] || null;
}

export function advancePatientToBoarding(
  patientId: string,
  options: {
    actorId?: string;
    actorName?: string;
    note?: string;
  } = {},
) {
  const store = useEmergencyStore.getState();
  let patient = findPatient(store, patientId);
  if (!patient) return { ok: false as const, reason: 'not_found' as const };
  if (patient.state === PatientState.Admission) return { ok: true as const };

  for (let step = 0; step < 5; step += 1) {
    if (!patient) return { ok: false as const, reason: 'not_found' as const };
    if (patient.state === PatientState.Admission) return { ok: true as const };

    const target = getBoardingPathStep(patient);
    if (!target) {
      return {
        ok: false as const,
        reason: 'transition_blocked' as const,
        currentState: patient.state,
      };
    }

    const moved = advancePatientJourneyState(patientId, target, {
      ...options,
      note:
        options.note ||
        (target === PatientState.Admission
          ? 'Boarding launched from Whiteboard mission control.'
          : 'Advanced toward boarding/admission.'),
    });
    if (!moved.ok) return moved;
    patient = findPatient(store, patientId);
  }

  return { ok: false as const, reason: 'path_too_long' as const };
}

export function dischargePatientSafely(
  patientId: string,
  options: {
    actorId?: string;
    note?: string;
  } = {},
) {
  const store = useEmergencyStore.getState();
  const patient = findPatient(store, patientId);
  if (!patient) return { ok: false as const, reason: 'not_found' as const };

  const staffId = options.actorId || 'queue-assignment';
  const note = options.note || 'Patient discharged from CareDroid.';

  if (isLegalTransition(patient.state, PatientState.Discharge)) {
    try {
      moveWithJourneyRules(patientId, PatientState.Discharge, { staffId, note });
      return { ok: true as const };
    } catch {
      // Expected when journey rules block discharge — fall through to clinical override below.
    }
  }

  store.dischargePatient(patientId, { staffId, note });
  useEmergencyStore.getState().updateCapacity();
  return { ok: true as const, override: true as const };
}


function assignPatientToTriageState(
  store: QueueAssignmentStore,
  patientId: string,
  staffId: string,
  note: string,
): { ok: true } | { ok: false; reason: 'not_found' | 'invalid_state' | 'transition_blocked' } {
  let patient = findPatient(store, patientId);
  if (!patient) return { ok: false, reason: 'not_found' };
  if (patient.state === PatientState.Triage) return { ok: true };

  if (
    patient.state === PatientState.Arrival &&
    isLegalTransition(PatientState.Arrival, PatientState.Registration)
  ) {
    store.movePatientToState(patientId, PatientState.Registration, {
      staffId,
      note: 'Registered before triage queue assignment.',
    });
    patient = findPatient(store, patientId);
    if (!patient) return { ok: false, reason: 'not_found' };
  }

  if (patient.state === PatientState.Triage) return { ok: true };
  if (!isLegalTransition(patient.state, PatientState.Triage)) {
    return { ok: false, reason: 'invalid_state' };
  }

  store.movePatientToState(patientId, PatientState.Triage, { staffId, note });
  return { ok: true };
}

export function advancePatientJourneyState(
  patientId: string,
  targetState: PatientState,
  options: {
    actorId?: string;
    actorName?: string;
    note?: string;
    syncWhiteboardFilter?: boolean;
  } = {},
) {
  const store = useEmergencyStore.getState();

  if (targetState === PatientState.Waiting) {
    return enterWaitingQueue(store, {
      patientId,
      actorId: options.actorId,
      actorName: options.actorName,
      note: options.note,
      syncWhiteboardFilter: options.syncWhiteboardFilter,
    });
  }

  try {
    moveWithJourneyRules(patientId, targetState, {
      staffId: options.actorId || 'queue-assignment',
      note: options.note,
    });
    return { ok: true as const };
  } catch (_error) {
    // Expected when journey rules block the requested state transition.
    return { ok: false as const, reason: 'transition_blocked' as const };
  }
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

  const transition = assignPatientToTriageState(store, options.patientId, staffId, note);
  if (!transition.ok) {
    return transition;
  }

  if (!patient.triageTime) {
    store.updatePatient(options.patientId, {
      triageTime: new Date().toISOString(),
    });
  }

  recordFirstContact(store as unknown as Parameters<typeof recordFirstContact>[0], options.patientId, {
    actorName: options.actorName,
    source: options.source || 'queue-assignment',
    note: 'First contact recorded on triage queue entry.',
  });

  stampArrivalControlLayer(store as unknown as Parameters<typeof stampArrivalControlLayer>[0], options.patientId, {
    triagePending: true,
    registrationStatus: 'complete',
    queueDestination: 'triage-queue',
  });

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
  } catch (_error) {
    // Expected when journey rules block the triage → waiting transition.
    return { ok: false as const, reason: 'transition_blocked' as const };
  }

  if (syncFilter) {
    store.setQueueFilter(WHITEBOARD_QUEUE_FILTER.waiting);
  }

  stampArrivalControlLayer(store as unknown as Parameters<typeof stampArrivalControlLayer>[0], options.patientId, {
    triagePending: false,
    registrationStatus: 'complete',
    queueDestination: 'waiting-room',
  });

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

export function buildLiveQueueStateFromPatients(
  patients: Patient[] = [],
  openReferralPatientIds: Set<string> = new Set(),
) {
  const active = patients.filter(
    (patient) =>
      patient.state !== PatientState.Discharge && patient.state !== PatientState.Deceased,
  );

  return {
    'waiting-room': buildQueueSnapshot(
      active,
      (patient) =>
        patient.state === PatientState.Waiting ||
        patient.state === PatientState.Registration ||
        patient.state === PatientState.Arrival,
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
      (patient) => openReferralPatientIds.has(patient.id),
      45,
    ),
    'admission-queue': buildQueueSnapshot(
      active,
      (patient) => patient.state === PatientState.Admission,
      60,
    ),
    'discharge-queue': buildQueueSnapshot(
      active,
      (patient) =>
        patient.state === PatientState.Disposition &&
        !openReferralPatientIds.has(patient.id),
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
