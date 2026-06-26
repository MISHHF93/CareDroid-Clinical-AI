import { PatientState } from '../types/emergency';
import { PATIENT_STATE_SEQUENCE } from './PatientJourneyEngine';

export const REASSESSMENT_INTERVAL_MS = 60000;
export const WAITING_REASSESSMENT_THRESHOLD_MINUTES = 45;
export const VITALS_STALE_THRESHOLD_MINUTES = 30;

const PATIENT_STATE_INDEX = Object.freeze(
  Object.fromEntries(PATIENT_STATE_SEQUENCE.map((state, index) => [state, index]))
);

function minutesSince(timestamp, now = Date.now()) {
  const time = new Date(timestamp).getTime();
  if (!Number.isFinite(time)) return Number.POSITIVE_INFINITY;
  return Math.max(0, Math.floor((now - time) / 60000));
}

function isHighPriority(patient) {
  const priority = String(patient?.priority || '').toLowerCase();
  return (
    priority.includes('ctas 1') || priority.includes('ctas 2') || priority.includes('critical')
  );
}

function isBeforeAssessment(state) {
  const stateIndex = PATIENT_STATE_INDEX[state];
  const assessmentIndex = PATIENT_STATE_INDEX[PatientState.Assessment];
  return stateIndex !== undefined && stateIndex < assessmentIndex;
}

export function evaluatePatientForReassessment(patient, options: any = {}) {
  const now = options.now || Date.now();
  const waitingMinutes = minutesSince(patient.arrivalTime, now);
  const vitalsAgeMinutes = minutesSince(patient.vitalsUpdatedAt, now);
  const reasons = [] as any[];

  if (
    patient.state === PatientState.Waiting &&
    waitingMinutes > WAITING_REASSESSMENT_THRESHOLD_MINUTES
  ) {
    reasons.push(`Waiting ${waitingMinutes} minutes`);
  }

  if (vitalsAgeMinutes > VITALS_STALE_THRESHOLD_MINUTES) {
    reasons.push(`Vitals stale ${vitalsAgeMinutes} minutes`);
  }

  if (isHighPriority(patient) && isBeforeAssessment(patient.state)) {
    reasons.push('High-priority triage before assessment');
  }

  if (!reasons.length) return null;

  return Object.freeze({
    patientId: patient.id,
    patientName: patient.name,
    state: patient.state,
    priority: patient.priority,
    waitingMinutes,
    vitalsAgeMinutes,
    reasons: Object.freeze(reasons),
    flaggedAt: new Date(now).toISOString(),
  });
}

export function getReassessmentQueue(patients = [] as any[], options: any = {}) {
  return Object.freeze(
    patients
      .map((patient) => evaluatePatientForReassessment(patient, options))
      .filter(Boolean)
      .sort((a: any, b: any) => b.reasons.length - a.reasons.length || b.waitingMinutes - a.waitingMinutes)
  );
}

export const ReassessmentEngine = Object.freeze({
  intervalMs: REASSESSMENT_INTERVAL_MS,
  evaluatePatientForReassessment,
  getReassessmentQueue,
});

export default ReassessmentEngine;
