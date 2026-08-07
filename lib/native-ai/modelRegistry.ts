import type { ModelMaturityLabel, ModelPerformanceSnapshot } from './types';

/**
 * Cycle 272 (P0.4 AI truth-label audit): 7 of these 8 entries previously
 * claimed a trained-model algorithm (xgboost/random_forest/nlp_hybrid/
 * router) while their actual implementation is confirmed, by direct
 * reading, to be keyword/regex/rule-based scoring with zero training —
 * admission-likelihood -> calculateAdmissionHeuristicScore, prolonged-stay
 * -> predictProlongedEdStay (both hand-weighted additive scoring in
 * commandMlModels.ts), post-ed-orientation -> postEdOrientationClassifier
 * .ts's threshold logic, nlp-triage-expert -> nlpTriageExpertSystem.ts's
 * rule matching, native-ai-router -> panelOfExpertsRouter.ts's keyword
 * scoring, native-ai-cardiac-vascular-v1/native-ai-pulmonary-v1 ->
 * clinicalDomainSpecialists.ts's runClinicalSpecialistInference (keyword +
 * regex pattern matching, +0.03-0.08 additive confidence per matched
 * signal). `algorithm` corrected to 'rules' for all 7. The `metrics`
 * (f1/accuracy/auc) below could not be traced to any evaluation run
 * anywhere in this repo or docs/ai/ — left unchanged rather than guessed
 * at, but flagged in SCORECARD.md/the project scorecard for clinician/
 * product review before being cited externally. `multi-channel-text` was
 * not traced this pass and its algorithm claim is left as-is.
 *
 * 2026-08-07: that same conclusion ("confirmed... zero training" for all 7)
 * was never applied to `maturity` — 4 of the 7 (native-ai-router,
 * nlp-triage-expert, native-ai-cardiac-vascular-v1, native-ai-pulmonary-v1)
 * were still marked `maturity: 'live'` while the other 3 correctly said
 * 'demo', an internal inconsistency this same audit's own text rules out
 * (it names all 7 in one list with no distinction). Corrected the 4 to
 * 'demo' to match. This also fixes 3 downstream consumers that read
 * `.maturity` directly: DriftMonitoringPanel's Model Registry display,
 * driftMonitoring.ts's synthetic performance-snapshot sourceState (built
 * from these same unvalidated metrics when no real history exists), and
 * the backend operational-intelligence snapshot's `fallbackMode` flag
 * (display-only, no consumer branches on it).
 */
export type RegisteredNativeAiModel = {
  id: string;
  label: string;
  version: string;
  domain: string;
  algorithm:
    | 'xgboost'
    | 'random_forest'
    | 'logistic_regression'
    | 'rules'
    | 'router'
    | 'nlp_hybrid';
  status: 'active' | 'shadow' | 'deprecated' | 'rollback_candidate';
  maturity: ModelMaturityLabel;
  metrics: {
    f1?: number;
    accuracy?: number;
    auc?: number;
  };
  deployedAt: string;
  rollbackVersion?: string;
  requiresHumanReview: true;
};

