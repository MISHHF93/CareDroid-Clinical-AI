import type { Patient } from '../types/emergency';
import {
  formatRoutingLabel,
  getClinicalDomainSpecialist,
  resolveCopilotLayerForCapability,
  type AiTransparencyRecord,
  type CopilotRiskLayerId,
  type PanelRoutingDecision,
} from '../../lib/native-ai';
import { buildNativeAiPatientSnapshot } from './nativeAiCore';

export type AiTransparencyDashboardSnapshot = {
  updatedAt: string;
  records: AiTransparencyRecord[];
  routingTraces: PanelRoutingDecision[];
};

function buildTransparencyRecord(
  patient: Patient,
  capabilityId: string,
  capabilityLabel: string,
  layer: CopilotRiskLayerId,
  confidence: number,
  keyPredictors: string[],
  routing?: PanelRoutingDecision,
  sourceState: AiTransparencyRecord['sourceState'] = 'live',
): AiTransparencyRecord {
  const layerDef = resolveCopilotLayerForCapability(capabilityId);
  return {
    id: `transparency-${patient.id}-${capabilityId}-${Date.now()}`,
    patientId: patient.id,
    capabilityId,
    capabilityLabel,
    layer,
    confidence,
    keyPredictors,
    routingDecision: routing,
    modelId: routing ? getClinicalDomainSpecialist(routing.primaryDomain).modelId : capabilityId,
    modelVersion: routing?.routerModelVersion || '1.0.0',
    sourceState,
    generatedAt: new Date().toISOString(),
    disclaimer: layerDef.disclaimer,
  };
}

export function buildAiTransparencyDashboardSnapshot(
  patients: Patient[],
): AiTransparencyDashboardSnapshot {
  const records: AiTransparencyRecord[] = [];
  const routingTraces: PanelRoutingDecision[] = [];

  patients.forEach((patient) => {
    const snapshot = buildNativeAiPatientSnapshot(patient);
    routingTraces.push(snapshot.routing);

    records.push(
      buildTransparencyRecord(
        patient,
        'panel-router',
        'Panel-of-Experts Router',
        'clinical_decision_support',
        snapshot.routing.confidence,
        [`Routed to ${formatRoutingLabel(snapshot.routing)}`, ...snapshot.routing.keySignals],
        snapshot.routing,
        snapshot.sourceState,
      ),
      buildTransparencyRecord(
        patient,
        'post-ed-orientation',
        'Post-ED Orientation Classifier',
        'clinical_decision_support',
        snapshot.orientation.confidence,
        snapshot.orientation.keyPredictors,
        undefined,
        snapshot.sourceState,
      ),
      buildTransparencyRecord(
        patient,
        'prolonged-stay',
        'Prolonged ED Stay Predictor',
        'clinical_decision_support',
        snapshot.prolongedStay.probabilityPercent / 100,
        snapshot.prolongedStay.keyPredictors,
        undefined,
        snapshot.sourceState,
      ),
      buildTransparencyRecord(
        patient,
        'multi-channel-text',
        'Multi-Channel Text Extractor',
        'documentation_support',
        snapshot.textFeatures.confidence,
        (snapshot.textFeatures.fusedFeatures ?? []).slice(0, 4),
        undefined,
        snapshot.sourceState,
      ),
      buildTransparencyRecord(
        patient,
        'admission-likelihood',
        'Admission Likelihood Classifier',
        'clinical_decision_support',
        snapshot.admissionMl.probabilityPercent / 100,
        snapshot.admissionMl.keyPredictors,
        undefined,
        snapshot.sourceState,
      ),
      ...snapshot.specialistInferences.map((inference) =>
        buildTransparencyRecord(
          patient,
          inference.modelId,
          inference.specialistLabel,
          'clinical_decision_support',
          inference.confidence,
          [inference.prediction, ...inference.keyPredictors],
          snapshot.routing,
          inference.sourceState,
        ),
      ),
    );
  });

  return {
    updatedAt: new Date().toISOString(),
    records: records.sort((left, right) => right.confidence - left.confidence).slice(0, 24),
    routingTraces: routingTraces.slice(0, 12),
  };
}

export function normalizeAiTransparencySnapshot(
  snapshot: AiTransparencyDashboardSnapshot | null | undefined,
): AiTransparencyDashboardSnapshot {
  return {
    updatedAt: snapshot?.updatedAt ?? new Date().toISOString(),
    records: Array.isArray(snapshot?.records) ? snapshot.records : [],
    routingTraces: Array.isArray(snapshot?.routingTraces) ? snapshot.routingTraces : [],
  };
}
