import { PatientState, type Patient } from '../../src/types/emergency';
import { latestPatientVitals } from '../shared/patientClinicalHelpers';
import { normalizePriority } from '../../src/types/emergency';
import type { NativeAiSourceState, PostEdOrientationClass, PostEdOrientationPrediction } from './types';

const MODEL_ID = 'post-ed-orientation';
// Not a trained XGBoost model -- confirmed by direct read: this is a
// hand-authored sigmoid-weighted linear combination of fixed coefficients
// (see admitLogit/edouLogit/dischargeLogit below), with zero training step.
// modelRegistry.ts's REGISTRY entry for 'post-ed-orientation' already
// corrected its `algorithm` field to 'rules' for the same reason (Cycle 272
// audit comment above that file's REGISTRY constant). The UI already
// downgrades this to a 'Manual' truth-state via truthLabelForTool(), so this
// rename has no user-facing behavior change -- it only stops the source
// string itself from misleading a future developer or auditor.
const MODEL_VERSION = '1.0.0-linear-heuristic';

function sigmoid(value: number): number {
  return 1 / (1 + Math.exp(-value));
}

function featureVector(patient: Patient, abnormalLabs?: boolean) {
  const vitals = latestPatientVitals(patient);
  const priority = normalizePriority(patient.priority);
  const priorityWeight = priority === 'P1' ? 1 : priority === 'P2' ? 0.75 : priority === 'P3' ? 0.45 : 0.2;
  const age = patient.age ?? 50;
  const ageWeight = age >= 75 ? 1 : age >= 65 ? 0.7 : age >= 50 ? 0.45 : 0.2;
  const hrRaw = vitals?.hr ?? vitals?.heartRate ?? 80;
  const hr = typeof hrRaw === 'number' ? hrRaw : Number(hrRaw) || 80;
  const hrWeight = hr > 110 ? 0.6 : hr > 90 ? 0.35 : 0.1;
  const complaint = `${patient.chiefComplaint || ''} ${patient.complaintCategory || ''}`.toLowerCase();
  const admitComplaint =
    /\bchest pain\b|\bsepsis\b|\bstroke\b|\bgi bleed\b|\brespiratory failure\b|\bacs\b/.test(complaint) ? 0.8 : 0.15;
  const edouComplaint = /\babdominal\b|\bcellulitis\b|\bdehydration\b|\bobservation\b/.test(complaint) ? 0.55 : 0.1;
  const dischargeFriendly =
    patient.state === PatientState.Disposition || /\bminor\b|\bsuture\b|\burinary\b/.test(complaint) ? 0.7 : 0.1;
  const labWeight = abnormalLabs ? 0.55 : 0;

  return {
    priorityWeight,
    ageWeight,
    hrWeight,
    admitComplaint,
    edouComplaint,
    dischargeFriendly,
    labWeight,
    predictors: [
      `Triage class: ${priority}`,
      `Age: ${age}`,
      `HR: ${hr}`,
      abnormalLabs ? 'Abnormal labs flagged' : null,
      admitComplaint > 0.5 ? 'High-acuity complaint pattern' : null,
    ].filter(Boolean) as string[],
  };
}

export function predictPostEdOrientation(
  patient: Patient,
  options: { abnormalLabs?: boolean; sourceState?: NativeAiSourceState } = {},
): PostEdOrientationPrediction {
  const features = featureVector(patient, options.abnormalLabs);

  const admitLogit =
    1.2 * features.priorityWeight +
    0.9 * features.ageWeight +
    0.5 * features.hrWeight +
    1.1 * features.admitComplaint +
    0.8 * features.labWeight -
    0.4 * features.dischargeFriendly;

  const edouLogit =
    0.5 * features.priorityWeight +
    0.3 * features.ageWeight +
    0.9 * features.edouComplaint +
    0.2 * features.labWeight -
    0.2 * features.admitComplaint;

  const dischargeLogit =
    0.8 * features.dischargeFriendly +
    0.2 * (1 - features.priorityWeight) -
    0.7 * features.admitComplaint -
    0.4 * features.labWeight;

  const admit = sigmoid(admitLogit);
  const edou = sigmoid(edouLogit);
  const discharge = sigmoid(dischargeLogit);
  const total = admit + edou + discharge || 1;

  const probabilities: Record<PostEdOrientationClass, number> = {
    admit: Number(((admit / total) * 100).toFixed(1)),
    edou: Number(((edou / total) * 100).toFixed(1)),
    discharge: Number(((discharge / total) * 100).toFixed(1)),
  };

  const orientation = (Object.entries(probabilities).sort((a, b) => b[1] - a[1])[0][0] as PostEdOrientationClass);

  return {
    patientId: patient.id,
    orientation,
    probabilities,
    confidence: Number((Math.max(...Object.values(probabilities)) / 100).toFixed(2)),
    modelId: MODEL_ID,
    modelVersion: MODEL_VERSION,
    keyPredictors: features.predictors,
    requiresHumanReview: true,
    sourceState: options.sourceState || 'demo',
  };
}