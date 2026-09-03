import { getPatientFlagType, useEmergencyStore } from '../store/emergencyStore';
import {
  PatientState,
  Priority,
  type JourneyEvent,
  type Patient,
  type PatientFlag,
  type PatientFlagType,
} from '../types/emergency';

export const VALID_TRANSITIONS: Readonly<Record<PatientState, readonly PatientState[]>> = {
  [PatientState.Arrival]: [PatientState.Registration],
  [PatientState.Registration]: [PatientState.Triage],
  [PatientState.Triage]: [PatientState.Waiting],
  [PatientState.Waiting]: [PatientState.Assessment],
  [PatientState.Assessment]: [PatientState.Orders, PatientState.Disposition],
  [PatientState.Orders]: [PatientState.Results],
  [PatientState.Results]: [PatientState.Disposition, PatientState.Assessment],
  [PatientState.Disposition]: [PatientState.Discharge, PatientState.Admission],
  [PatientState.Admission]: [PatientState.Discharge],
  [PatientState.Discharge]: [],
  [PatientState.Deceased]: [],
};

export interface MovePatientOptions {
  staffId?: string;
  note?: string;
  timestamp?: string;
}

export interface MovePatientResult {
  ok: true;
  patientId: string;
  from: PatientState;
  to: PatientState;
  timelineEvent: JourneyEvent;
  removedFlags: PatientFlagType[];
}

export class PatientJourneyTransitionError extends Error {
  patientId?: string;
  fromState?: PatientState;
  toState?: PatientState;
  validNextStates: PatientState[];

  constructor(
    message: string,
    details: {
      patientId?: string;
      fromState?: PatientState;
      toState?: PatientState;
      validNextStates?: PatientState[];
    } = {},
  ) {
    super(message);
    this.name = 'PatientJourneyTransitionError';
    this.patientId = details.patientId;
    this.fromState = details.fromState;
    this.toState = details.toState;
    this.validNextStates = details.validNextStates ?? [];
  }
}

export function getNextStates(currentState: PatientState): PatientState[] {
  return [...(VALID_TRANSITIONS[currentState] || [])];
}

function patientName(patient: Patient): string {
  return patient.name || `${patient.firstName} ${patient.lastName}`.trim() || patient.id;
}

export function isLegalTransition(fromState: PatientState, targetState: PatientState): boolean {
  return getNextStates(fromState).includes(targetState);
}

function formatNextStates(states: PatientState[]): string {
  return states.length ? states.join(', ') : 'no further states';
}

export function assertLegalTransition(patient: Patient, targetState: PatientState): void {
  const nextStates = getNextStates(patient.state);

  if (patient.state === targetState) {
    throw new PatientJourneyTransitionError(
      `${patientName(patient)} is already in ${targetState}.`,
      {
        patientId: patient.id,
        fromState: patient.state,
        toState: targetState,
        validNextStates: nextStates,
      },
    );
  }

  if (!isLegalTransition(patient.state, targetState)) {
    throw new PatientJourneyTransitionError(
      `Illegal transition from ${patient.state} to ${targetState}. Valid next state(s): ${formatNextStates(
        nextStates,
      )}.`,
      {
        patientId: patient.id,
        fromState: patient.state,
        toState: targetState,
        validNextStates: nextStates,
      },
    );
  }
}

function staleFlagsForTransition(
  patient: Patient,
  targetState: PatientState,
): Set<PatientFlagType> {
  const staleFlags = new Set<PatientFlagType>();

  if (targetState !== PatientState.Waiting) {
    staleFlags.add('LongWait');
    staleFlags.add('ReassessmentDue');
  }

  if (
    targetState !== PatientState.Arrival &&
    targetState !== PatientState.Registration &&
    targetState !== PatientState.Triage &&
    targetState !== PatientState.Waiting
  ) {
    staleFlags.add('EMSArrival');
  }

  if (
    targetState === PatientState.Assessment &&
    [Priority.P1, Priority.P2].includes(patient.priority)
  ) {
    staleFlags.add('HighRisk');
  }

  if (targetState === PatientState.Discharge || targetState === PatientState.Deceased) {
    patient.flags.forEach((flag) => staleFlags.add(getPatientFlagType(flag)));
  }

  if (targetState !== PatientState.Admission && targetState !== PatientState.Discharge) {
    staleFlags.add('PendingAdmission');
  }

  return staleFlags;
}

function removeStaleFlags(patient: Patient, targetState: PatientState): PatientFlag[] {
  const staleFlags = staleFlagsForTransition(patient, targetState);
  return patient.flags.filter((flag) => !staleFlags.has(getPatientFlagType(flag)));
}

function removedFlagTypes(
  beforeFlags: PatientFlag[],
  afterFlags: PatientFlag[],
): PatientFlagType[] {
  const after = new Set(afterFlags.map((flag) => getPatientFlagType(flag)));
  return beforeFlags
    .map((flag) => getPatientFlagType(flag))
    .filter((flagType) => !after.has(flagType));
}

function buildJourneyEvent(
  patient: Patient,
  targetState: PatientState,
  options: MovePatientOptions,
): JourneyEvent {
  const timestamp = options.timestamp || new Date().toISOString();

  return {
    id: `journey-${patient.id}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    patientId: patient.id,
    type: 'StateChange',
    timestamp,
    from: patient.state,
    to: targetState,
    fromState: patient.state,
    toState: targetState,
    staffId: options.staffId,
    actorStaffId: options.staffId,
    note: options.note,
    summary: `${patientName(patient)} moved from ${patient.state} to ${targetState}.`,
    metadata: {
      from: patient.state,
      to: targetState,
      staffId: options.staffId || null,
      note: options.note || null,
    },
  };
}

export function movePatientToState(
  patientId: string,
  targetState: PatientState,
  options: MovePatientOptions = {},
): MovePatientResult {
  const store = useEmergencyStore.getState();
  const patient = store.patients.find((candidate) => candidate.id === patientId);

  if (!patient) {
    throw new PatientJourneyTransitionError(`Patient ${patientId} was not found.`, {
      patientId,
      toState: targetState,
    });
  }

  assertLegalTransition(patient, targetState);

  const nextFlags = removeStaleFlags(patient, targetState);
  const timelineEvent = buildJourneyEvent(patient, targetState, options);

  if (targetState === PatientState.Discharge) {
    store.dischargePatient(patientId, {
      flags: nextFlags,
      timelineEvent,
    });
  } else {
    store.movePatientToState(patientId, targetState, {
      flags: nextFlags,
      timelineEvent,
    });
  }
  useEmergencyStore.getState().updateCapacity();

  return {
    ok: true,
    patientId,
    from: patient.state,
    to: targetState,
    timelineEvent,
    removedFlags: removedFlagTypes(patient.flags, nextFlags),
  };
}

export const PatientJourneyEngine = Object.freeze({
  validTransitions: VALID_TRANSITIONS,
  getNextStates,
  isLegalTransition,
  assertLegalTransition,
  movePatientToState,
});

export default PatientJourneyEngine;
