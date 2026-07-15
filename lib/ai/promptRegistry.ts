import type { AIRequestType } from './types';
import { HUMAN_REVIEW_DISCLAIMER } from './safetyPolicy';

export type AIPromptId =
  | 'ed-copilot'
  | 'patient-status-summarizer'
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
  /** Bump when `prompt` changes so audit trails can distinguish which prompt version produced a given response. */
  promptVersion: string;
}

export const AI_PROMPT_REGISTRY: Record<AIPromptId, AIPromptDefinition> = Object.freeze({
  'ed-copilot': {
    id: 'ed-copilot',
    requestType: 'COPILOT_CHAT',
    productRole: 'ED Copilot = operational assistant',
    requiredDisclaimer: HUMAN_REVIEW_DISCLAIMER,
    promptVersion: '1.0.0',
    prompt:
      'You are the CareDroid Copilot — an embedded workflow assistant inside the CareDroid emergency department platform. Answer operational questions using the prioritized recommendation list in context. Lead with queue, capacity, boarding, and reassessment actions that include counts, queue names, and routes. Be concise, cite live board data, and never give generic advice like "monitor closely" or "review when possible". Never make autonomous clinical decisions, prescribe, or decide disposition.',
  },
  'patient-status-summarizer': {
    id: 'patient-status-summarizer',
    requestType: 'CLINICAL_SUMMARY',
    productRole: 'Case-aware Copilot = summarizes selected patient context for staff review',
    requiredDisclaimer: HUMAN_REVIEW_DISCLAIMER,
    promptVersion: '1.0.0',
    prompt:
      "Summarize the selected patient's current status using only the provided demographics, chief complaint, vitals, flags, recent notes, and pathway context. Lead with acuity, location/state, outstanding risks, and what staff should verify next. Never diagnose, prescribe, or recommend disposition autonomously.",
  },
  'smart-intake-assistant': {
    id: 'smart-intake-assistant',
    requestType: 'INTAKE_SUGGESTION',
    productRole: 'Smart Intake Assistant = extraction and verification helper',
    requiredDisclaimer: HUMAN_REVIEW_DISCLAIMER,
    promptVersion: '1.0.0',
    prompt:
      'Help staff verify intake information, identify missing fields, and suggest next verification steps. Do not auto-merge identities, auto-import outside records, or make triage decisions without human review.',
  },
  'triage-assistant': {
    id: 'triage-assistant',
    requestType: 'TRIAGE_ASSIST',
    productRole: 'AI Triage Assistant = CTAS suggestion helper for nurse review',
    requiredDisclaimer: HUMAN_REVIEW_DISCLAIMER,
    promptVersion: '1.0.0',
    prompt:
      'Suggest CTAS priority, waiting queue placement, and reassessment flags for triage nurse review. Provide concise rationale bullets. Never auto-triage, auto-route, or make disposition decisions — staff must confirm every action.',
  },
  'clinical-workflow-launcher': {
    id: 'clinical-workflow-launcher',
    requestType: 'PROTOCOL_SUGGEST',
    productRole: 'Clinical Workflow Assistant = launches workflows and calculators',
    requiredDisclaimer: HUMAN_REVIEW_DISCLAIMER,
    promptVersion: '1.0.0',
    prompt:
      'Suggest relevant CareDroid workflows, calculators, and checklists for human review. Do not diagnose, prescribe, or decide disposition.',
  },
  'referral-summarizer': {
    id: 'referral-summarizer',
    requestType: 'CLINICAL_SUMMARY',
    productRole: 'Referral Assistant = summarizes referral context',
    requiredDisclaimer: HUMAN_REVIEW_DISCLAIMER,
    promptVersion: '1.0.0',
    prompt:
      'Summarize referral context, pending questions, destination service, urgency, and missing information for staff review.',
  },
  'analytics-assistant': {
    id: 'analytics-assistant',
    requestType: 'SHIFT_SUMMARY',
    productRole: 'Analytics Assistant = explains operational metrics',
    requiredDisclaimer: HUMAN_REVIEW_DISCLAIMER,
    promptVersion: '1.0.0',
    prompt:
      'Explain operational metrics such as capacity, queue pressure, EMS load, boarding, referrals, reassessment, and shift trends. Do not make autonomous staffing or transfer decisions.',
  },
  'calculator-helper': {
    id: 'calculator-helper',
    requestType: 'SCORE_ASSIST',
    productRole: 'Clinical Workflow Assistant = explains calculator outputs',
    requiredDisclaimer: HUMAN_REVIEW_DISCLAIMER,
    promptVersion: '1.0.0',
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
