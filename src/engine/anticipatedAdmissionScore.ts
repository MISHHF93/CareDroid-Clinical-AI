import {
  DEFAULT_ADTA_CALIBRATION,
  resolveAdtaCalibration,
  type AdtaCalibrationProfile,
} from '../config/adtaCalibration.config';
import {
  buildOperationalScoreEnvelope,
  type OperationalScoreEnvelope,
} from '../config/edOperationalStandards';
import type { BoardingSignals } from '../services/boardingSignals';
import { PatientFlag, PatientState, Priority, type Patient } from '../types/emergency';
import { latestPatientVitals } from '../utils/patientVitals';

export type AnticipatedAdmissionInput = {
  patient: Pick<
    Patient,
    'state' | 'priority' | 'flags' | 'chiefComplaint' | 'vitals' | 'age' | 'complaintCategory'
  >;
  pendingOrders?: number;
  abnormalLabs?: boolean;
  consultPending?: boolean;
  boardingSignals?: BoardingSignals | null;
  calibration?: Partial<AdtaCalibrationProfile> | null;
};

export type AnticipatedAdmissionResult = {
  score: number;
  band: 'low' | 'moderate' | 'elevated' | 'high';
  thresholdBreached: boolean;
  humanReviewRequired: true;
  envelope: OperationalScoreEnvelope<{ score: number; band: string }>;
};

function hasPatientFlag(
  patient: AnticipatedAdmissionInput['patient'],
  flag: PatientFlag,
): boolean {
  return (patient.flags || []).some((entry) =>
    typeof entry === 'string' ? entry === flag : (entry as unknown as { type: string })?.type === flag,
  );
}

export function calculateAnticipatedAdmissionScore(
  input: AnticipatedAdmissionInput,
): AnticipatedAdmissionResult {
  const { patient } = input;
  const calibration = resolveAdtaCalibration(input.calibration);
  const weights = calibration.weights;
  const vitals = latestPatientVitals(patient);
  const rationale: string[] = [];
  let score = 0;

  if (patient.state === PatientState.Admission) {
    score += weights.admissionState;
    rationale.push('Patient already in admission pathway.');
  }
  if (hasPatientFlag(patient, PatientFlag.PendingAdmission)) {
    score += weights.pendingAdmissionFlag;
    rationale.push('Pending admission flag active.');
  }
  if (input.boardingSignals?.decisionTracked || input.boardingSignals?.isBoarded) {
    score += weights.boardingDecisionTracked;
    rationale.push(
      input.boardingSignals.source === 'live'
        ? 'Boarding API confirms decision-to-admit tracked.'
        : 'Local boarding state suggests admission decision pathway.',
    );
  }
  if (patient.priority === Priority.P1 || patient.priority === Priority.P2) {
    score += weights.highAcuity;
    rationale.push(`Elevated acuity (${patient.priority}).`);
  }
  if (hasPatientFlag(patient, PatientFlag.SepsisAlert)) {
    score += weights.sepsisAlert;
    rationale.push('Active sepsis alert.');
  }
  if (hasPatientFlag(patient, PatientFlag.HighRisk)) {
    score += weights.highRiskFlag;
    rationale.push('High-risk flag documented.');
  }
  if (/\b(chest pain|stroke|sepsis|gi bleed|respiratory failure|fracture)\b/i.test(patient.chiefComplaint || '')) {
    score += weights.admissionComplaint;
    rationale.push('Admission-associated presenting complaint pattern.');
  }
  if ((patient.age ?? 0) >= 75) {
    score += weights.age75Plus;
    rationale.push('Age 75+ increases admission likelihood in local patterns.');
  }
  if (vitals?.spo2 != null && Number(vitals.spo2) < 92) {
    score += weights.hypoxia;
    rationale.push('Hypoxia on latest vitals.');
  }
  if (input.abnormalLabs) {
    score += weights.abnormalLabs;
    rationale.push('Abnormal or critical laboratory values noted.');
  }
  if ((input.pendingOrders || 0) > 2) {
    score += weights.pendingOrders;
    rationale.push('Multiple active orders suggest ongoing workup.');
  }
  if (input.consultPending) {
    score += weights.consultPending;
    rationale.push('Specialist consult pending — admission planning may be needed.');
  }

  score = Math.min(100, Math.max(0, score));
  const threshold = calibration.alertThreshold ?? DEFAULT_ADTA_CALIBRATION.alertThreshold;
  const band =
    score >= 80 ? 'high' : score >= threshold ? 'elevated' : score >= 40 ? 'moderate' : 'low';
  const maturity = input.boardingSignals?.maturity === 'live' ? 'live' : 'demo';

  return {
    score,
    band,
    thresholdBreached: score >= threshold,
    humanReviewRequired: true,
    envelope: buildOperationalScoreEnvelope({
      value: { score, band },
      maturity,
      rationale: rationale.length ? rationale : ['Insufficient admission signals — score remains low.'],
      sourceFields: [
        'state',
        'priority',
        'flags',
        'chiefComplaint',
        'vitals',
        'age',
        'pendingOrders',
        'abnormalLabs',
        'consultPending',
        'boardingSignals',
      ],
    }),
  };
}