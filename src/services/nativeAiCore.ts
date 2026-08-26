import type { Patient } from '../types/emergency';
import {
  addStructuredTriageRule,
  appendRoutingAuditEntry,
  buildClinicalAcuityLeaderboard,
  buildContinualLearningSummary,
  extractMultiChannelClinicalTextFeatures,
  formatRoutingLabel,
  getDriftPerformanceHistory,
  inferTriageFromExpertSystem,
  listRegisteredModels,
  listRetrainingAlerts,
  listStructuredTriageRules,
  loadRoutingAuditLog,
  parseNaturalLanguageTriageRule,
  predictAdmissionLikelihoodMl,
  predictPostEdOrientation,
  predictProlongedEdStay,
  removeStructuredTriageRule,
  routePatientToClinicalSpecialists,
  runRoutedSpecialistPanel,
  runWeeklyNativeAiDriftEvaluation,
  scanProlongedStayAlerts,
  type NativeAiSourceState,
  type PanelRoutingDecision,
  type SpecialistInferenceResult,
} from '../../lib/native-ai';
import { isSimulationModeActive } from './simulationModeService';

export type NativeAiPatientSnapshot = {
  patientId: string;
  sourceState: NativeAiSourceState;
  routing: PanelRoutingDecision;
  specialistInferences: SpecialistInferenceResult[];
  triageInference: ReturnType<typeof inferTriageFromExpertSystem>;
  orientation: ReturnType<typeof predictPostEdOrientation>;
  prolongedStay: ReturnType<typeof predictProlongedEdStay>;
  admissionMl: ReturnType<typeof predictAdmissionLikelihoodMl>;
  textFeatures: ReturnType<typeof extractMultiChannelClinicalTextFeatures>;
};

const routingAuditLog: PanelRoutingDecision[] = [];

function resolveSourceState(explicit?: NativeAiSourceState): NativeAiSourceState {
  if (explicit) return explicit;
  return isSimulationModeActive() ? 'simulated' : 'live';
}

/**
 * predictPostEdOrientation/predictProlongedEdStay/predictAdmissionLikelihoodMl/
 * extractMultiChannelClinicalTextFeatures/routePatientToClinicalSpecialists/
 * runRoutedSpecialistPanel/inferTriageFromExpertSystem are ALL hand-coded
 * heuristic formulas (keyword matching + vitals thresholds; zero ML/LLM) and
 * each already defaults its own sourceState to 'demo' — an honest, correct
 * self-classification. Passing the session-level resolveSourceState() result
 * straight through overrides that honest default with 'live' outside
 * simulation mode, mislabeling every one of these unvalidated heuristics as
 * real live inference (surfaced most visibly in AiTransparencyDashboard).
 * Only forward the resolved state when it's the (also honest) 'simulated'
 * case; otherwise let each function's own 'demo' default stand.
 *
 * 2026-08-09: this filter used to only wrap 4 of the 7 heuristic calls below
 * (orientation/prolongedStay/admissionMl/textFeatures) -- routing,
 * specialistInferences, and triageInference received the raw sourceState
 * unfiltered, so they still inherited 'live' by default. Extended to all 7.
 */
function heuristicSourceState(sourceState: NativeAiSourceState): NativeAiSourceState | undefined {
  return sourceState === 'simulated' ? sourceState : undefined;
}

export function buildNativeAiPatientSnapshot(
  patient: Patient,
  options: {
    sourceState?: NativeAiSourceState;
    abnormalLabs?: boolean;
    consultPending?: boolean;
    now?: number;
  } = {},
): NativeAiPatientSnapshot {
  const sourceState = resolveSourceState(options.sourceState);
  const routing = routePatientToClinicalSpecialists(patient, {
    sourceState: heuristicSourceState(sourceState),
  });
  routingAuditLog.unshift(routing);
  if (routingAuditLog.length > 200) routingAuditLog.length = 200;
  appendRoutingAuditEntry(routing);

  const specialistInferences = runRoutedSpecialistPanel(patient, routing.specialistDomains, {
    sourceState: heuristicSourceState(sourceState),
    routingConfidence: routing.confidence,
  });

  const complaintText = [
    patient.chiefComplaint,
    patient.complaint,
    ...(patient.notes || []).slice(-2).map((note) => note.text || note.body || ''),
  ]
    .filter(Boolean)
    .join('\n');

  return {
    patientId: patient.id,
    sourceState,
    routing,
    specialistInferences,
    triageInference: inferTriageFromExpertSystem(patient, {
      sourceState: heuristicSourceState(sourceState),
    }),
    orientation: predictPostEdOrientation(patient, {
      abnormalLabs: options.abnormalLabs,
      sourceState: heuristicSourceState(sourceState),
    }),
    prolongedStay: predictProlongedEdStay(patient, {
      sourceState: heuristicSourceState(sourceState),
      now: options.now,
    }),
    admissionMl: predictAdmissionLikelihoodMl(patient, {
      abnormalLabs: options.abnormalLabs,
      consultPending: options.consultPending,
      sourceState: heuristicSourceState(sourceState),
    }),
    textFeatures: extractMultiChannelClinicalTextFeatures({
      text: complaintText,
      sourceLabel: 'patient-card',
      sourceState: heuristicSourceState(sourceState),
    }),
  };
}

export function getNativeAiRoutingAuditLog(patientId?: string): PanelRoutingDecision[] {
  const inMemory = patientId
    ? routingAuditLog.filter((entry) => entry.patientId === patientId)
    : [...routingAuditLog];
  if (inMemory.length) return inMemory;
  const persisted = loadRoutingAuditLog() as PanelRoutingDecision[];
  return patientId ? persisted.filter((entry) => entry.patientId === patientId) : persisted;
}

export function getNativeAiRegistrySummary() {
  return {
    models: listRegisteredModels(),
    continualLearning: buildContinualLearningSummary(),
    retrainingAlerts: listRetrainingAlerts(),
  };
}

export {
  addStructuredTriageRule,
  buildClinicalAcuityLeaderboard,
  formatRoutingLabel,
  getDriftPerformanceHistory,
  inferTriageFromExpertSystem,
  listStructuredTriageRules,
  parseNaturalLanguageTriageRule,
  predictPostEdOrientation,
  removeStructuredTriageRule,
  runWeeklyNativeAiDriftEvaluation,
  scanProlongedStayAlerts,
};
