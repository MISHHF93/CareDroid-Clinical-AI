import type { Priority } from '../../src/types/emergency';

export type TriageAssistConfidence = 'high' | 'medium' | 'low';

export type TriageAssistSource = 'rules' | 'rules+llm' | 'rules+oi';

export interface TriageAssistOperationalContext {
  triageQueueCount?: number;
  waitingQueueCount?: number;
  emsInboundCount?: number;
  capacityBand?: string;
  queuePressure?: 'low' | 'medium' | 'high';
}

export interface TriageAssistLlmEnrichment {
  summary?: string;
  reassessmentFlags?: string[];
  additionalRationale?: string[];
}

export interface TriageAssistEnvelope {
  suggestedPriority: Priority;
  suggestedQueue: string;
  rationale: string[];
  confidence: TriageAssistConfidence;
  ruleTriggered: string;
  disclaimers: string[];
  requiresHumanReview: true;
  generatedAt: string;
  source: TriageAssistSource;
  llmEnrichment?: TriageAssistLlmEnrichment | null;
  operationalContext?: TriageAssistOperationalContext;
  dismissedAt?: string | null;
  acceptedAt?: string | null;
}

export interface TriageAssistPatientInput {
  complaintCategory?: string;
  complaintText?: string;
  chiefComplaint?: string;
  priority?: Priority | string;
  vitals?: Record<string, unknown>;
  source?: string;
  arrivalReason?: string;
}

export interface TriageAssistBuildContext {
  operationalContext?: TriageAssistOperationalContext;
  handoffContext?: Record<string, unknown>;
  overridePriority?: Priority | null;
}
