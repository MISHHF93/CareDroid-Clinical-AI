import {
  EXTERNAL_DATA_REVIEW_DISCLAIMER,
  HUMAN_REVIEW_DISCLAIMER,
} from './safetyPolicy';

export type AIProvider = 'anthropic' | 'openai' | 'azure-openai' | 'gemini' | 'groq' | 'local';
export type GovernanceAIProvider = AIProvider | 'azure_openai';

type EnvSource = Record<string, string | undefined>;

export interface TenantAISettings {
  aiEnabled: boolean;
  edCopilotEnabled: boolean;
  smartIntakeAiEnabled: boolean;
  referralAiEnabled: boolean;
  analyticsAiEnabled: boolean;
  clinicalWorkflowAiEnabled: boolean;
  aiAuditLoggingEnabled: boolean;
  aiPatientContextEnabled: boolean;
}

export interface AIProviderConfig {
  provider: AIProvider;
  model: string;
  fallbackModel: string;
  temperature: number;
  maxTokens: number;
  stream: boolean;
}

export interface AIPlatformServiceConfig {
  name: string;
  provider: GovernanceAIProvider;
  model: string;
  purpose: string;
  owner: string;
  riskLevel: 'low' | 'medium' | 'high';
  regulatoryCategory: 'informational' | 'clinical_decision_support' | 'identity_resolution';
  requiresHumanReview: boolean;
  maxTokens: number;
  temperature: number;
  rateLimit: {
    requestsPerMinute: number;
    tokensPerMinute: number;
  };
  safetyConstraints: string[];
  fallbackEnabled: boolean;
  auditLevel: 'none' | 'basic' | 'full';
  status: 'active' | 'legacy' | 'future' | 'local-deterministic';
}

export interface AIRiskModelThresholds {
  deterioration: {
    moderate: number;
    high: number;
    critical: number;
  };
  dischargeReadiness: {
    monitor: number;
    preparePaperwork: number;
    dischargeNow: number;
  };
  emsTriage: {
    emergency: number;
    immediate: number;
  };
  edgeAmbulance: {
    ultrasoundBleeding: number;
    fractureSignal: number;
    severeHypoxiaSpo2: number;
    hypoxiaSpo2: number;
    hypotensionSbp: number;
  };
}

export interface AIRagConfig {
  enabled: boolean;
  pinecone: {
    indexName: string;
    dimension: number;
    environment: string;
    namespace: string;
  };
  embeddings: {
    model: string;
    dimension: number;
    batchSize: number;
  };
  chunking: {
    chunkSize: number;
    overlap: number;
    respectBoundaries: boolean;
  };
  retrieval: {
    defaultTopK: number;
    minScore: number;
    maxTokens: number;
  };
  reranking: {
    enabled: boolean;
    provider: 'local' | AIProvider;
    model: string;
  };
}

export interface AIExternalMlServiceConfig {
  enabled: boolean;
  url: string;
  timeoutMs: number;
  retries: number;
}

export interface AINluConfig extends AIExternalMlServiceConfig {
  confidenceThreshold: number;
}

export interface AIPlatformConfig {
  platformBuild: string;
  provider: AIProviderConfig;
  tenantSettings: TenantAISettings;
  services: Readonly<Record<string, AIPlatformServiceConfig>>;
  riskThresholds: AIRiskModelThresholds;
  rag: AIRagConfig;
  nlu: AINluConfig;
  anomalyDetection: AIExternalMlServiceConfig;
  governance: {
    auditRetentionDays: number;
    requiredDisclaimers: string[];
    cannotLowerPriorityFor: {
      dpsScores: number[];
      conditions: string[];
      abnormalVitals: string[];
    };
  };
}

export const CARE_AI_PLATFORM_BUILD = 'emergency-os-2026.06';

export const DEFAULT_TENANT_AI_SETTINGS: TenantAISettings = Object.freeze({
  aiEnabled: false,
  edCopilotEnabled: true,
  smartIntakeAiEnabled: false,
  referralAiEnabled: false,
  analyticsAiEnabled: false,
  clinicalWorkflowAiEnabled: false,
  aiAuditLoggingEnabled: true,
  aiPatientContextEnabled: false,
});

export const DEFAULT_AI_PROVIDER_CONFIG: AIProviderConfig = Object.freeze({
  provider: 'anthropic',
  model: 'claude-sonnet-4-6',
  fallbackModel: 'claude-sonnet-4-6',
  temperature: 0.2,
  maxTokens: 2000,
  stream: false,
});

