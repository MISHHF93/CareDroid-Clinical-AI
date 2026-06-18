export const VERIFICATION_STEP_QUERY_INDEX = Object.freeze({
  capture: 1,
  ocr: 2,
  match: 3,
  verify: 4,
  finalize: 5,
});

export const VERIFICATION_STEPS = Object.freeze([
  'Start Intake',
  'Capture Inputs',
  'Review OCR',
  'Match Patient',
  'Verify Fields',
  'Finalize Intake',
]);

export type FieldDecisionStatus =
  | 'verified'
  | 'unverified'
  | 'conflicting'
  | 'missing'
  | 'overridden';

export type FieldReviewDecision = 'approved' | 'edited' | 'rejected';

export const FIELD_STATUS_LABEL: Record<FieldDecisionStatus, string> = {
  verified: 'Verified',
  unverified: 'Unverified',
  conflicting: 'Conflict',
  missing: 'Missing',
  overridden: 'Staff override',
};

export function fieldDecisionTone(status: string): FieldDecisionStatus {
  if (status === 'verified') return 'verified';
  if (status === 'conflicting') return 'conflicting';
  if (status === 'missing') return 'missing';
  if (status === 'overridden') return 'overridden';
  return 'unverified';
}

export function mapFieldReviewDecision(decision: FieldReviewDecision): FieldDecisionStatus {
  if (decision === 'edited') return 'overridden';
  if (decision === 'approved') return 'verified';
  return 'missing';
}

export function isVerificationComplete(decisions: Record<string, string>): boolean {
  return Object.values(decisions).every((status) => ['verified', 'overridden'].includes(status));
}

export function verificationStepFromQuery(step?: string | null): number {
  if (!step) return 0;
  const index = VERIFICATION_STEP_QUERY_INDEX[step as keyof typeof VERIFICATION_STEP_QUERY_INDEX];
  return index ?? 0;
}
