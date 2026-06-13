import {
  DEFAULT_AI_PROVIDER_CONFIG,
  type AIProvider,
} from '../lib/ai/config';

export interface AIServiceConfig {
  name: string;
  provider: AIProvider | 'aws_bedrock' | 'azure_openai';
  model: string;
  purpose: string;
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
}

export const AIConfigRegistry: Record<string, AIServiceConfig> = Object.freeze({
  copilot: {
    name: 'ED Copilot',
    provider: DEFAULT_AI_PROVIDER_CONFIG.provider,
    model: DEFAULT_AI_PROVIDER_CONFIG.model,
    purpose: 'Operational assistant for ED workflow',
    requiresHumanReview: true,
    maxTokens: DEFAULT_AI_PROVIDER_CONFIG.maxTokens,
    temperature: DEFAULT_AI_PROVIDER_CONFIG.temperature,
    rateLimit: { requestsPerMinute: 30, tokensPerMinute: 60000 },
    safetyConstraints: [
      'Cannot make autonomous clinical recommendations',
      'Cannot override human judgment',
      'Cannot lower priority for DPS 1-2 patients',
      'Must include "Human review required" disclaimer',
    ],
    fallbackEnabled: true,
    auditLevel: 'full',
  },
  smartHandover: {
    name: 'Smart Handover',
    provider: DEFAULT_AI_PROVIDER_CONFIG.provider,
    model: DEFAULT_AI_PROVIDER_CONFIG.model,
    purpose: 'Generate draft clinical handover summaries',
    requiresHumanReview: true,
    maxTokens: 4000,
    temperature: 0.2,
    rateLimit: { requestsPerMinute: 10, tokensPerMinute: 40000 },
    safetyConstraints: ['Must be reviewed by receiving clinician', 'Cannot replace verbal handoff'],
    fallbackEnabled: true,
    auditLevel: 'full',
  },
  protocolTrigger: {
    name: 'Protocol Auto-Trigger',
    provider: 'local',
    model: 'rule-based',
    purpose: 'Detect clinical deterioration and trigger appropriate protocols',
    requiresHumanReview: false,
    maxTokens: 0,
    temperature: 0,
    rateLimit: { requestsPerMinute: 600, tokensPerMinute: 0 },
    safetyConstraints: ['Rules are clinically validated', 'Overrides require clinician acknowledgment'],
    fallbackEnabled: false,
    auditLevel: 'full',
  },
  deteriorationPrediction: {
    name: 'Deterioration Prediction',
    provider: 'local',
    model: 'xgboost-custom',
    purpose: 'Predict patient deterioration risk',
    requiresHumanReview: true,
    maxTokens: 0,
    temperature: 0,
    rateLimit: { requestsPerMinute: 60, tokensPerMinute: 0 },
    safetyConstraints: ['Predictions are probabilistic', 'Do not act on predictions alone'],
    fallbackEnabled: true,
    auditLevel: 'full',
  },
  dischargePrediction: {
    name: 'Discharge Prediction',
    provider: 'local',
    model: 'heuristic-readiness',
    purpose: 'Predict discharge readiness and timing',
    requiresHumanReview: true,
    maxTokens: 0,
    temperature: 0,
    rateLimit: { requestsPerMinute: 120, tokensPerMinute: 0 },
    safetyConstraints: ['Do not discharge based solely on prediction'],
    fallbackEnabled: false,
    auditLevel: 'basic',
  },
  admissionPrediction: {
    name: 'START-AI',
    provider: 'local',
    model: 'ensemble-xgboost',
    purpose: 'Predict hospital admission before physician evaluation',
    requiresHumanReview: true,
    maxTokens: 0,
    temperature: 0,
    rateLimit: { requestsPerMinute: 60, tokensPerMinute: 0 },
    safetyConstraints: ['Prediction is advisory only'],
    fallbackEnabled: false,
    auditLevel: 'basic',
  },
  triageSupport: {
    name: 'AI Triage Assistant',
    provider: DEFAULT_AI_PROVIDER_CONFIG.provider,
    model: DEFAULT_AI_PROVIDER_CONFIG.model,
    purpose: 'Assist nurse triage with acuity considerations',
    requiresHumanReview: true,
    maxTokens: 1000,
    temperature: 0.1,
    rateLimit: { requestsPerMinute: 30, tokensPerMinute: 30000 },
    safetyConstraints: ['Nurse must verify all recommendations', 'Cannot override nurse judgment'],
    fallbackEnabled: true,
    auditLevel: 'full',
  },
  ambientDocumentation: {
    name: 'Ambient Clinical Documentation',
    provider: 'azure_openai',
    model: 'gpt-4o',
    purpose: 'Generate draft SOAP notes from encounter audio',
    requiresHumanReview: true,
    maxTokens: 4000,
    temperature: 0.3,
    rateLimit: { requestsPerMinute: 5, tokensPerMinute: 20000 },
    safetyConstraints: ['Generated notes require physician review and sign-off'],
    fallbackEnabled: true,
    auditLevel: 'full',
  },
  textMining: {
    name: 'Clinical Text Mining',
    provider: 'local',
    model: 'local-entity-extraction',
    purpose: 'Extract patient characteristics from clinical notes',
    requiresHumanReview: false,
    maxTokens: 512,
    temperature: 0,
    rateLimit: { requestsPerMinute: 300, tokensPerMinute: 150000 },
    safetyConstraints: ['Extracted entities require verification'],
    fallbackEnabled: false,
    auditLevel: 'basic',
  },
  mohPatientMatching: {
    name: 'MoH Patient Matching',
    provider: 'local',
    model: 'local-deterministic-embedding',
    purpose: 'Match incoming patients to existing records using embeddings',
    requiresHumanReview: true,
    maxTokens: 8191,
    temperature: 0,
    rateLimit: { requestsPerMinute: 30, tokensPerMinute: 245000 },
    safetyConstraints: ['Matches are probabilistic', 'No autonomous identity decisions'],
    fallbackEnabled: true,
    auditLevel: 'full',
  },
});

export const AISafetyRules = Object.freeze({
  cannotLowerPriorityFor: {
    dpsScores: [1, 2],
    conditions: ['stroke', 'sepsis', 'chest_pain'],
    abnormalVitals: ['hr > 120', 'bp < 90/60', 'o2 < 92', 'rr > 24'],
  },
  requiredDisclaimers: [
    'Human review required',
    'Not a replacement for clinical judgment',
    'AI-generated content - verify before acting',
  ],
  rateLimits: {
    physician: { requestsPerMinute: 60 },
    nurse: { requestsPerMinute: 30 },
    charge_nurse: { requestsPerMinute: 45 },
    clerk: { requestsPerMinute: 10 },
    ems: { requestsPerMinute: 20 },
  },
});
