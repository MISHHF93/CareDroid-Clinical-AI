import { describe, expect, it } from 'vitest';
import {
  fieldDecisionTone,
  isVerificationComplete,
  mapFieldReviewDecision,
  verificationStepFromQuery,
} from './verificationWorkflow';

describe('verificationWorkflow', () => {
  it('maps staff review decisions to field statuses', () => {
    expect(mapFieldReviewDecision('approved')).toBe('verified');
    expect(mapFieldReviewDecision('edited')).toBe('overridden');
    expect(mapFieldReviewDecision('rejected')).toBe('missing');
    expect(fieldDecisionTone('verified')).toBe('verified');
  });

  it('requires all fields verified or overridden', () => {
    expect(
      isVerificationComplete({
        firstName: 'verified',
        lastName: 'overridden',
      }),
    ).toBe(true);
    expect(
      isVerificationComplete({
        firstName: 'verified',
        lastName: 'conflicting',
      }),
    ).toBe(false);
  });

  it('resolves query step aliases', () => {
    expect(verificationStepFromQuery('verify')).toBe(4);
    expect(verificationStepFromQuery('ocr')).toBe(2);
    expect(verificationStepFromQuery()).toBe(0);
  });
});
