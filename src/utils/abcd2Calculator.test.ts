import { describe, it, expect } from 'vitest';
import {
  ABCD2_STROKE_DISCLAIMER,
  calculateAbcd2Score,
  validateAbcd2Inputs,
  abcd2RiskCategoryFromScore,
  interpretAbcd2Score,
  isAbcd2BloodPressureElevated,
} from './abcd2Calculator';

const baseInputs = {
  age60OrOlder: false,
  systolicBpMmHg: 120,
  diastolicBpMmHg: 75,
  clinicalFeature: 'other',
  durationBand: 'under_10',
  diabetes: false,
};

describe('abcd2Calculator', () => {
  it('scores zero for minimal inputs', () => {
    expect(calculateAbcd2Score(baseInputs)).toBe(0);
    expect(abcd2RiskCategoryFromScore(0)).toBe('low');
  });

  it('scores maximum 7 when all high-risk factors present', () => {
    expect(
      calculateAbcd2Score({
        age60OrOlder: true,
        systolicBpMmHg: 160,
        diastolicBpMmHg: 95,
        clinicalFeature: 'unilateral_weakness',
        durationBand: 'sixty_plus',
        diabetes: true,
      })
    ).toBe(7);
    expect(interpretAbcd2Score(7)?.riskCategory).toBe('high');
  });

  it('detects elevated blood pressure', () => {
    expect(isAbcd2BloodPressureElevated(140, 70)).toBe(true);
    expect(isAbcd2BloodPressureElevated(120, 90)).toBe(true);
    expect(isAbcd2BloodPressureElevated(120, 80)).toBe(false);
    expect(calculateAbcd2Score({ ...baseInputs, diastolicBpMmHg: 92 })).toBe(1);
  });

  it.each([
    { score: 3, category: 'low' },
    { score: 4, category: 'moderate' },
    { score: 6, category: 'high' },
  ])('abcd2RiskCategoryFromScore($score) is $category', ({ score, category }) => {
    expect(abcd2RiskCategoryFromScore(score)).toBe(category);
  });

  it('validateAbcd2Inputs requires BP and selections', () => {
    expect(validateAbcd2Inputs(baseInputs).valid).toBe(true);
    const bad = validateAbcd2Inputs({ ...baseInputs, systolicBpMmHg: NaN });
    expect(bad.valid).toBe(false);
  });

  it('includes stroke disclaimer and urgent-care language', () => {
    const interp = interpretAbcd2Score(4);
    expect(interp?.disclaimer).toBe(ABCD2_STROKE_DISCLAIMER);
    expect(interp?.disclaimer).toMatch(/do not delay urgent evaluation/i);
    expect(interp?.interpretation).not.toMatch(/\bprescribe\b/i);
  });

  it('returns null for invalid score', () => {
    expect(interpretAbcd2Score(8)).toBeNull();
    expect(calculateAbcd2Score({ ...baseInputs, clinicalFeature: 'invalid' })).toBeNull();
  });
});
