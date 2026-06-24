import type { Patient, PatientArrivalRecord } from '../types/emergency';
import { normalizePatientArrival, syncPatientFromArrival } from './patientArrivalModel';

export const REQUIRED_PATIENT_ARRIVAL_FIELDS: ReadonlyArray<keyof PatientArrivalRecord> = [
  'arrivalMode',
  'arrivalTimestamp',
  'chiefComplaint',
  'triageAcuity',
  'waitingRoomStatus',
] as const;

/** Ensures every patient carries a canonical arrival block with legacy dual-write fields. */
export function ensurePatientArrivalBlock(patient: Patient): Patient {
  const arrival = patient.arrival ?? normalizePatientArrival(patient);
  return {
    ...patient,
    ...syncPatientFromArrival(patient, arrival),
    arrival,
  } as Patient;
}

/** Prepares a patient payload for emergency OS create/intake API calls. */
export function serializePatientForBackendApi(patient: Patient): Patient {
  return ensurePatientArrivalBlock(patient);
}

/** Normalizes backend or realtime hydration payloads onto the arrival contract. */
export function hydratePatientFromBackendApi(patient: Patient): Patient {
  return ensurePatientArrivalBlock(patient);
}

export function patientArrivalContractViolations(patient: Patient): string[] {
  const arrival = patient.arrival ?? normalizePatientArrival(patient);
  const violations: string[] = [];

  for (const field of REQUIRED_PATIENT_ARRIVAL_FIELDS) {
    const value = arrival[field];
    if (value === undefined || value === null || value === '') {
      violations.push(field);
    }
  }

  if (!arrival.triageAcuity?.code || !arrival.triageAcuity?.level) {
    violations.push('triageAcuity.code');
  }

  return violations;
}

export function assertPatientArrivalContract(patient: Patient, label = 'patient'): void {
  const violations = patientArrivalContractViolations(patient);
  if (violations.length) {
    throw new Error(`${label} missing arrival fields: ${violations.join(', ')}`);
  }
}