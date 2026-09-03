import { DEFAULT_ADTA_CALIBRATION } from '../config/adtaCalibration.config';
import { calculateAnticipatedAdmissionScore } from '../engine/anticipatedAdmissionScore';
import { predictAdmissionLikelihoodMl } from '../../lib/native-ai';
import type { BoardingSignals } from './boardingSignals';
import { PatientState, type Patient } from '../types/emergency';

export const ADMISSION_PROBABILITY_ALERT_THRESHOLD = 70;

export type PatientAdmissionAssessment = {
  patientId: string;
  patientLabel: string;
  probabilityPercent: number;
  admitScore: number;
  admitScoreMax: number;
  band: 'low' | 'moderate' | 'elevated' | 'high';
  thresholdBreached: boolean;
  rationale: string[];
};

export function probabilityToAdmitScore(probabilityPercent: number, maxScore = 10): number {
  return Math.min(maxScore, Math.max(0, Math.round(probabilityPercent / 10)));
}

export function assessPatientAdmissionProbability(input: {
  patient: Patient;
  boardingSignals?: BoardingSignals | null;
  abnormalLabs?: boolean;
  pendingOrders?: number;
  consultPending?: boolean;
  alertThreshold?: number;
}): PatientAdmissionAssessment {
  const consultPending =
    input.consultPending ??
    (input.patient.state === PatientState.Orders || input.patient.state === PatientState.Results);
  const result = calculateAnticipatedAdmissionScore({
    patient: input.patient,
    boardingSignals: input.boardingSignals,
    abnormalLabs: input.abnormalLabs,
    pendingOrders: input.pendingOrders,
    consultPending,
  });
  const nativeMl = predictAdmissionLikelihoodMl(input.patient, {
    abnormalLabs: input.abnormalLabs,
    consultPending,
  });
  const threshold = input.alertThreshold ?? ADMISSION_PROBABILITY_ALERT_THRESHOLD;
  const blendedScore = Math.round(result.score * 0.55 + nativeMl.probabilityPercent * 0.45);

  return {
    patientId: input.patient.id,
    patientLabel:
      `${input.patient.firstName} ${input.patient.lastName}`.trim() || input.patient.mrn,
    probabilityPercent: blendedScore,
    admitScore: probabilityToAdmitScore(blendedScore),
    admitScoreMax: 10,
    band: result.band,
    thresholdBreached: blendedScore >= threshold,
    rationale: [...new Set([...result.envelope.rationale, ...nativeMl.keyPredictors])],
  };
}

export function scanPatientsForAdmissionAlerts(
  patients: Patient[],
  options: {
    alertThreshold?: number;
    boardingSignalsByPatientId?: Record<string, BoardingSignals | null | undefined>;
  } = {},
): PatientAdmissionAssessment[] {
  const threshold = options.alertThreshold ?? ADMISSION_PROBABILITY_ALERT_THRESHOLD;
  return patients
    .filter(
      (patient) =>
        patient.state !== PatientState.Discharge && patient.state !== PatientState.Deceased,
    )
    .map((patient) =>
      assessPatientAdmissionProbability({
        patient,
        boardingSignals: options.boardingSignalsByPatientId?.[patient.id],
        alertThreshold: threshold,
      }),
    )
    .filter((assessment) => assessment.thresholdBreached)
    .sort((left, right) => right.probabilityPercent - left.probabilityPercent);
}

export function defaultAdmissionAlertThreshold(): number {
  return DEFAULT_ADTA_CALIBRATION.alertThreshold;
}
