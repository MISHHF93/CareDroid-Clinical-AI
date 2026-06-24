import { normalizePriority, type Patient } from '../../src/types/emergency';
import { predictAdmissionLikelihoodMl, predictProlongedEdStay } from './commandMlModels';
import { predictPostEdOrientation } from './postEdOrientationClassifier';
import type { ClinicalAcuityEntry, NativeAiSourceState } from './types';

export function buildClinicalAcuityEntry(
  patient: Patient,
  options: { sourceState?: NativeAiSourceState; now?: number } = {},
): ClinicalAcuityEntry {
  const admission = predictAdmissionLikelihoodMl(patient);
  const prolonged = predictProlongedEdStay(patient, { now: options.now });
  const orientation = predictPostEdOrientation(patient);
  const triageLevel = normalizePriority(patient.priority);

  const acuityScore = Math.min(
    100,
    Math.round(
      admission.probabilityPercent * 0.45 +
        prolonged.probabilityPercent * 0.35 +
        (triageLevel === 'P1' ? 30 : triageLevel === 'P2' ? 22 : triageLevel === 'P3' ? 12 : 5) +
        orientation.confidence * 10,
    ),
  );

  const riskDrivers = [
    ...admission.keyPredictors.slice(0, 2),
    ...prolonged.keyPredictors.slice(0, 2),
    orientation.keyPredictors[0] ? `Orientation signal: ${orientation.orientation}` : null,
  ].filter(Boolean) as string[];

  return {
    patientId: patient.id,
    patientLabel: `${patient.firstName || ''} ${patient.lastName || ''}`.trim() || patient.mrn,
    acuityScore,
    triageLevel,
    admissionProbability: admission.probabilityPercent,
    prolongedStayProbability: prolonged.probabilityPercent,
    orientation: orientation.orientation,
    riskDrivers,
    sourceState: options.sourceState || 'live',
  };
}

export function buildClinicalAcuityLeaderboard(
  patients: Patient[],
  options: { sourceState?: NativeAiSourceState; now?: number } = {},
): ClinicalAcuityEntry[] {
  return patients
    .map((patient) => buildClinicalAcuityEntry(patient, options))
    .sort((left, right) => right.acuityScore - left.acuityScore);
}