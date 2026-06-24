import { PatientFlag, PatientState, type Patient } from '../../src/types/emergency';
import {
  hasPatientFlag,
  latestPatientVitals,
  waitMinutesForWhiteboard,
} from '../shared/patientClinicalHelpers';
import { calculateAdmissionHeuristicScore } from './admissionHeuristic';
import type { NativeAiSourceState, ProlongedStayPrediction } from './types';

const PROLONGED_STAY_HOURS = 8;
const MODEL_ID = 'prolonged-stay';
const MODEL_VERSION = '1.0.0-xgboost-heuristic';
const ADMISSION_MODEL_VERSION = '1.0.0-xgboost-heuristic';

export const PROLONGED_STAY_ALERT_THRESHOLD = 65;
export const ADMISSION_ML_ALERT_THRESHOLD = 70;

export function predictProlongedEdStay(
  patient: Patient,
  options: {
    sourceState?: NativeAiSourceState;
    alertThreshold?: number;
    now?: number;
  } = {},
): ProlongedStayPrediction {
  const threshold = options.alertThreshold ?? PROLONGED_STAY_ALERT_THRESHOLD;
  const waitMinutes = waitMinutesForWhiteboard(patient, options.now);
  const vitals = latestPatientVitals(patient);
  const emsArrival = patient.arrival?.arrivalMode === 'EMS' || Boolean(patient.emsArrival);
  const severityWeight =
    patient.priority === 'P1' ? 0.9 : patient.priority === 'P2' ? 0.7 : patient.priority === 'P3' ? 0.45 : 0.2;
  const ordersWeight = patient.state === PatientState.Orders || patient.state === PatientState.Results ? 0.55 : 0.15;
  const boardingWeight = patient.state === PatientState.Admission ? 0.85 : 0;
  const waitWeight = Math.min(1, waitMinutes / (PROLONGED_STAY_HOURS * 60));
  const vitalsWeight =
    vitals?.hr != null && vitals.hr > 100 ? 0.25 : vitals?.spo2 != null && vitals.spo2 < 94 ? 0.35 : 0;

  const logit =
    1.1 * (emsArrival ? 1 : 0) +
    1.3 * severityWeight +
    0.9 * ordersWeight +
    1.4 * boardingWeight +
    1.2 * waitWeight +
    0.6 * vitalsWeight;

  const probability = Math.min(0.97, 1 / (1 + Math.exp(-logit + 1.5)));
  const probabilityPercent = Math.round(probability * 100);
  const predictedHours = Number((waitMinutes / 60 + (probabilityPercent / 100) * 4).toFixed(1));

  const keyPredictors = [
    emsArrival ? 'Ambulance arrival' : null,
    severityWeight >= 0.7 ? `High triage severity (${patient.priority})` : null,
    ordersWeight > 0.4 ? 'Inpatient treatment orders pathway' : null,
    waitMinutes >= 120 ? `Long ED wait (${waitMinutes} min)` : null,
    vitalsWeight > 0 ? 'Abnormal initial vitals' : null,
  ].filter(Boolean) as string[];

  return {
    patientId: patient.id,
    probabilityPercent,
    thresholdBreached: probabilityPercent >= threshold,
    predictedHours,
    keyPredictors,
    modelId: MODEL_ID,
    modelVersion: MODEL_VERSION,
    requiresHumanReview: true,
    sourceState: options.sourceState || 'demo',
  };
}

export function predictAdmissionLikelihoodMl(
  patient: Patient,
  options: {
    sourceState?: NativeAiSourceState;
    abnormalLabs?: boolean;
    consultPending?: boolean;
    alertThreshold?: number;
  } = {},
) {
  const threshold = options.alertThreshold ?? ADMISSION_ML_ALERT_THRESHOLD;
  const score = calculateAdmissionHeuristicScore(patient, {
    abnormalLabs: options.abnormalLabs,
    consultPending: options.consultPending,
    alertThreshold: threshold,
  });

  const vitals = latestPatientVitals(patient);
  const keyPredictors = [
    `Age: ${patient.age ?? 'unknown'}`,
    vitals?.hr != null ? `HR: ${vitals.hr}` : null,
    patient.chiefComplaint ? `Chief complaint: ${patient.chiefComplaint}` : null,
    hasPatientFlag(patient, PatientFlag.PendingAdmission) ? 'Pending admission flag' : null,
    options.abnormalLabs ? 'Abnormal labs' : null,
  ].filter(Boolean) as string[];

  return {
    patientId: patient.id,
    probabilityPercent: score.score,
    thresholdBreached: score.score >= threshold,
    band: score.band,
    modelId: 'admission-likelihood',
    modelVersion: ADMISSION_MODEL_VERSION,
    keyPredictors,
    requiresHumanReview: true as const,
    sourceState: options.sourceState || 'demo',
  };
}

export function scanProlongedStayAlerts(
  patients: Patient[],
  options: { alertThreshold?: number; now?: number } = {},
): ProlongedStayPrediction[] {
  return patients
    .filter((patient) => patient.state !== PatientState.Discharge && patient.state !== PatientState.Deceased)
    .map((patient) => predictProlongedEdStay(patient, options))
    .filter((prediction) => prediction.thresholdBreached)
    .sort((left, right) => right.probabilityPercent - left.probabilityPercent);
}