export const DEFAULT_AI_RISK_THRESHOLDS: AIRiskModelThresholds = Object.freeze({
  deterioration: {
    moderate: 0.38,
    high: 0.62,
    critical: 0.8,
  },
  dischargeReadiness: {
    monitor: 50,
    preparePaperwork: 70,
    dischargeNow: 85,
  },
  emsTriage: {
    emergency: 0.55,
    immediate: 0.78,
  },
  edgeAmbulance: {
    ultrasoundBleeding: 0.8,
    fractureSignal: 0.72,
    severeHypoxiaSpo2: 90,
    hypoxiaSpo2: 94,
    hypotensionSbp: 90,
  },
});

export const DEFAULT_AI_RAG_CONFIG: AIRagConfig = Object.freeze({
  enabled: true,
  pinecone: {
    indexName: 'caredroid-medical-knowledge',
    dimension: 1536,
    environment: 'us-east-1-aws',
    namespace: 'medical-docs',
  },
  embeddings: {
    model: 'Xenova/all-mpnet-base-v2',
    dimension: 768,
    batchSize: 100,
  },
  chunking: {
    chunkSize: 512,
    overlap: 50,
    respectBoundaries: true,
  },
  retrieval: {
    defaultTopK: 5,
    minScore: 0.7,
    maxTokens: 2000,
  },
  reranking: {
    enabled: false,
    provider: 'local' as AIProvider,
    model: 'local-keyword-reranker',
  },
});

export const DEFAULT_AI_NLU_CONFIG: AINluConfig = Object.freeze({
  enabled: true,
  // In-process TypeScript NLU at /api/nlu on the Nest backend (no Python sidecar).
  url: 'http://127.0.0.1:8000/api/nlu',
  timeoutMs: 30000,
  retries: 3,
  confidenceThreshold: 0.7,
});

export const DEFAULT_AI_ANOMALY_DETECTION_CONFIG: AIExternalMlServiceConfig = Object.freeze({
  enabled: true,
  url: 'http://anomaly-detection:5000',
  timeoutMs: 30000,
  retries: 3,
});

export function readAIProviderConfig(env: EnvSource = getRuntimeEnv()): AIProviderConfig {
  return {
    provider: normalizeProvider(env.AI_PROVIDER || DEFAULT_AI_PROVIDER_CONFIG.provider),
    model: readFirst(env, ['AI_MODEL', 'AI_COPILOT_MODEL'], DEFAULT_AI_PROVIDER_CONFIG.model),
    fallbackModel: readFirst(env, ['AI_FALLBACK_MODEL'], DEFAULT_AI_PROVIDER_CONFIG.fallbackModel),
    temperature: parseNumber(env.AI_TEMPERATURE, DEFAULT_AI_PROVIDER_CONFIG.temperature, 0, 2),
    maxTokens: parseInteger(env.AI_MAX_TOKENS, DEFAULT_AI_PROVIDER_CONFIG.maxTokens, 1),
    stream: readBoolean(env.AI_STREAMING_ENABLED, DEFAULT_AI_PROVIDER_CONFIG.stream),
  };
}

export function readTenantAISettings(env: EnvSource = getRuntimeEnv()): TenantAISettings {
  return {
    aiEnabled: readBoolean(env.AI_ENABLED, DEFAULT_TENANT_AI_SETTINGS.aiEnabled),
    edCopilotEnabled: readBoolean(
      env.ED_COPILOT_AI_ENABLED,
      DEFAULT_TENANT_AI_SETTINGS.edCopilotEnabled,
    ),
    smartIntakeAiEnabled: readBoolean(
      env.SMART_INTAKE_AI_ENABLED,
      DEFAULT_TENANT_AI_SETTINGS.smartIntakeAiEnabled,
    ),
    referralAiEnabled: readBoolean(
      env.REFERRAL_AI_ENABLED,
      DEFAULT_TENANT_AI_SETTINGS.referralAiEnabled,
    ),
    analyticsAiEnabled: readBoolean(
      env.ANALYTICS_AI_ENABLED,
      DEFAULT_TENANT_AI_SETTINGS.analyticsAiEnabled,
    ),
    clinicalWorkflowAiEnabled: readBoolean(
      env.CLINICAL_WORKFLOW_AI_ENABLED,
      DEFAULT_TENANT_AI_SETTINGS.clinicalWorkflowAiEnabled,
    ),
    aiAuditLoggingEnabled: readBoolean(
      env.AI_AUDIT_LOGGING_ENABLED,
      DEFAULT_TENANT_AI_SETTINGS.aiAuditLoggingEnabled,
    ),
    aiPatientContextEnabled: readBoolean(
      env.AI_PATIENT_CONTEXT_ENABLED,
      DEFAULT_TENANT_AI_SETTINGS.aiPatientContextEnabled,
    ),
  };
}

