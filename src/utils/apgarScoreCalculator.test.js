import { describe, it, expect } from 'vitest';
import {
  APGAR_OBSTETRIC_DISCLAIMER,
  APGAR_COMPONENTS_META,
  apgarRiskCategoryFromScore,
  calculateApgarScore,
  interpretApgarScore,
  validateApgarMinuteInputs,
} from './apgarScoreCalculator';

const perfect = Object.fromEntries(APGAR_COMPONENTS_META.map((c) => [c.key, 2]));

describe('apgarScoreCalculator', () => {
  it('scores 10 when all components are 2', () => {
    expect(calculateApgarScore(perfect)).toBe(10);
    expect(interpretApgarScore(10)?.riskCategory).toBe('reassuring');
  });

  it('scores 0 when all components are 0', () => {
    const zero = Object.fromEntries(APGAR_COMPONENTS_META.map((c) => [c.key, 0]));
    expect(calculateApgarScore(zero)).toBe(0);
    expect(interpretApgarScore(0)?.severity).toBe('critical');
    expect(interpretApgarScore(0)?.riskCategory).toBe('severely_depressed');
  });

  it.each([
    { score: 3, category: 'severely_depressed' },
    { score: 5, category: 'moderately_depressed' },
    { score: 8, category: 'reassuring' },
  ])('apgarRiskCategoryFromScore($score) is $category', ({ score, category }) => {
    expect(apgarRiskCategoryFromScore(score)).toBe(category);
  });

  it('validateApgarMinuteInputs requires 0-2 per component', () => {
    expect(validateApgarMinuteInputs(perfect).valid).toBe(true);
    const bad = validateApgarMinuteInputs({ ...perfect, pulse: 9 });
    expect(bad.valid).toBe(false);
    expect(calculateApgarScore({ ...perfect, pulse: 9 })).toBeNull();
  });

  it('includes obstetric disclaimer and avoids treatment directives', () => {
    const interp = interpretApgarScore(4, { timingLabel: '5 minutes' });
    expect(interp?.disclaimer).toBe(APGAR_OBSTETRIC_DISCLAIMER);
    expect(interp?.disclaimer).toMatch(/NRP|resuscitation/i);
    expect(interp?.interpretation).not.toMatch(/\bprescribe\b/i);
    expect(interp?.interpretation).not.toMatch(/\bimplement\b/i);
    expect(interp?.riskBand).toMatch(/5 minutes/);
  });
});
