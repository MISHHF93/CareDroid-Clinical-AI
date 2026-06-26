import { PatientState } from '../types/emergency';

export const PATIENT_STATE_SEQUENCE = Object.freeze([
  PatientState.Arrival,
  PatientState.Registration,
  PatientState.Triage,
  PatientState.Waiting,
  PatientState.Assessment,
  PatientState.Orders,
  PatientState.Results,
  PatientState.Disposition,
  PatientState.Admission,
  PatientState.Discharge,
]);

const PATIENT_STATE_INDEX = Object.freeze(
  Object.fromEntries(PATIENT_STATE_SEQUENCE.map((state, index) => [state, index]))
);

function isKnownState(state) {
  return Object.prototype.hasOwnProperty.call(PATIENT_STATE_INDEX, state);
}

function buildAuditEvent(patient, targetState, options: any = {}) {
  return Object.freeze({
    id: `${patient.id}-${Date.now()}-${targetState}`,
    patientId: patient.id,
    patientName: patient.name,
    fromState: patient.state,
    toState: targetState,
    transitionedAt: options.transitionedAt || new Date().toISOString(),
    actor: options.actor || 'PatientJourneyEngine',
    reason: options.reason || 'Whiteboard state transition',
  });
}

export function getNextPatientState(currentState) {
  const currentIndex = PATIENT_STATE_INDEX[currentState];
  if (currentIndex === undefined || currentIndex >= PATIENT_STATE_SEQUENCE.length - 1) {
    return null;
  }

  return PATIENT_STATE_SEQUENCE[currentIndex + 1];
}

export function validatePatientStateTransition(patient, targetState) {
  if (!patient?.id) {
    return {
      ok: false,
      message: 'A patient is required before moving journey state.',
    };
  }

  if (!isKnownState(patient.state)) {
    return {
      ok: false,
      message: `Unknown current patient state: ${patient.state}`,
    };
  }

  if (!isKnownState(targetState)) {
    return {
      ok: false,
      message: `Unknown target patient state: ${targetState}`,
    };
  }

  const currentIndex = PATIENT_STATE_INDEX[patient.state];
  const targetIndex = PATIENT_STATE_INDEX[targetState];

  if (targetIndex === currentIndex) {
    return {
      ok: false,
      message: `${patient.name} is already in ${targetState}.`,
    };
  }

  if (targetIndex !== currentIndex + 1) {
    const requiredState = getNextPatientState(patient.state);
    return {
      ok: false,
      message: requiredState
        ? `${patient.name} must move to ${requiredState} before ${targetState}.`
        : `${patient.name} is already at the end of the ED journey.`,
    };
  }

  return {
    ok: true,
    message: `${patient.name} can move from ${patient.state} to ${targetState}.`,
  };
}

export function transitionPatient(patient, targetState, options: any = {}) {
  const validation = validatePatientStateTransition(patient, targetState);

  if (!validation.ok) {
    return {
      ok: false,
      patient,
      auditEvent: null,
      message: validation.message,
    };
  }

  const auditEvent = buildAuditEvent(patient, targetState, options);

  return {
    ok: true,
    patient: {
      ...patient,
      state: targetState,
    },
    auditEvent,
    message: validation.message,
  };
}

export function transitionPatientToNextState(patient, options: any = {}) {
  const nextState = getNextPatientState(patient?.state);

  if (!nextState) {
    return {
      ok: false,
      patient,
      auditEvent: null,
      message: patient?.name
        ? `${patient.name} is already at the end of the ED journey.`
        : 'A patient is required before moving journey state.',
    };
  }

  return transitionPatient(patient, nextState, options);
}

export const PatientJourneyEngine = Object.freeze({
  stateSequence: PATIENT_STATE_SEQUENCE,
  getNextPatientState,
  validatePatientStateTransition,
  transitionPatient,
  transitionPatientToNextState,
});

export default PatientJourneyEngine;