export function readAIPlatformConfig(env: EnvSource = getRuntimeEnv()): AIPlatformConfig {
  const provider = readAIProviderConfig(env);
  const tenantSettings = readTenantAISettings(env);
  const riskThresholds = readRiskThresholds(env);
  const rag = readRagConfig(env);
  const nlu = readNluConfig(env);
  const anomalyDetection = readAnomalyDetectionConfig(env);
  const services = buildServiceRegistry(env, provider);

  return {
    platformBuild: readFirst(env, ['AI_PLATFORM_BUILD'], CARE_AI_PLATFORM_BUILD),
    provider,
    tenantSettings,
    services,
    riskThresholds,
    rag,
    nlu,
    anomalyDetection,
    governance: {
      auditRetentionDays: parseInteger(env.AI_AUDIT_RETENTION_DAYS, 2555, 1),
      requiredDisclaimers: [
        HUMAN_REVIEW_DISCLAIMER,
        EXTERNAL_DATA_REVIEW_DISCLAIMER,
        'AI-generated content - verify before acting',
      ],
      cannotLowerPriorityFor: {
        dpsScores: [1, 2],
        conditions: ['stroke', 'sepsis', 'chest_pain'],
        abnormalVitals: ['hr > 120', 'bp < 90/60', 'o2 < 92', 'rr > 24'],
      },
    },
  };
}

export function readRiskThresholds(env: EnvSource = getRuntimeEnv()): AIRiskModelThresholds {
  return {
    deterioration: {
      moderate: parseNumber(
        env.AI_DETERIORATION_MODERATE_THRESHOLD,
        DEFAULT_AI_RISK_THRESHOLDS.deterioration.moderate,
        0,
        1,
      ),
      high: parseNumber(
        env.AI_DETERIORATION_HIGH_THRESHOLD,
        DEFAULT_AI_RISK_THRESHOLDS.deterioration.high,
        0,
        1,
      ),
      critical: parseNumber(
        env.AI_DETERIORATION_CRITICAL_THRESHOLD,
        DEFAULT_AI_RISK_THRESHOLDS.deterioration.critical,
        0,
        1,
      ),
    },
    dischargeReadiness: {
      monitor: parseInteger(
        env.AI_DISCHARGE_MONITOR_THRESHOLD,
        DEFAULT_AI_RISK_THRESHOLDS.dischargeReadiness.monitor,
        0,
        100,
      ),
      preparePaperwork: parseInteger(
        env.AI_DISCHARGE_PREPARE_THRESHOLD,
        DEFAULT_AI_RISK_THRESHOLDS.dischargeReadiness.preparePaperwork,
        0,
        100,
      ),
      dischargeNow: parseInteger(
        env.AI_DISCHARGE_NOW_THRESHOLD,
        DEFAULT_AI_RISK_THRESHOLDS.dischargeReadiness.dischargeNow,
        0,
        100,
      ),
    },
    emsTriage: {
      emergency: parseNumber(
        env.AI_EMS_EMERGENCY_THRESHOLD,
        DEFAULT_AI_RISK_THRESHOLDS.emsTriage.emergency,
        0,
        1,
      ),
      immediate: parseNumber(
        env.AI_EMS_IMMEDIATE_THRESHOLD,
        DEFAULT_AI_RISK_THRESHOLDS.emsTriage.immediate,
        0,
        1,
      ),
    },
    edgeAmbulance: {
      ultrasoundBleeding: parseNumber(
        env.AI_EDGE_ULTRASOUND_BLEEDING_THRESHOLD,
        DEFAULT_AI_RISK_THRESHOLDS.edgeAmbulance.ultrasoundBleeding,
        0,
        1,
      ),
      fractureSignal: parseNumber(
        env.AI_EDGE_FRACTURE_THRESHOLD,
        DEFAULT_AI_RISK_THRESHOLDS.edgeAmbulance.fractureSignal,
        0,
        1,
      ),
      severeHypoxiaSpo2: parseInteger(
        env.AI_EDGE_SEVERE_HYPOXIA_SPO2,
        DEFAULT_AI_RISK_THRESHOLDS.edgeAmbulance.severeHypoxiaSpo2,
        0,
        100,
      ),
      hypoxiaSpo2: parseInteger(
        env.AI_EDGE_HYPOXIA_SPO2,
        DEFAULT_AI_RISK_THRESHOLDS.edgeAmbulance.hypoxiaSpo2,
        0,
        100,
      ),
      hypotensionSbp: parseInteger(
        env.AI_EDGE_HYPOTENSION_SBP,
        DEFAULT_AI_RISK_THRESHOLDS.edgeAmbulance.hypotensionSbp,
        0,
        300,
      ),
    },
  };
}

