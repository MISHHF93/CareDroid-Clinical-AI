import { normalizePriority, type Patient } from '../../src/types/emergency';
import { predictAdmissionLikelihoodMl, predictProlongedEdStay } from './commandMlModels';
import { predictPostEdOrientation } from './postEdOrientationClassifier';
import type { ClinicalAcuityEntry, NativeAiSourceState } from './types';

// admission/prolonged/orientation are all hand-coded heuristic formulas (see
// their own MODEL_VERSION strings), each honestly defaulting to 'demo'. This
// composite score is entirely built from those 3 — it must not default to
// 'live' on its own, or the honest per-prediction disclosure gets erased at
// the exact point it's rendered (ClinicalAcuityLeaderboard.tsx). Only an
// explicit 'simulated' override is worth propagating through.
function heuristicSourceState(explicit?: NativeAiSourceState): NativeAiSourceState | undefined {
  return explicit === 'simulated' ? explicit : undefined;
}

export function buildClinicalAcuityEntry(
  patient: Patient,
  options: { sourceState?: NativeAiSourceState; now?: number } = {},
): ClinicalAcuityEntry {
  const heuristicOverride = heuristicSourceState(options.sourceState);
  const admission = predictAdmissionLikelihoodMl(patient, { sourceState: heuristicOverride });
  const prolonged = predictProlongedEdStay(patient, {
    sourceState: heuristicOverride,
    now: options.now,
  });
  const orientation = predictPostEdOrientation(patient, { sourceState: heuristicOverride });
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
    sourceState: options.sourceState === 'simulated' ? options.sourceState : 'demo',
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
