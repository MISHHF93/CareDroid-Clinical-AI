import { HUMAN_REVIEW_DISCLAIMER } from '../lib/ai/safety/policy';

export const SAFETY_BOUNDED_ASSISTANT_LABEL = 'Safety-bounded assistant';

export const COPILOT_SAFETY_BOUNDED_DISCLAIMER =
  `${SAFETY_BOUNDED_ASSISTANT_LABEL} — ${HUMAN_REVIEW_DISCLAIMER}`;

export const PATIENT_STATUS_SUMMARY_PROMPT =
  "Summarize this patient's current status based on the provided data.";

export const PATIENT_COPILOT_QUICK_ACTIONS = Object.freeze([
  PATIENT_STATUS_SUMMARY_PROMPT,
  'Recommend clinical tools for this case',
  'What reassessment or escalation signals should I review?',
] as const);