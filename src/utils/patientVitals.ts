import type { Patient, Vitals } from '../types/emergency';
import { ensurePatientArrivalBlock } from '../services/patientArrivalBackendSync';

export function asPatientVitalsArray(vitals: Patient['vitals'] | Vitals | null | undefined): Vitals[] {
  if (!vitals) return [];
  if (Array.isArray(vitals)) return vitals;
  if (typeof vitals === 'object') return [vitals as Vitals];
  return [];
}

export function patientFlags(
  patient: Pick<Patient, 'flags'> | null | undefined,
): NonNullable<Patient['flags']> {
  return Array.isArray(patient?.flags) ? patient.flags : [];
}

export function hasPatientFlag(
  patient: Pick<Patient, 'flags'> | null | undefined,
  flag: string,
): boolean {
  return patientFlags(patient).some((entry) =>
    typeof entry === 'string' ? entry === flag : entry?.type === flag,
  );
}

export function latestPatientVitals(
  patient: Pick<Patient, 'vitals'> | null | undefined,
): Vitals | undefined {
  const vitals = asPatientVitalsArray(patient?.vitals);
  return vitals.at(-1);
}

export function normalizePatientVitals<T extends Pick<Patient, 'vitals'>>(patient: T): T {
  return {
    ...patient,
    vitals: asPatientVitalsArray(patient.vitals),
  };
}

export function normalizeWhiteboardPatient(patient: Patient): Patient {
  const withArrival = ensurePatientArrivalBlock(patient);
  return {
    ...withArrival,
    vitals: asPatientVitalsArray(withArrival.vitals),
    flags: patientFlags(withArrival),
  };
}