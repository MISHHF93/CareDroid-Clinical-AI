/**
 * AI Governance Registry
 * Centralized enterprise inventory for all AI services in CareDroid Emergency OS.
 */

export interface AIServiceConfig {
  name: string;
  provider: 'openai' | 'anthropic' | 'aws_bedrock' | 'azure_openai' | 'local';
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

export interface AIPromptTemplate {
  id: string;
  name: string;
  version: string;
  template: string;
  variables: string[];
  validationRules: string[];
  lastValidated: Date;
}

export const AIConfigRegistry: Record<string, AIServiceConfig> = {
  copilot: {
    name: 'ED Copilot',
    provider: 'anthropic',
    model: process.env.AI_MODEL || 'claude-3-5-sonnet-20241022',
    purpose: 'Operational assistant for ED workflow - answers queries about wait times, reassessments, bottlenecks, capacity, EMS, boarding, and queues',
    requiresHumanReview: true,
    maxTokens: Number(process.env.AI_MAX_TOKENS || 2000),
    temperature: Number(process.env.AI_TEMPERATURE || 0.3),
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
    provider: 'anthropic',
    model: process.env.AI_MODEL || 'claude-3-5-sonnet-20241022',
    purpose: 'Generate clinical handover summaries from patient data',
    requiresHumanReview: true,
    maxTokens: 4000,
    temperature: 0.2,
    rateLimit: { requestsPerMinute: 10, tokensPerMinute: 40000 },
    safetyConstraints: ['Must be reviewed by receiving clinician', 'Cannot replace verbal handoff', 'Must include disclaimer about AI generation'],
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
    purpose: 'Predict patient deterioration risk from operational and clinical signals',
    requiresHumanReview: true,
    maxTokens: 0,
    temperature: 0,
    rateLimit: { requestsPerMinute: 60, tokensPerMinute: 0 },
    safetyConstraints: ['Predictions are probabilistic - clinical judgment required', 'False positives expected - do not act on predictions alone'],
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
    safetyConstraints: ['Predictions are estimates - clinical judgment supersedes', 'Do not discharge based solely on prediction'],
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
    safetyConstraints: ['Prediction is advisory only', 'Bed coordination should be proactive but not definitive'],
    fallbackEnabled: false,
    auditLevel: 'basic',
  },
  triageSupport: {
    name: 'AI Triage Assistant',
    provider: 'anthropic',
    model: process.env.AI_MODEL || 'claude-3-5-sonnet-20241022',
    purpose: 'Assist nurse triage with acuity considerations for human review',
    requiresHumanReview: true,
    maxTokens: 1000,
    temperature: 0.1,
    rateLimit: { requestsPerMinute: 30, tokensPerMinute: 30000 },
    safetyConstraints: ['Nurse must verify all recommendations', 'Cannot override nurse judgment', 'CTAS 1-2 require immediate human confirmation'],
    fallbackEnabled: true,
    auditLevel: 'full',
  },
  ambientDocumentation: {
    name: 'Ambient Clinical Documentation',
    provider: 'azure_openai',
    model: 'gpt-4o',
    purpose: 'Generate draft SOAP notes from patient encounter audio',
    requiresHumanReview: true,
    maxTokens: 4000,
    temperature: 0.3,
    rateLimit: { requestsPerMinute: 5, tokensPerMinute: 20000 },
    safetyConstraints: ['Generated notes require physician review and sign-off', 'Cannot auto-populate EHR without verification'],
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
    safetyConstraints: ['Matches are probabilistic - require staff verification', 'No autonomous identity decisions'],
    fallbackEnabled: true,
    auditLevel: 'full',
  },
};

export const PromptTemplateRegistry: Record<string, AIPromptTemplate> = {
  copilot_query: {
    id: 'copilot_query_v1',
    name: 'ED Copilot - Query Response',
    version: '1.0.0',
    template: `You are ED Copilot, an operational assistant for emergency department staff.

Current ED state:
- Patients waiting: {{waitingCount}}
- Longest wait: {{longestWaitMinutes}} minutes
- EMS inbound: {{emsInboundCount}}
- Bottleneck: {{bottleneck}}
- Capacity status: {{capacityColor}}

User query: {{query}}
User role: {{userRole}}

Respond helpfully with operational information only. Do not make clinical recommendations.
Include "Human review required" in your response.`,
    variables: ['waitingCount', 'longestWaitMinutes', 'emsInboundCount', 'bottleneck', 'capacityColor', 'query', 'userRole'],
    validationRules: ['No clinical advice', 'Must include disclaimer'],
    lastValidated: new Date('2026-06-12'),
  },
  handover_summary: {
    id: 'handover_summary_v1',
    name: 'Smart Handover - Clinical Summary',
    version: '1.0.0',
    template: `Generate a clinical handover summary using SBAR format for the following patient:

Demographics: Name {{name}}, Age {{age}}, MRN {{mrn}}
Presenting Complaint: {{chiefComplaint}}
History of Present Illness: {{hpi}}
Vitals: {{vitals}}
Relevant Labs: {{labs}}
Imaging: {{imaging}}
Active Medications: {{medications}}
Allergies: {{allergies}}
Pending Tasks: {{pendingTasks}}

Format: Situation - Background - Assessment - Recommendation.
Include key action items and safety concerns.
This is AI-generated and requires human review.`,
    variables: ['name', 'age', 'mrn', 'chiefComplaint', 'hpi', 'vitals', 'labs', 'imaging', 'medications', 'allergies', 'pendingTasks'],
    validationRules: ['Must use SBAR format', 'Must include disclaimer'],
    lastValidated: new Date('2026-06-12'),
  },
  ambient_soap: {
    id: 'ambient_soap_v1',
    name: 'Ambient Documentation - SOAP Note',
    version: '1.0.0',
    template: `Convert the following patient encounter transcript into a SOAP note.

Transcript: {{transcript}}
Encounter Type: {{encounterType}}

Format as:
SUBJECTIVE: (patient's words, history)
OBJECTIVE: (vitals, exam findings)
ASSESSMENT: (differential diagnosis)
PLAN: (treatment plan, orders)

This is AI-generated and requires clinician review and sign-off.`,
    variables: ['transcript', 'encounterType'],
    validationRules: ['Must include all SOAP sections', 'Must include disclaimer'],
    lastValidated: new Date('2026-06-12'),
  },
};

export const AISafetyRules = {
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
  auditRequirements: {
    logAllInteractions: true,
    storeInputsOutputs: true,
    retentionDays: 2555,
    requireUserConsent: true,
  },
  rateLimits: {
    physician: { requestsPerMinute: 60 },
    nurse: { requestsPerMinute: 30 },
    charge_nurse: { requestsPerMinute: 45 },
    clerk: { requestsPerMinute: 10 },
    ems: { requestsPerMinute: 20 },
  },
};
