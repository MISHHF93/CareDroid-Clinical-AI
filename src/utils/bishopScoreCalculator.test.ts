import { describe, it, expect } from 'vitest';
import {
  BISHOP_OBSTETRIC_DISCLAIMER,
  bishopRiskCategoryFromScore,
  calculateBishopScore,
  interpretBishopScore,
  validateBishopInputs,
} from './bishopScoreCalculator';

const favourableInputs = {
  dilation: 3,
  effacement: 3,
  station: 3,
  consistency: 2,
  position: 2,
};

describe('bishopScoreCalculator', () => {
  it('scores maximum 13 for favourable exam', () => {
    expect(calculateBishopScore(favourableInputs)).toBe(13);
    expect(interpretBishopScore(13)?.riskCategory).toBe('favourable');
    expect(interpretBishopScore(13)?.favourability).toBeTruthy();
  });

  it.each([
    { score: 8, category: 'favourable' },
    { score: 7, category: 'intermediate' },
    { score: 4, category: 'unfavourable' },
  ])('bishopRiskCategoryFromScore($score) is $category', ({ score, category }) => {
    expect(bishopRiskCategoryFromScore(score)).toBe(category);
    expect(interpretBishopScore(score)?.riskCategory).toBe(category);
  });

  it('validateBishopInputs rejects invalid dimension values', () => {
    expect(validateBishopInputs(favourableInputs).valid).toBe(true);
    const bad = validateBishopInputs({ ...favourableInputs, dilation: 9 });
    expect(bad.valid).toBe(false);
    expect(calculateBishopScore({ ...favourableInputs, dilation: 9 })).toBeNull();
  });

  it('includes obstetric disclaimer and avoids treatment recommendations', () => {
    const interp = interpretBishopScore(4);
    expect(interp?.disclaimer).toBe(BISHOP_OBSTETRIC_DISCLAIMER);
    expect(interp?.disclaimer).toMatch(/does not recommend/i);
    expect(interp?.interpretation).not.toMatch(/\bdiscuss\b.*\bripening\b/i);
    expect(interp?.interpretation).not.toMatch(/\bprescribe\b/i);
  });

  it('returns null for out-of-range scores', () => {
    expect(interpretBishopScore(14)).toBeNull();
  });
});
