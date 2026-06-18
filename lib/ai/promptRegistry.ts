import type { AIRequestType } from './types';
import { HUMAN_REVIEW_DISCLAIMER } from './safetyPolicy';

export type AIPromptId =
  | 'ed-copilot'
  | 'smart-intake-assistant'
  | 'triage-assistant'
  | 'clinical-workflow-launcher'
  | 'referral-summarizer'
  | 'analytics-assistant'
  | 'calculator-helper';

export interface AIPromptDefinition {
  id: AIPromptId;
  requestType: AIRequestType;
  productRole: string;
  prompt: string;
  requiredDisclaimer: string;
}

export const AI_PROMPT_REGISTRY: Record<AIPromptId, AIPromptDefinition> = Object.freeze({
  'ed-copilot': {
    id: 'ed-copilot',
    requestType: 'COPILOT_CHAT',
    productRole: 'ED Copilot = operational assistant',
    requiredDisclaimer: HUMAN_REVIEW_DISCLAIMER,
    prompt:
      'You are the ED Copilot for CareDroid Emergency OS. Answer operational questions about patient flow, capacity, EMS, queues, boarding, reassessment, referrals, and workflow launch options. Be concise, explicit about uncertainty, and never make autonomous clinical decisions.',
  },
  'smart-intake-assistant': {
    id: 'smart-intake-assistant',
    requestType: 'INTAKE_SUGGESTION',
    productRole: 'Smart Intake Assistant = extraction and verification helper',
    requiredDisclaimer: HUMAN_REVIEW_DISCLAIMER,
    prompt:
      'Help staff verify intake information, identify missing fields, and suggest next verification steps. Do not auto-merge identities, auto-import outside records, or make triage decisions without human review.',
  },
  'triage-assistant': {
    id: 'triage-assistant',
    requestType: 'TRIAGE_ASSIST',
    productRole: 'AI Triage Assistant = CTAS suggestion helper for nurse review',
    requiredDisclaimer: HUMAN_REVIEW_DISCLAIMER,
    prompt:
      'Suggest CTAS priority, waiting queue placement, and reassessment flags for triage nurse review. Provide concise rationale bullets. Never auto-triage, auto-route, or make disposition decisions — staff must confirm every action.',
  },
  'clinical-workflow-launcher': {
    id: 'clinical-workflow-launcher',
    requestType: 'PROTOCOL_SUGGEST',
    productRole: 'Clinical Workflow Assistant = launches workflows and calculators',
    requiredDisclaimer: HUMAN_REVIEW_DISCLAIMER,
    prompt:
      'Suggest relevant Emergency OS workflows, calculators, and checklists for human review. Do not diagnose, prescribe, or decide disposition.',
  },
  'referral-summarizer': {
    id: 'referral-summarizer',
    requestType: 'CLINICAL_SUMMARY',
    productRole: 'Referral Assistant = summarizes referral context',
    requiredDisclaimer: HUMAN_REVIEW_DISCLAIMER,
    prompt:
      'Summarize referral context, pending questions, destination service, urgency, and missing information for staff review.',
  },
  'analytics-assistant': {
    id: 'analytics-assistant',
    requestType: 'SHIFT_SUMMARY',
    productRole: 'Analytics Assistant = explains operational metrics',
    requiredDisclaimer: HUMAN_REVIEW_DISCLAIMER,
    prompt:
      'Explain operational metrics such as capacity, queue pressure, EMS load, boarding, referrals, reassessment, and shift trends. Do not make autonomous staffing or transfer decisions.',
  },
  'calculator-helper': {
    id: 'calculator-helper',
    requestType: 'SCORE_ASSIST',
    productRole: 'Clinical Workflow Assistant = explains calculator outputs',
    requiredDisclaimer: HUMAN_REVIEW_DISCLAIMER,
    prompt:
      'Explain calculator inputs, missing values, score bands, and limitations for human review. Never invent values or use the score as an autonomous decision.',
  },
});

export function getAIPrompt(id: AIPromptId): AIPromptDefinition {
  return AI_PROMPT_REGISTRY[id];
}

export function promptForRequestType(requestType: AIRequestType): AIPromptDefinition {
  return (
    Object.values(AI_PROMPT_REGISTRY).find((definition) => definition.requestType === requestType) ||
    AI_PROMPT_REGISTRY['ed-copilot']
  );
}
