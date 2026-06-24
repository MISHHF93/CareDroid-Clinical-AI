import {
  DEFAULT_ADTA_CALIBRATION,
  resolveAdtaCalibration,
  type AdtaCalibrationProfile,
} from '../config/adtaCalibration.config';
import { buildOperationalScoreEnvelope } from '../config/edOperationalStandards';
import type { BoardingSignals } from '../services/boardingSignals';
import { PatientFlag, PatientState, Priority, type Patient } from '../types/emergency';

export type ProlongedStayRisk = 'low' | 'moderate' | 'high';

export type JourneyPredictionInput = {
  patient: Pick<
    Patient,
    | 'state'
    | 'priority'
    | 'flags'
    | 'chiefComplaint'
    | 'vitals'
    | 'age'
    | 'complaintCategory'
    | 'arrivalTime'
    | 'source'
    | 'emsArrival'
  >;
  pendingOrders?: number;
  abnormalLabs?: boolean;
  consultPending?: boolean;
  boardingSignals?: BoardingSignals | null;
  bedOccupancyPercent?: number;
  calibration?: Partial<AdtaCalibrationProfile> | null;
};

export type PatientJourneyPrediction = {
  admissionProbability: number;
  admissionBand: 'low' | 'moderate' | 'elevated' | 'high';
  prolongedStayRisk: ProlongedStayRisk;
  prolongedStayProbability: number;
  chestXrayUtilizationProbability: number;
  thresholdBreached: boolean;
  humanReviewRequired: true;
  keyPredictors: string[];
  envelope: ReturnType<typeof buildOperationalScoreEnvelope<{
    admissionProbability: number;
    prolongedStayRisk: ProlongedStayRisk;
  }>>;
};

function latestVitals(patient: JourneyPredictionInput['patient']) {
  return patient.vitals?.at(-1);
}

function hoursSinceArrival(arrivalTime: string): number {
  const parsed = new Date(arrivalTime).getTime();
  if (!Number.isFinite(parsed)) return 0;
  return Math.max(0, (Date.now() - parsed) / 3600000);
}

/**
 * Feature-weighted journey predictor — structured for future XGBoost / Random Forest training.
 * Uses explainable heuristics aligned with published ED admission and LOS predictors.
 */
export function predictPatientJourney(input: JourneyPredictionInput): PatientJourneyPrediction {
  const { patient } = input;
  const calibration = resolveAdtaCalibration(input.calibration);
  const weights = calibration.weights;
  const vitals = latestVitals(patient);
  const predictors: string[] = [];
  let admissionScore = 0;
  let prolongedScore = 0;
  let cxrScore = 0;

  if (patient.state === PatientState.Admission) {
    admissionScore += weights.admissionState;
    predictors.push('Already in admission pathway');
  }
  if (patient.flags.includes(PatientFlag.PendingAdmission)) {
    admissionScore += weights.pendingAdmissionFlag;
    predictors.push('Pending admission flag');
  }
  if (input.boardingSignals?.decisionTracked || input.boardingSignals?.isBoarded) {
    admissionScore += weights.boardingDecisionTracked;
    predictors.push('Boarding decision tracked');
  }
  if (patient.priority === Priority.P1 || patient.priority === Priority.P2) {
    admissionScore += weights.highAcuity;
    prolongedScore += 18;
    predictors.push(`High acuity (${patient.priority})`);
  }
  if (patient.source === 'EMS' || patient.emsArrival) {
    admissionScore += 8;
    prolongedScore += 12;
    predictors.push('Ambulance arrival');
  }
  if (patient.age >= 72) {
    admissionScore += weights.age75Plus;
    prolongedScore += 10;
    predictors.push(`Age ${patient.age}`);
  }
  if (/\b(chest pain|sob|dyspnea|pneumonia|fall|fracture)\b/i.test(patient.chiefComplaint || '')) {
    admissionScore += weights.admissionComplaint;
    cxrScore += 35;
    predictors.push(`Presentation: ${patient.chiefComplaint?.slice(0, 40)}`);
  }
  if (/\b(cough|fever|respiratory)\b/i.test(patient.chiefComplaint || '')) {
    cxrScore += 28;
  }
  if (vitals?.spo2 != null && Number(vitals.spo2) < 92) {
    admissionScore += weights.hypoxia;
    cxrScore += 22;
    predictors.push(`SpO2 ${vitals.spo2}%`);
  }
  if (vitals?.hr != null && Number(vitals.hr) > 110) {
    admissionScore += 6;
    predictors.push(`Heart rate ${vitals.hr}`);
  }
  if (input.abnormalLabs) {
    admissionScore += weights.abnormalLabs;
    prolongedScore += 14;
    predictors.push('Abnormal labs');
  }
  if ((input.pendingOrders || 0) > 2) {
    admissionScore += weights.pendingOrders;
    prolongedScore += 16;
    predictors.push(`${input.pendingOrders} pending orders`);
  }
  if (input.consultPending) {
    admissionScore += weights.consultPending;
    prolongedScore += 12;
    predictors.push('Consult pending');
  }
  if (input.bedOccupancyPercent != null && input.bedOccupancyPercent >= 90) {
    prolongedScore += 15;
    predictors.push(`Inpatient occupancy ${input.bedOccupancyPercent}%`);
  }

  const elapsedHours = hoursSinceArrival(patient.arrivalTime);
  if (elapsedHours >= 4) prolongedScore += 20;
  if (elapsedHours >= 6) prolongedScore += 15;

  admissionScore = Math.min(100, Math.max(0, admissionScore));
  prolongedScore = Math.min(100, Math.max(0, prolongedScore));
  cxrScore = Math.min(100, Math.max(0, cxrScore));

  const threshold = calibration.alertThreshold ?? DEFAULT_ADTA_CALIBRATION.alertThreshold;
  const admissionBand =
    admissionScore >= 80 ? 'high' : admissionScore >= threshold ? 'elevated' : admissionScore >= 40 ? 'moderate' : 'low';
  const prolongedStayRisk: ProlongedStayRisk =
    prolongedScore >= 70 ? 'high' : prolongedScore >= 45 ? 'moderate' : 'low';
  const maturity = input.boardingSignals?.maturity === 'live' ? 'live' : 'demo';

  return {
    admissionProbability: admissionScore,
    admissionBand,
    prolongedStayRisk,
    prolongedStayProbability: prolongedScore,
    chestXrayUtilizationProbability: cxrScore,
    thresholdBreached: admissionScore >= threshold,
    humanReviewRequired: true,
    keyPredictors: predictors.length ? predictors.slice(0, 5) : ['Insufficient signals — low risk default'],
    envelope: buildOperationalScoreEnvelope({
      value: { admissionProbability: admissionScore, prolongedStayRisk },
      maturity,
      rationale: predictors.length ? predictors : ['Baseline population risk'],
      sourceFields: ['state', 'priority', 'flags', 'chiefComplaint', 'vitals', 'age', 'source', 'arrivalTime'],
    }),
  };
}

export function formatJourneyPredictionSummary(prediction: PatientJourneyPrediction): string {
  return `Admission ${prediction.admissionProbability}% · Prolonged stay ${prediction.prolongedStayRisk}`;
}