import { useEmergencyStore } from '../store/emergencyStore';
import {
  PatientState,
  Priority,
  type JourneyEvent,
  type Patient,
  type PatientFlag,
  type PatientFlagType,
} from '../types/emergency';
import { getPatientFlagType } from '../store/emergencyStore';

export const VALID_TRANSITIONS: Readonly<Record<PatientState, readonly PatientState[]>> = {
  [PatientState.Arrival]: [PatientState.Registration],
  [PatientState.Registration]: [PatientState.Triage],
  [PatientState.Triage]: [PatientState.Waiting],
  [PatientState.Waiting]: [PatientState.Assessment],
  [PatientState.Assessment]: [PatientState.Orders, PatientState.Disposition],
  [PatientState.Orders]: [PatientState.Results],
  [PatientState.Results]: [PatientState.Disposition, PatientState.Assessment],
  [PatientState.Disposition]: [PatientState.Discharge, PatientState.Admission],
  [PatientState.Admission]: [],
  [PatientState.Discharge]: [],
  [PatientState.Deceased]: [],
};

export interface MovePatientOptions {
  staffId?: string;
  note?: string;
}

export type MovePatientResult =
  | {
      ok: true;
      patientId: string;
      from: PatientState;
      to: PatientState;
    }
  | {
      ok: false;
      reason: string;
    };

export function getNextStates(currentState: PatientState): PatientState[] {
  return [...(VALID_TRANSITIONS[currentState] || [])];
}

function patientName(patient: Patient): string {
  return `${patient.firstName} ${patient.lastName}`;
}

function isLegalTransition(fromState: PatientState, targetState: PatientState): boolean {
  return getNextStates(fromState).includes(targetState);
}

function staleFlagsForTransition(
  patient: Patient,
  targetState: PatientState
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

function buildJourneyEvent(
  patient: Patient,
  targetState: PatientState,
  options: MovePatientOptions
): JourneyEvent {
  const timestamp = new Date().toISOString();

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
  options: MovePatientOptions = {}
): MovePatientResult {
  const store = useEmergencyStore.getState();
  const patient = store.patients.find((candidate) => candidate.id === patientId);

  if (!patient) {
    return {
      ok: false,
      reason: `Patient ${patientId} was not found.`,
    };
  }

  if (patient.state === targetState) {
    return {
      ok: false,
      reason: `${patientName(patient)} is already in ${targetState}.`,
    };
  }

  if (!isLegalTransition(patient.state, targetState)) {
    const nextStates = getNextStates(patient.state);
    const nextStateLabel = nextStates.length ? nextStates.join(', ') : 'no further states';
    return {
      ok: false,
      reason: `Illegal transition from ${patient.state} to ${targetState}. Valid next state(s): ${nextStateLabel}.`,
    };
  }

  store.updatePatient(patientId, {
    state: targetState,
    flags: removeStaleFlags(patient, targetState),
    timeline: [...patient.timeline, buildJourneyEvent(patient, targetState, options)],
  });
  useEmergencyStore.getState().updateCapacity();

  return {
    ok: true,
    patientId,
    from: patient.state,
    to: targetState,
  };
}