const REGISTRY: RegisteredNativeAiModel[] = [
  {
    id: 'native-ai-router',
    label: 'Panel-of-Experts Router',
    version: '1.0.0',
    domain: 'routing',
    algorithm: 'rules',
    status: 'active',
    maturity: 'demo',
    metrics: { f1: 0.82, accuracy: 0.86 },
    deployedAt: '2026-01-15T00:00:00.000Z',
    rollbackVersion: '0.9.0',
    requiresHumanReview: true,
  },
  {
    id: 'post-ed-orientation',
    label: 'Post-ED Orientation Classifier',
    version: '1.0.0',
    domain: 'disposition',
    algorithm: 'rules',
    status: 'active',
    maturity: 'demo',
    metrics: { accuracy: 0.68, f1: 0.61 },
    deployedAt: '2026-03-01T00:00:00.000Z',
    rollbackVersion: '0.9.0',
    requiresHumanReview: true,
  },
  {
    id: 'prolonged-stay',
    label: 'Prolonged ED Stay Predictor',
    version: '1.0.0',
    domain: 'operations',
    algorithm: 'rules',
    status: 'active',
    maturity: 'demo',
    metrics: { accuracy: 0.71, auc: 0.74 },
    deployedAt: '2026-03-01T00:00:00.000Z',
    rollbackVersion: '0.9.0',
    requiresHumanReview: true,
  },
  {
    id: 'admission-likelihood',
    label: 'Admission Likelihood Classifier',
    version: '1.0.0',
    domain: 'operations',
    algorithm: 'rules',
    status: 'active',
    maturity: 'demo',
    metrics: { accuracy: 0.73, f1: 0.67 },
    deployedAt: '2026-03-01T00:00:00.000Z',
    rollbackVersion: '0.9.0',
    requiresHumanReview: true,
  },
  {
    id: 'nlp-triage-expert',
    label: 'NLP-augmented Triage Expert System',
    version: '1.0.0',
    domain: 'triage',
    algorithm: 'rules',
    status: 'active',
    maturity: 'demo',
    metrics: { f1: 0.79 },
    deployedAt: '2026-02-01T00:00:00.000Z',
    rollbackVersion: '0.9.0',
    requiresHumanReview: true,
  },
  {
    id: 'multi-channel-text',
    label: 'Multi-Channel Clinical Text Extractor',
    version: '1.0.0',
    domain: 'copilot',
    algorithm: 'nlp_hybrid',
    status: 'shadow',
    maturity: 'demo',
    metrics: { f1: 0.76 },
    deployedAt: '2026-04-01T00:00:00.000Z',
    requiresHumanReview: true,
  },
  {
    id: 'native-ai-cardiac-vascular-v1',
    label: 'Cardiac-Vascular Domain Specialist',
    version: '1.0.0',
    domain: 'cardiac_vascular',
    algorithm: 'rules',
    status: 'active',
    maturity: 'demo',
    metrics: { f1: 0.81, accuracy: 0.84 },
    deployedAt: '2026-02-15T00:00:00.000Z',
    rollbackVersion: '0.9.0',
    requiresHumanReview: true,
  },
  {
    id: 'native-ai-pulmonary-v1',
    label: 'Pulmonary Domain Specialist',
    version: '1.0.0',
    domain: 'pulmonary',
    algorithm: 'rules',
    status: 'active',
    maturity: 'demo',
    metrics: { f1: 0.78, accuracy: 0.82 },
    deployedAt: '2026-02-15T00:00:00.000Z',
    rollbackVersion: '0.9.0',
    requiresHumanReview: true,
  },
];

export function listRegisteredModels(): RegisteredNativeAiModel[] {
  return REGISTRY.map((model) => ({ ...model }));
}

export function getRegisteredModel(modelId: string): RegisteredNativeAiModel | null {
  return REGISTRY.find((model) => model.id === modelId) || null;
}

export function getActiveModelVersion(modelId: string): string | null {
  return getRegisteredModel(modelId)?.version || null;
}

export function proposeModelRollback(modelId: string): RegisteredNativeAiModel | null {
  const model = getRegisteredModel(modelId);
  if (!model?.rollbackVersion) return null;
  return {
    ...model,
    version: model.rollbackVersion,
    status: 'rollback_candidate',
  };
}

export function recordModelPerformance(snapshot: ModelPerformanceSnapshot): void {
  const model = REGISTRY.find((entry) => entry.id === snapshot.modelId);
  if (!model) return;
  if (snapshot.metric === 'f1') model.metrics.f1 = snapshot.value;
  if (snapshot.metric === 'accuracy') model.metrics.accuracy = snapshot.value;
  if (snapshot.metric === 'auc') model.metrics.auc = snapshot.value;
}
