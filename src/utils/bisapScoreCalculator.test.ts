import { describe, it, expect } from 'vitest';
import {
  BISAP_SAFETY_DISCLAIMER,
  BISAP_CRITERIA_META,
  bisapRiskCategoryFromScore,
  calculateBisapScore,
  interpretBisapScore,
  validateBisapInputs,
} from './bisapScoreCalculator';

describe('bisapScoreCalculator', () => {
  it('scores 0 when no criteria present', () => {
    expect(calculateBisapScore({})).toBe(0);
    expect(interpretBisapScore(0)?.riskCategory).toBe('low');
  });

  it('scores maximum 5 when all criteria present', () => {
    const allTrue = Object.fromEntries(BISAP_CRITERIA_META.map((r) => [r.key, true]));
    expect(calculateBisapScore(allTrue)).toBe(5);
    expect(interpretBisapScore(5)?.riskCategory).toBe('high');
    expect(interpretBisapScore(5)?.severity).toBe('critical');
  });

  it.each([
    { score: 2, category: 'low' },
    { score: 3, category: 'moderate' },
    { score: 4, category: 'high' },
  ])('bisapRiskCategoryFromScore($score) is $category', ({ score, category }) => {
    expect(bisapRiskCategoryFromScore(score)).toBe(category);
    expect(interpretBisapScore(score)?.riskCategory).toBe(category);
  });

  it('validateBisapInputs rejects non-boolean criterion values', () => {
    expect(validateBisapInputs({ bunOver25: true }).valid).toBe(true);
    const bad = validateBisapInputs({ bunOver25: 'yes' });
    expect(bad.valid).toBe(false);
    expect(bad.errors[0]).toMatch(/BUN/i);
    expect(calculateBisapScore({ bunOver25: 'yes' })).toBeNull();
  });

  it('includes mortality context and safety disclaimer', () => {
    const interp = interpretBisapScore(3);
    expect(interp?.disclaimer).toBe(BISAP_SAFETY_DISCLAIMER);
    expect(interp?.mortalityContext).toMatch(/mortality/i);
    expect(interp?.interpretation).not.toMatch(/\bimplement\b/i);
    expect(BISAP_CRITERIA_META.find((r) => r.key === 'bunOver25')?.help).toMatch(/mg\/dL/i);
  });

  it('returns null for out-of-range scores', () => {
    expect(interpretBisapScore(6)).toBeNull();
  });
});