export function readRagConfig(env: EnvSource = getRuntimeEnv()): AIRagConfig {
  return {
    enabled: readBoolean(env.RAG_ENABLED, DEFAULT_AI_RAG_CONFIG.enabled),
    pinecone: {
      indexName: readFirst(env, ['PINECONE_INDEX_NAME'], DEFAULT_AI_RAG_CONFIG.pinecone.indexName),
      dimension: parseInteger(
        env.PINECONE_DIMENSION,
        DEFAULT_AI_RAG_CONFIG.pinecone.dimension,
        1,
      ),
      environment: readFirst(
        env,
        ['PINECONE_ENVIRONMENT'],
        DEFAULT_AI_RAG_CONFIG.pinecone.environment,
      ),
      namespace: env.PINECONE_NAMESPACE || DEFAULT_AI_RAG_CONFIG.pinecone.namespace,
    },
    embeddings: {
      model: readFirst(
        env,
        ['AI_EMBEDDING_MODEL', 'RAG_MODEL', 'EMBEDDING_MODEL'],
        DEFAULT_AI_RAG_CONFIG.embeddings.model,
      ),
      dimension: parseInteger(
        env.EMBEDDING_DIMENSION,
        DEFAULT_AI_RAG_CONFIG.embeddings.dimension,
        1,
      ),
      batchSize: parseInteger(
        env.EMBEDDING_BATCH_SIZE,
        DEFAULT_AI_RAG_CONFIG.embeddings.batchSize,
        1,
      ),
    },
    chunking: {
      chunkSize: parseInteger(env.CHUNK_SIZE, DEFAULT_AI_RAG_CONFIG.chunking.chunkSize, 1),
      overlap: parseInteger(env.CHUNK_OVERLAP, DEFAULT_AI_RAG_CONFIG.chunking.overlap, 0),
      respectBoundaries: readBoolean(
        env.CHUNK_RESPECT_BOUNDARIES,
        DEFAULT_AI_RAG_CONFIG.chunking.respectBoundaries,
      ),
    },
    retrieval: {
      defaultTopK: parseInteger(env.RAG_TOP_K, DEFAULT_AI_RAG_CONFIG.retrieval.defaultTopK, 1),
      minScore: parseNumber(env.RAG_MIN_SCORE, DEFAULT_AI_RAG_CONFIG.retrieval.minScore, 0, 1),
      maxTokens: parseInteger(
        env.RAG_MAX_TOKENS,
        DEFAULT_AI_RAG_CONFIG.retrieval.maxTokens,
        1,
      ),
    },
    reranking: {
      enabled: readBoolean(env.RERANK_ENABLED, DEFAULT_AI_RAG_CONFIG.reranking.enabled),
      provider: normalizeProvider(env.RERANK_PROVIDER || DEFAULT_AI_RAG_CONFIG.reranking.provider),
      model: readFirst(env, ['RERANK_MODEL'], DEFAULT_AI_RAG_CONFIG.reranking.model),
    },
  };
}

export function readNluConfig(env: EnvSource = getRuntimeEnv()): AINluConfig {
  return {
    enabled: readBoolean(env.NLU_SERVICE_ENABLED, DEFAULT_AI_NLU_CONFIG.enabled),
    url: env.NLU_SERVICE_URL || DEFAULT_AI_NLU_CONFIG.url,
    timeoutMs: parseInteger(env.NLU_SERVICE_TIMEOUT, DEFAULT_AI_NLU_CONFIG.timeoutMs, 1),
    retries: parseInteger(env.NLU_SERVICE_RETRIES, DEFAULT_AI_NLU_CONFIG.retries, 0),
    confidenceThreshold: parseNumber(
      env.NLU_CONFIDENCE_THRESHOLD,
      DEFAULT_AI_NLU_CONFIG.confidenceThreshold,
      0,
      1,
    ),
  };
}

