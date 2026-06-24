import type { Patient, Vitals } from '../../src/types/emergency';

export function asPatientVitalsArray(
  vitals: Patient['vitals'] | Vitals | null | undefined,
): Vitals[] {
  if (!vitals) return [];
  if (Array.isArray(vitals)) return vitals;
  if (typeof vitals === 'object') return [vitals as Vitals];
  return [];
}

export function latestPatientVitals(
  patient: Pick<Patient, 'vitals'> | null | undefined,
): Vitals | undefined {
  return asPatientVitalsArray(patient?.vitals).at(-1);
}

export function hasPatientFlag(
  patient: Pick<Patient, 'flags'> | null | undefined,
  flag: string,
): boolean {
  return (patient?.flags || []).some((entry) => entry === flag);
}

export function waitMinutesForWhiteboard(
  patient: Pick<Patient, 'arrivalTime' | 'arrival'>,
  now = Date.now(),
): number {
  const arrivedAt = new Date(
    patient.arrival?.arrivalTimestamp || patient.arrivalTime,
  ).getTime();
  if (!Number.isFinite(arrivedAt)) return 0;
  return Math.max(0, Math.round((now - arrivedAt) / 60000));
}