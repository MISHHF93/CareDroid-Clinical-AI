import type { Patient, PatientArrivalRecord } from '../types/emergency';
import { asPatientVitalsArray, patientFlags } from '../utils/patientVitals';
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

/** Normalizes API/store patient payloads for whiteboard rendering. */
export function normalizeWhiteboardPatient(patient: Patient): Patient {
  const withArrival = ensurePatientArrivalBlock(patient);
  return {
    ...withArrival,
    vitals: asPatientVitalsArray(withArrival.vitals),
    flags: patientFlags(withArrival),
  };
}

/**
 * Merges the whiteboard's one-shot fetched payload with live store patients, preferring the
 * live store record for any patient ID present in both (HEAL-192). The payload is fetched once
 * on mount and only re-fetched on specific user actions, never on a timer or live update -- every
 * other charge-nurse-facing surface on the same screen reads live store state directly, so
 * preferring a frozen payload record here would let a patient's own board card silently stop
 * reflecting later flag/priority/room/state changes while the rest of the screen kept updating.
 * Payload-only records (not yet reflected in the store) are still included, appended after the
 * live ones, so nothing present at load time disappears before the store catches up.
 */
export function mergeWhiteboardPatients(
  storePatients: Patient[],
  payloadPatients: Patient[] | undefined,
): Patient[] {
  if (!payloadPatients?.length) return storePatients.map(normalizeWhiteboardPatient);
  const storeIds = new Set(storePatients.map((patient) => patient.id));
  return [
    ...storePatients.map(normalizeWhiteboardPatient),
    ...payloadPatients
      .filter((patient) => !storeIds.has(patient.id))
      .map(normalizeWhiteboardPatient),
  ];
}