export function readAnomalyDetectionConfig(
  env: EnvSource = getRuntimeEnv(),
): AIExternalMlServiceConfig {
  return {
    enabled: readBoolean(
      env.ANOMALY_DETECTION_ENABLED,
      DEFAULT_AI_ANOMALY_DETECTION_CONFIG.enabled,
    ),
    url: env.ANOMALY_DETECTION_URL || DEFAULT_AI_ANOMALY_DETECTION_CONFIG.url,
    timeoutMs: parseInteger(
      env.ANOMALY_DETECTION_TIMEOUT,
      DEFAULT_AI_ANOMALY_DETECTION_CONFIG.timeoutMs,
      1,
    ),
    retries: parseInteger(
      env.ANOMALY_DETECTION_RETRIES,
      DEFAULT_AI_ANOMALY_DETECTION_CONFIG.retries,
      0,
    ),
  };
}

function buildServiceRegistry(
  env: EnvSource,
  provider: AIProviderConfig,
): Readonly<Record<string, AIPlatformServiceConfig>> {
  const generationProvider = governanceProvider(provider.provider);
  const generationModel = provider.model;

  return Object.freeze({
    copilot: {
      name: 'ED Copilot',
      provider: generationProvider,
      model: readFirst(env, ['AI_COPILOT_MODEL', 'AI_MODEL'], generationModel),
      purpose:
        'Operational assistant for ED workflow - answers queries about wait times, reassessments, bottlenecks, capacity, EMS, boarding, and queues',
      owner: 'Clinical Informatics',
      riskLevel: 'medium',
      regulatoryCategory: 'informational',
      requiresHumanReview: true,
      maxTokens: provider.maxTokens,
      temperature: provider.temperature,
      rateLimit: { requestsPerMinute: 30, tokensPerMinute: 60000 },
      safetyConstraints: [
        'Cannot make autonomous clinical recommendations',
        'Cannot override human judgment',
        'Cannot lower priority for DPS 1-2 patients',
        'Must include "Human review required" disclaimer',
      ],
      fallbackEnabled: true,
      auditLevel: 'full',
      status: 'active',
    },
    smartIntakeVerification: {
      name: 'Smart Intake Verification',
      provider: generationProvider,
      model: readFirst(env, ['AI_SMART_INTAKE_MODEL', 'AI_MODEL'], generationModel),
      purpose: 'Support staff verification of Smart Intake fields and missing information',
      owner: 'Emergency Nursing',
      riskLevel: 'medium',
      regulatoryCategory: 'informational',
      requiresHumanReview: true,
      maxTokens: 1000,
      temperature: 0.1,
      rateLimit: { requestsPerMinute: 20, tokensPerMinute: 20000 },
      safetyConstraints: [
        'Cannot auto-triage',
        'Cannot auto-link patient identity',
        'Cannot auto-import external health data',
        `Must include "${HUMAN_REVIEW_DISCLAIMER}" disclaimer`,
      ],
      fallbackEnabled: true,
      auditLevel: 'full',
      status: 'active',
    },
    referralSummarization: {
      name: 'Referral Summarization',
      provider: generationProvider,
      model: readFirst(env, ['AI_REFERRAL_MODEL', 'AI_MODEL'], generationModel),
      purpose: 'Summarize referral context, missing information, urgency, and destination service',
      owner: 'Emergency Operations',
      riskLevel: 'medium',
      regulatoryCategory: 'clinical_decision_support',
      requiresHumanReview: true,
      maxTokens: 1500,
      temperature: 0.2,
      rateLimit: { requestsPerMinute: 20, tokensPerMinute: 30000 },
      safetyConstraints: [
        'Cannot decide disposition',
        'Cannot replace specialist or clinician review',
        `Must include "${HUMAN_REVIEW_DISCLAIMER}" disclaimer`,
      ],
      fallbackEnabled: true,
      auditLevel: 'full',
      status: 'active',
    },
    analyticsExplanation: {
      name: 'Operational Analytics Explanation',
      provider: generationProvider,
      model: readFirst(env, ['AI_ANALYTICS_MODEL', 'AI_MODEL'], generationModel),
      purpose: 'Explain CareDroid operational analytics, queues, capacity, boarding, EMS, and reassessment trends',
      owner: 'Emergency Operations',
      riskLevel: 'low',
      regulatoryCategory: 'informational',
      requiresHumanReview: true,
      maxTokens: 1500,
      temperature: 0.2,
      rateLimit: { requestsPerMinute: 20, tokensPerMinute: 30000 },
      safetyConstraints: [
        'Cannot make autonomous staffing, transfer, admission, or discharge decisions',
        `Must include "${HUMAN_REVIEW_DISCLAIMER}" disclaimer`,
      ],
      fallbackEnabled: true,
      auditLevel: 'full',
      status: 'active',
    },
    clinicalWorkflowLauncher: {
      name: 'Clinical Workflow Launcher',
      provider: generationProvider,
      model: readFirst(env, ['AI_WORKFLOW_MODEL', 'AI_MODEL'], generationModel),
      purpose: 'Suggest relevant CareDroid workflows, checklists, and calculators for human launch',
      owner: 'Clinical Informatics',
      riskLevel: 'medium',
      regulatoryCategory: 'clinical_decision_support',
      requiresHumanReview: true,
      maxTokens: 1000,
      temperature: 0.1,
      rateLimit: { requestsPerMinute: 20, tokensPerMinute: 20000 },
      safetyConstraints: [
        'Cannot diagnose, prescribe, or disposition patients',
        'Workflow launches require human action',
        `Must include "${HUMAN_REVIEW_DISCLAIMER}" disclaimer`,
      ],
      fallbackEnabled: true,
      auditLevel: 'full',
      status: 'active',
    },
    calculatorExplanation: {
      name: 'Calculator Explanation',
      provider: generationProvider,
      model: readFirst(env, ['AI_CALCULATOR_MODEL', 'AI_MODEL'], generationModel),
      purpose: 'Explain calculator inputs, missing values, score bands, limitations, and next human-review steps',
      owner: 'Clinical Tooling',
      riskLevel: 'medium',
      regulatoryCategory: 'clinical_decision_support',
      requiresHumanReview: true,
      maxTokens: 1000,
      temperature: 0.1,
      rateLimit: { requestsPerMinute: 20, tokensPerMinute: 20000 },
      safetyConstraints: [
        'Cannot invent calculator inputs',
        'Cannot use score as an autonomous decision',
        `Must include "${HUMAN_REVIEW_DISCLAIMER}" disclaimer`,
      ],
      fallbackEnabled: true,
      auditLevel: 'full',
      status: 'active',
    },
    smartHandover: {
      name: 'Smart Handover',
      provider: generationProvider,
      model: readFirst(env, ['AI_HANDOVER_MODEL', 'AI_MODEL'], generationModel),
      purpose: 'Generate clinical handover summaries from patient data',
      owner: 'Clinical Operations',
      riskLevel: 'medium',
      regulatoryCategory: 'clinical_decision_support',
      requiresHumanReview: true,
      maxTokens: 4000,
      temperature: 0.2,
      rateLimit: { requestsPerMinute: 10, tokensPerMinute: 40000 },
      safetyConstraints: [
        'Must be reviewed by receiving clinician',
        'Cannot replace verbal handoff',
        'Must include disclaimer about AI generation',
      ],
      fallbackEnabled: true,
      auditLevel: 'full',
      status: 'legacy',
    },
    protocolTrigger: {
      name: 'Protocol Auto-Trigger',
      provider: 'local',
      model: readFirst(env, ['AI_PROTOCOL_TRIGGER_MODEL'], 'rule-based-protocol-trigger-v1'),
      purpose: 'Detect clinical deterioration and trigger appropriate protocols',
      owner: 'Quality and Safety',
      riskLevel: 'high',
      regulatoryCategory: 'clinical_decision_support',
      requiresHumanReview: false,
      maxTokens: 0,
      temperature: 0,
      rateLimit: { requestsPerMinute: 600, tokensPerMinute: 0 },
      safetyConstraints: [
        'Rules are clinically validated',
        'Overrides require clinician acknowledgment',
      ],
      fallbackEnabled: false,
      auditLevel: 'full',
      status: 'local-deterministic',
    },
    deteriorationPrediction: {
      name: 'Deterioration Prediction',
      provider: 'local',
      model: readFirst(
        env,
        ['AI_DETERIORATION_MODEL', 'DETERIORATION_MODEL'],
        'deterioration-v3-deterministic',
      ),
      purpose: 'Predict patient deterioration risk from operational and clinical signals',
      owner: 'Quality and Safety',
      riskLevel: 'high',
      regulatoryCategory: 'clinical_decision_support',
      requiresHumanReview: true,
      maxTokens: 0,
      temperature: 0,
      rateLimit: { requestsPerMinute: 60, tokensPerMinute: 0 },
      safetyConstraints: [
        'Predictions are probabilistic - clinical judgment required',
        'False positives expected - do not act on predictions alone',
      ],
      fallbackEnabled: true,
      auditLevel: 'full',
      status: 'future',
    },
    dischargePrediction: {
      name: 'Discharge Prediction',
      provider: 'local',
      model: readFirst(env, ['AI_DISCHARGE_MODEL', 'DISCHARGE_MODEL'], 'heuristic-readiness-v1'),
      purpose: 'Predict discharge readiness and timing',
      owner: 'Patient Flow',
      riskLevel: 'medium',
      regulatoryCategory: 'clinical_decision_support',
      requiresHumanReview: true,
      maxTokens: 0,
      temperature: 0,
      rateLimit: { requestsPerMinute: 120, tokensPerMinute: 0 },
      safetyConstraints: [
        'Predictions are estimates - clinical judgment supersedes',
        'Do not discharge based solely on prediction',
      ],
      fallbackEnabled: false,
      auditLevel: 'basic',
      status: 'future',
    },
    admissionPrediction: {
      name: 'START-AI',
      provider: 'local',
      model: readFirst(env, ['AI_ADMISSION_MODEL', 'ADMISSION_MODEL'], 'start-ai-ensemble-v1'),
      purpose: 'Predict hospital admission before physician evaluation',
      owner: 'Patient Flow',
      riskLevel: 'medium',
      regulatoryCategory: 'clinical_decision_support',
      requiresHumanReview: true,
      maxTokens: 0,
      temperature: 0,
      rateLimit: { requestsPerMinute: 60, tokensPerMinute: 0 },
      safetyConstraints: [
        'Prediction is advisory only',
        'Bed coordination should be proactive but not definitive',
      ],
      fallbackEnabled: false,
      auditLevel: 'basic',
      status: 'future',
    },
    triageSupport: {
      name: 'AI Triage Assistant',
      provider: generationProvider,
      model: readFirst(env, ['AI_TRIAGE_MODEL', 'AI_MODEL'], generationModel),
      purpose: 'Assist nurse triage with acuity considerations for human review',
      owner: 'Emergency Nursing',
      riskLevel: 'high',
      regulatoryCategory: 'clinical_decision_support',
      requiresHumanReview: true,
      maxTokens: 1000,
      temperature: 0.1,
      rateLimit: { requestsPerMinute: 30, tokensPerMinute: 30000 },
      safetyConstraints: [
        'Nurse must verify all recommendations',
        'Cannot override nurse judgment',
        'CTAS 1-2 require immediate human confirmation',
      ],
      fallbackEnabled: true,
      auditLevel: 'full',
      status: 'legacy',
    },
    ambientDocumentation: {
      name: 'Ambient Clinical Documentation',
      provider: governanceProvider(
        normalizeProvider(env.AI_AMBIENT_DOCUMENTATION_PROVIDER || 'azure-openai'),
      ),
      model: readFirst(env, ['AI_AMBIENT_DOCUMENTATION_MODEL'], 'gpt-4o'),
      purpose: 'Generate draft SOAP notes from patient encounter audio',
      owner: 'Clinical Documentation Improvement',
      riskLevel: 'medium',
      regulatoryCategory: 'clinical_decision_support',
      requiresHumanReview: true,
      maxTokens: 4000,
      temperature: 0.3,
      rateLimit: { requestsPerMinute: 5, tokensPerMinute: 20000 },
      safetyConstraints: [
        'Generated notes require physician review and sign-off',
        'Cannot auto-populate EHR without verification',
      ],
      fallbackEnabled: true,
      auditLevel: 'full',
      status: 'legacy',
    },
    textMining: {
      name: 'Clinical Text Mining',
      provider: 'local',
      model: readFirst(env, ['AI_TEXT_MINING_MODEL'], 'local-entity-extraction-v1'),
      purpose: 'Extract patient characteristics from clinical notes',
      owner: 'Clinical Data Platform',
      riskLevel: 'low',
      regulatoryCategory: 'informational',
      requiresHumanReview: false,
      maxTokens: 512,
      temperature: 0,
      rateLimit: { requestsPerMinute: 300, tokensPerMinute: 150000 },
      safetyConstraints: ['Extracted entities require verification'],
      fallbackEnabled: false,
      auditLevel: 'basic',
      status: 'local-deterministic',
    },
    mohPatientMatching: {
      name: 'MoH Patient Matching',
      provider: 'local',
      model: readFirst(
        env,
        ['AI_PATIENT_MATCHING_MODEL', 'AI_EMBEDDING_MODEL', 'EMBEDDING_MODEL'],
        'local-deterministic-embedding',
      ),
      purpose: 'Match incoming patients to existing records using embeddings',
      owner: 'Registration and Privacy',
      riskLevel: 'high',
      regulatoryCategory: 'identity_resolution',
      requiresHumanReview: true,
      maxTokens: 8191,
      temperature: 0,
      rateLimit: { requestsPerMinute: 30, tokensPerMinute: 245000 },
      safetyConstraints: [
        'Matches are probabilistic - require staff verification',
        'No autonomous identity decisions',
      ],
      fallbackEnabled: true,
      auditLevel: 'full',
      status: 'future',
    },
    federatedEmsTriage: {
      name: 'Federated EMS Triage',
      provider: 'local',
      model: readFirst(env, ['AI_FEDERATED_EMS_MODEL'], 'fed-ems-edge-v1'),
      purpose: 'Coordinate EMS edge triage and federated local model aggregation',
      owner: 'EMS Operations',
      riskLevel: 'high',
      regulatoryCategory: 'clinical_decision_support',
      requiresHumanReview: true,
      maxTokens: 0,
      temperature: 0,
      rateLimit: { requestsPerMinute: 120, tokensPerMinute: 0 },
      safetyConstraints: [
        'EMS recommendations require dispatcher or clinician confirmation',
        'Federated updates do not expose patient-level source data',
      ],
      fallbackEnabled: true,
      auditLevel: 'basic',
      status: 'future',
    },
    edgeAmbulance: {
      name: 'Edge AI Ambulance',
      provider: 'local',
      model: readFirst(env, ['AI_EDGE_AMBULANCE_MODEL'], 'edge-ambulance-vitals-v1'),
      purpose: 'Analyze ambulance vital streams and ultrasound frame signals at the edge',
      owner: 'EMS Operations',
      riskLevel: 'high',
      regulatoryCategory: 'clinical_decision_support',
      requiresHumanReview: true,
      maxTokens: 0,
      temperature: 0,
      rateLimit: { requestsPerMinute: 120, tokensPerMinute: 0 },
      safetyConstraints: [
        'Pre-alert and stabilization suggestions require human EMS review',
        'Image and vital models are deterministic demo support in this build',
      ],
      fallbackEnabled: true,
      auditLevel: 'basic',
      status: 'future',
    },
  });
}

