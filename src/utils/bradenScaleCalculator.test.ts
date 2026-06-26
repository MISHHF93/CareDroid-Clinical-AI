import { describe, it, expect } from 'vitest';
import {
  BRADEN_HOSPITAL_DISCLAIMER,
  calculateBradenScore,
  interpretBradenScore,
} from './bradenScaleCalculator';

const minRiskInputs = {
  sensoryPerception: 4,
  moisture: 4,
  activity: 4,
  mobility: 4,
  nutrition: 4,
  frictionShear: 3,
};

const maxRiskInputs = {
  sensoryPerception: 1,
  moisture: 1,
  activity: 1,
  mobility: 1,
  nutrition: 1,
  frictionShear: 1,
};

describe('bradenScaleCalculator', () => {
  it('scores minimum 6 and maximum 23', () => {
    expect(calculateBradenScore(maxRiskInputs)).toBe(6);
    expect(calculateBradenScore(minRiskInputs)).toBe(23);
  });

  it.each([
    { score: 6, category: 'high', severity: 'critical' },
    { score: 12, category: 'high', severity: 'critical' },
    { score: 13, category: 'moderate', severity: 'warning' },
    { score: 15, category: 'mild', severity: 'warning' },
    { score: 20, category: 'low', severity: 'normal' },
  ])('interpretBradenScore($score) → $category', ({ score, category, severity }) => {
    const interp = interpretBradenScore(score);
    expect(interp?.riskCategory).toBe(category);
    expect(interp?.severity).toBe(severity);
    expect(interp?.riskCategoryLabel).toBeTruthy();
  });

  it('uses hospital disclaimer and avoids directive treatment language', () => {
    const interp = interpretBradenScore(10);
    expect(interp?.disclaimer).toBe(BRADEN_HOSPITAL_DISCLAIMER);
    expect(interp?.disclaimer).toMatch(/prevention bundle/i);
    expect(interp?.interpretation).not.toMatch(/\bimplement\b/i);
    expect(interp?.interpretation).toMatch(/protocol|documentation|prevention/i);
  });

  it('returns null for out-of-range scores', () => {
    expect(interpretBradenScore(5)).toBeNull();
    expect(interpretBradenScore(24)).toBeNull();
    expect(calculateBradenScore({ ...minRiskInputs, sensoryPerception: 9 })).toBeNull();
  });
});
