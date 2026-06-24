import { PatientFlag, PatientState, Priority, type Patient } from '../../src/types/emergency';
import { hasPatientFlag, latestPatientVitals } from '../shared/patientClinicalHelpers';

export type AdmissionHeuristicResult = {
  score: number;
  band: 'low' | 'moderate' | 'elevated' | 'high';
  thresholdBreached: boolean;
  rationale: string[];
};

const ADMISSION_ALERT_THRESHOLD = 70;

export function calculateAdmissionHeuristicScore(
  patient: Patient,
  options: {
    abnormalLabs?: boolean;
    consultPending?: boolean;
    pendingOrders?: number;
    alertThreshold?: number;
  } = {},
): AdmissionHeuristicResult {
  const threshold = options.alertThreshold ?? ADMISSION_ALERT_THRESHOLD;
  const rationale: string[] = [];
  let score = 0;
  const vitals = latestPatientVitals(patient);

  if (patient.state === PatientState.Admission) {
    score += 28;
    rationale.push('Patient already in admission pathway.');
  }
  if (hasPatientFlag(patient, PatientFlag.PendingAdmission)) {
    score += 18;
    rationale.push('Pending admission flag active.');
  }
  if (patient.priority === Priority.P1 || patient.priority === Priority.P2) {
    score += 14;
    rationale.push(`Elevated acuity (${patient.priority}).`);
  }
  if (hasPatientFlag(patient, PatientFlag.SepsisAlert)) {
    score += 12;
    rationale.push('Active sepsis alert.');
  }
  if (hasPatientFlag(patient, PatientFlag.HighRisk)) {
    score += 10;
    rationale.push('High-risk flag documented.');
  }
  if (/\b(chest pain|stroke|sepsis|gi bleed|respiratory failure|fracture)\b/i.test(patient.chiefComplaint || '')) {
    score += 10;
    rationale.push('Admission-associated presenting complaint pattern.');
  }
  if ((patient.age ?? 0) >= 75) {
    score += 8;
    rationale.push('Age 75+ increases admission likelihood in local patterns.');
  }
  if (vitals?.spo2 != null && Number(vitals.spo2) < 92) {
    score += 8;
    rationale.push('Hypoxia on latest vitals.');
  }
  if (options.abnormalLabs) {
    score += 8;
    rationale.push('Abnormal or critical laboratory values noted.');
  }
  if ((options.pendingOrders || 0) > 2) {
    score += 6;
    rationale.push('Multiple active orders suggest ongoing workup.');
  }
  if (options.consultPending) {
    score += 6;
    rationale.push('Specialist consult pending — admission planning may be needed.');
  }

  score = Math.min(100, Math.max(0, score));
  const band =
    score >= 80 ? 'high' : score >= threshold ? 'elevated' : score >= 40 ? 'moderate' : 'low';

  return {
    score,
    band,
    thresholdBreached: score >= threshold,
    rationale: rationale.length ? rationale : ['Insufficient admission signals — score remains low.'],
  };
}