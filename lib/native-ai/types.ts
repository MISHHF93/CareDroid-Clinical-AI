import type { Patient, Priority } from '../../src/types/emergency';

export type ClinicalDomainId =
  | 'cardiac_vascular'
  | 'pulmonary'
  | 'gastro_oesophageal'
  | 'musculoskeletal'
  | 'psychogenic'
  | 'neurology'
  | 'general_emergency';

export type ModelMaturityLabel = 'live' | 'demo' | 'simulated' | 'shadow';

export type NativeAiSourceState = ModelMaturityLabel;

export type PanelRoutingDecision = {
  runId: string;
  patientId?: string;
  routedAt: string;
  chiefComplaint: string;
  primaryDomain: ClinicalDomainId;
  specialistDomains: ClinicalDomainId[];
  confidence: number;
  keySignals: string[];
  routerModelVersion: string;
  sourceState: NativeAiSourceState;
  auditEventId?: string;
  disclaimer: string;
};

export type ModelPerformanceSnapshot = {
  modelId: string;
  version: string;
  metric: 'f1' | 'accuracy' | 'auc';
  value: number;
  evaluatedAt: string;
  sampleSize: number;
  sourceState: NativeAiSourceState;
};

export type DriftAlert = {
  id: string;
  modelId: string;
  detectedAt: string;
  baselineMetric: number;
  currentMetric: number;
  dropPercent: number;
  thresholdPercent: number;
  severity: 'watch' | 'retrain_required';
  summary: string;
  sourceState: NativeAiSourceState;
  /**
   * Found 2026-08-07: modelRegistry.ts's static metrics (f1/accuracy/auc)
   * for 7 of 8 rule-based models could not be traced to any real evaluation
   * run (see that file's own header comment) -- but evaluateModelDrift()
   * falls back to those exact numbers as the baseline whenever no real
   * weekly snapshot history exists yet, and the resulting alert previously
   * carried no signal that its baseline was ever unvalidated. A "5% drop
   * from baseline" reads identically whether the baseline was a real prior
   * measurement or a number nobody can verify. 'recorded_history' means the
   * baseline came from a real prior weekly snapshot; 'unvalidated_registry_default'
   * means it came from modelRegistry.ts's static (unverified) metrics.
   */
  baselineSource: 'recorded_history' | 'unvalidated_registry_default';
};

export type RetrainingAlert = {
  id: string;
  modelId: string;
  triggeredAt: string;
  reason: string;
  status: 'pending_review' | 'approved' | 'rejected' | 'completed';
  driftAlertId?: string;
  proposedVersion: string;
  rollbackVersion: string;
  sourceState: NativeAiSourceState;
};

export type TriageRuleCondition = {
  field: string;
  operator: 'eq' | 'gte' | 'lte' | 'contains' | 'matches';
  value: string | number;
};

export type StructuredTriageRule = {
  id: string;
  label: string;
  naturalLanguageSource: string;
  priority: Priority;
  conditions: TriageRuleCondition[];
  confidence: number;
  requiresHumanReview: true;
  createdAt: string;
  createdBy?: string;
};

export type TriageExpertInference = {
  suggestedPriority: Priority;
  matchedRules: string[];
  confidence: number;
  rationale: string[];
  requiresHumanReview: true;
  sourceState: NativeAiSourceState;
};

export type PostEdOrientationClass = 'admit' | 'edou' | 'discharge';

export type PostEdOrientationPrediction = {
  patientId: string;
  orientation: PostEdOrientationClass;
  probabilities: Record<PostEdOrientationClass, number>;
  confidence: number;
  modelId: string;
  modelVersion: string;
  keyPredictors: string[];
  requiresHumanReview: true;
  sourceState: NativeAiSourceState;
};

export type ProlongedStayPrediction = {
  patientId: string;
  probabilityPercent: number;
  thresholdBreached: boolean;
  predictedHours: number;
  keyPredictors: string[];
  modelId: string;
  modelVersion: string;
  requiresHumanReview: true;
  sourceState: NativeAiSourceState;
};

export type ClinicalAcuityEntry = {
  patientId: string;
  patientLabel: string;
  acuityScore: number;
  triageLevel: Priority;
  admissionProbability: number;
  prolongedStayProbability: number;
  orientation?: PostEdOrientationClass;
  riskDrivers: string[];
  sourceState: NativeAiSourceState;
};

export type CopilotRiskLayerId =
  | 'personal_productivity'
  | 'team_operations'
  | 'documentation_support'
  | 'clinical_decision_support'
  | 'autonomous_tools';

export type AiTransparencyRecord = {
  id: string;
  patientId?: string;
  capabilityId: string;
  capabilityLabel: string;
  layer: CopilotRiskLayerId;
  confidence: number;
  keyPredictors: string[];
  routingDecision?: PanelRoutingDecision;
  modelId: string;
  modelVersion: string;
  sourceState: NativeAiSourceState;
  generatedAt: string;
  disclaimer: string;
};

export type VoiceInterviewTranscript = {
  sessionId: string;
  patientLabel: string;
  transcript: string;
  structuredSymptoms: string[];
  suggestedPriority?: Priority;
  preTriageConfidence: number;
  sourceState: NativeAiSourceState;
  capturedAt: string;
};

export type NativeAiPatientInput = {
  patient: Patient;
  sourceState?: NativeAiSourceState;
  abnormalLabs?: boolean;
  pendingOrders?: number;
  consultPending?: boolean;
};

export type SpecialistInferenceResult = {
  domainId: ClinicalDomainId;
  specialistLabel: string;
  prediction: string;
  confidence: number;
  keyPredictors: string[];
  recommendedTools: string[];
  modelId: string;
  modelVersion: string;
  requiresHumanReview: true;
  sourceState: NativeAiSourceState;
};