function getRuntimeEnv(): EnvSource {
  return typeof process !== 'undefined' && process.env ? process.env : {};
}

function readFirst(env: EnvSource, keys: string[], defaultValue = ''): string {
  for (const key of keys) {
    const value = String(env[key] || '').trim();
    if (value) return value;
  }
  return defaultValue;
}

function normalizeProvider(value: string): AIProvider {
  const normalized = String(value || '').trim().toLowerCase();
  if (
    normalized === 'openai' ||
    normalized === 'azure-openai' ||
    normalized === 'gemini' ||
    normalized === 'local'
  ) {
    return normalized;
  }
  if (normalized === 'azure_openai') return 'azure-openai';
  return 'anthropic';
}

function governanceProvider(provider: AIProvider): GovernanceAIProvider {
  return provider === 'azure-openai' ? 'azure_openai' : provider;
}

function readBoolean(value: string | undefined, fallback: boolean): boolean {
  const normalized = String(value || '').trim().toLowerCase();
  if (!normalized) return fallback;
  if (['true', '1', 'yes', 'on'].includes(normalized)) return true;
  if (['false', '0', 'no', 'off'].includes(normalized)) return false;
  return fallback;
}

function parseNumber(
  value: string | undefined,
  fallback: number,
  min = Number.NEGATIVE_INFINITY,
  max = Number.POSITIVE_INFINITY,
): number {
  const parsed = Number.parseFloat(value || '');
  if (!Number.isFinite(parsed)) return fallback;
  return Math.min(max, Math.max(min, parsed));
}

function parseInteger(
  value: string | undefined,
  fallback: number,
  min = Number.MIN_SAFE_INTEGER,
  max = Number.MAX_SAFE_INTEGER,
): number {
  const parsed = Number.parseInt(value || '', 10);
  if (!Number.isFinite(parsed)) return fallback;
  return Math.min(max, Math.max(min, parsed));
}
