import type { Patient, Vitals } from '../types/emergency';

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
    typeof entry === 'string' ? entry === flag : (entry as unknown as { type: string })?.type === flag,
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

/**
 * Deterioration thresholds for a single vitals reading — the ONE definition
 * shared by the background reassessment engine (Rule 3, which ADDS
 * DeteriorationRisk/ReassessmentDue/ScoreReassessmentRecommended) and the
 * vitals-recording pipeline (which restates those flags against the fresh
 * reading). Keeping both sides on the same thresholds is what makes the
 * add/clear lifecycle symmetric instead of add-only.
 */
export function meetsDeteriorationVitalsCriteria(vitals: Vitals | null | undefined): boolean {
  if (!vitals) return false;
  return (
    (vitals.spo2 !== undefined && vitals.spo2 < 94) ||
    (vitals.hr !== undefined && (vitals.hr > 120 || vitals.hr < 50)) ||
    (vitals.sbp !== undefined && (vitals.sbp < 90 || vitals.sbp > 180))
  );
}