export const HUMAN_REVIEW_DISCLAIMER =
  'Human review required. This is not a replacement for clinical judgment.';

export const EXTERNAL_DATA_REVIEW_DISCLAIMER =
  'External health record data requires clinician review before use.';

export const DISALLOWED_AUTONOMOUS_AI_ACTIONS = Object.freeze([
  'diagnose autonomously',
  'prescribe',
  'make disposition decisions',
  'replace clinical judgment',
  'auto-triage without human review',
  'auto-merge patients',
  'auto-import external health data',
  'make autonomous identity decisions',
]);

export const ACTIVE_EMERGENCY_OS_AI_SCOPE = Object.freeze([
  'answering operational questions',
  'summarizing patient flow',
  'summarizing external/provincial data with review disclaimer',
  'launching clinical workflows',
  'explaining calculator outputs',
  'summarizing referrals',
  'helping with Smart Intake verification',
  'identifying bottlenecks',
  'showing queue/capacity/boarding/EMS status',
]);

const unsafePatterns = [
  /\bdiagnose\b/i,
  /\bprescribe\b/i,
  /\bdischarge\b.*\bnow\b/i,
  /\badmit\b.*\bwithout\b.*\breview\b/i,
  /\btriage\b.*\bautomatically\b/i,
  /\bmerge\b.*\bpatients?\b/i,
  /\bimport\b.*\bexternal\b.*\bwithout\b.*\breview\b/i,
];

export interface AISafetyReview {
  allowed: boolean;
  requiresHumanReview: boolean;
  reasons: string[];
  disclaimer: string;
}

export function reviewAIRequestForSafety(input: {
  prompt: string;
  patientSpecific?: boolean;
  externalData?: boolean;
}): AISafetyReview {
  const reasons = unsafePatterns
    .filter((pattern) => pattern.test(input.prompt))
    .map((pattern) => `matched unsafe autonomous action pattern: ${pattern.source}`);

  return {
    allowed: reasons.length === 0,
    requiresHumanReview: input.patientSpecific === true || reasons.length > 0,
    reasons,
    disclaimer: input.externalData ? EXTERNAL_DATA_REVIEW_DISCLAIMER : HUMAN_REVIEW_DISCLAIMER,
  };
}

export function appendRequiredDisclaimer(text: string, input: { externalData?: boolean } = {}): string {
  const disclaimer = input.externalData ? EXTERNAL_DATA_REVIEW_DISCLAIMER : HUMAN_REVIEW_DISCLAIMER;
  return text.includes(disclaimer) ? text : `${text}\n\n${disclaimer}`;
}
