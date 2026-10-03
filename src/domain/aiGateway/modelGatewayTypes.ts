/**
 * CareDroid Model Gateway Types
 * Provider-neutral AI gateway interfaces supporting multi-provider model registration,
 * capabilities, task-suitability routing, fallback chains, latency/cost tracking, and privacy tiers.
 */

export type ModelProvider =
  | 'anthropic'
  | 'openai'
  | 'google_gemini'
  | 'azure_openai'
  | 'local_vllm'
  | 'local_ollama'
  | 'edge_onnx'
  | 'simulated_fallback';

export type ModelDeploymentLocation =
  | 'cloud_public'
  | 'cloud_dedicated'
  | 'hospital_datacenter'
  | 'edge_server'
  | 'mobile_unit'
  | 'offline_device';

export type ModelPrivacyTier =
  | 'phi_authorized'
  | 'deidentified_only'
  | 'synthetic_only'
  | 'airgapped_local';

export type HealthcareAITask =
  | 'triage_recommendation'
  | 'critical_alert_assessment'
  | 'patient_intake_assist'
  | 'clinical_summary'
  | 'document_extraction'
  | 'radiology_preliminary'
  | 'medication_interaction'
  | 'handoff_sbar'
  | 'operational_bottleneck'
  | 'general_reasoning';

export interface ModelPricing {
  inputPer1kTokensUsd: number;
  outputPer1kTokensUsd: number;
  cachedInputPer1kTokensUsd?: number;
}

export interface ModelPerformanceBenchmark {
  averageLatencyMs: number;
  p95LatencyMs: number;
  tokensPerSecond: number;
  accuracyScorePercent: number;
  clinicalSafetyScorePercent: number;
  lastEvaluatedAt: string;
}

export interface RegisteredModel {
  id: string;
  name: string;
  provider: ModelProvider;
  version: string;
  contextWindowTokens: number;
  maxOutputTokens: number;
  deploymentLocation: ModelDeploymentLocation;
  privacyTier: ModelPrivacyTier;
  supportedTasks: HealthcareAITask[];
  pricing: ModelPricing;
  benchmark: ModelPerformanceBenchmark;
  isAvailable: boolean;
  requiresClinicianReview: boolean;
  circuitBreakerTripped: boolean;
  consecutiveFailures: number;
}

export interface ModelRoutingRequest {
  taskId: string;
  task: HealthcareAITask;
  promptTokensEstimate: number;
  maxResponseTokens?: number;
  requiredPrivacyTier: ModelPrivacyTier;
  maxAcceptableLatencyMs?: number;
  maxCostUsd?: number;
  allowCloudProviders: boolean;
  preferredModelId?: string;
  tenantId?: string;
}

export interface ModelRoutingDecision {
  selectedModel: RegisteredModel;
  fallbackModels: RegisteredModel[];
  estimatedLatencyMs: number;
  estimatedCostUsd: number;
  routingReason: string;
  decisionTimestamp: string;
}

export interface ModelExecutionResult<T = unknown> {
  success: boolean;
  modelId: string;
  provider: ModelProvider;
  data?: T;
  rawText?: string;
  inputTokens: number;
  outputTokens: number;
  totalCostUsd: number;
  executionLatencyMs: number;
  usedFallback: boolean;
  fallbackCount: number;
  error?: string;
  safetyWarnings: string[];
  clinicianReviewRequired: boolean;
}
