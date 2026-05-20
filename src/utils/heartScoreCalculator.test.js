import { describe, it, expect } from 'vitest';
import {
  HEART_SCORE_DISCLAIMER,
  HEART_DIMENSIONS_META,
  calculateHeartScore,
  validateHeartScoreInputs,
  heartRiskCategoryFromScore,
  interpretHeartScore,
} from './heartScoreCalculator';

const maxInputs = Object.fromEntries(HEART_DIMENSIONS_META.map((d) => [d.key, 2]));
const minInputs = Object.fromEntries(HEART_DIMENSIONS_META.map((d) => [d.key, 0]));

describe('heartScoreCalculator', () => {
  it('sums five dimensions (0–10)', () => {
    expect(calculateHeartScore(minInputs)).toBe(0);
    expect(calculateHeartScore(maxInputs)).toBe(10);
    expect(
      calculateHeartScore({
        history: 1,
        ecg: 0,
        age: 2,
        riskFactors: 1,
        troponin: 0,
      })
    ).toBe(4);
  });

  it('returns null when any dimension is out of range', () => {
    expect(calculateHeartScore({ ...minInputs, troponin: 3 })).toBeNull();
    expect(calculateHeartScore({ ...minInputs, history: NaN })).toBeNull();
  });

  it('validateHeartScoreInputs requires 0–2 per dimension', () => {
    expect(validateHeartScoreInputs(minInputs).valid).toBe(true);
    const bad = validateHeartScoreInputs({ ...minInputs, ecg: 9 });
    expect(bad.valid).toBe(false);
    expect(bad.errors.some((e) => /ECG/i.test(e))).toBe(true);
  });

  it.each([
    { score: 0, category: 'low' },
    { score: 3, category: 'low' },
    { score: 4, category: 'intermediate' },
    { score: 6, category: 'intermediate' },
    { score: 7, category: 'high' },
    { score: 10, category: 'high' },
  ])('heartRiskCategoryFromScore($score) is $category', ({ score, category }) => {
    expect(heartRiskCategoryFromScore(score)).toBe(category);
    expect(interpretHeartScore(score)?.riskCategory).toBe(category);
  });

  it('maps severity bands to risk category', () => {
    expect(interpretHeartScore(10)?.severity).toBe('critical');
    expect(interpretHeartScore(5)?.severity).toBe('warning');
    expect(interpretHeartScore(2)?.severity).toBe('normal');
  });

  it('includes required safety disclaimer and reference', () => {
    const interp = interpretHeartScore(7);
    expect(interp?.disclaimer).toBe(HEART_SCORE_DISCLAIMER);
    expect(interp?.disclaimer).toMatch(/decision support only/i);
    expect(interp?.disclaimer).toMatch(/recommend treatment/i);
    expect(interp?.referenceLine).toMatch(/Six AJ/i);
  });

  it('interpretation avoids treatment or disposition directives', () => {
    for (const score of [2, 5, 9]) {
      const interpretation = interpretHeartScore(score)?.interpretation || '';
      expect(interpretation).not.toMatch(/\b(start|stop|give|prescribe|administer)\b/i);
      expect(interpretation).not.toMatch(/cardiology review|observation time|invasive strategy|anticoagul/i);
    }
  });

  it('returns null for invalid totals', () => {
    expect(interpretHeartScore(-1)).toBeNull();
    expect(interpretHeartScore(11)).toBeNull();
    expect(heartRiskCategoryFromScore(12)).toBeNull();
  });
});
