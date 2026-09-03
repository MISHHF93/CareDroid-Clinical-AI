import { describe, it, expect } from 'vitest';
import {
  PECARN_HEAD_DISCLAIMER,
  evaluatePecarnHead,
  interpretPecarnHead,
} from './pecarnHeadCalculator';

describe('pecarnHeadCalculator', () => {
  it('flags higher-risk stratum when <2y criteria present', () => {
    const result = evaluatePecarnHead({
      ageCategory: 'under_2',
      alteredMentalStatus: false,
      lossOfConsciousness: true,
      severeMechanism: false,
      skullFractureSigns: false,
    });
    expect(result?.ruleCriteriaMet).toBe(true);
    expect(result?.riskStratum).toBe('higher');
    expect(result?.triggeredCriteria).toContain(
      'Loss of consciousness (>5 seconds in PECARN <2 years cohort)',
    );
  });

  it('flags higher-risk when ≥2y vomiting present', () => {
    const result = evaluatePecarnHead({
      ageCategory: 'two_plus',
      vomiting: true,
    });
    expect(result?.ruleCriteriaMet).toBe(true);
    expect(result?.triggeredCriteria).toContain('Vomiting');
  });

  it('does not count vomiting for <2y cohort', () => {
    const result = evaluatePecarnHead({
      ageCategory: 'under_2',
      vomiting: true,
    });
    expect(result?.ruleCriteriaMet).toBe(false);
    expect(result?.riskStratum).toBe('lower');
  });

  it('returns lower-risk when no criteria met', () => {
    const result = evaluatePecarnHead({
      ageCategory: 'two_plus',
      alteredMentalStatus: false,
      vomiting: false,
      severeMechanism: false,
      skullFractureSigns: false,
    });
    expect(result?.ruleCriteriaMet).toBe(false);
    expect(result?.riskStratum).toBe('lower');
    expect(result?.severity).toBe('normal');
  });

  it('includes safety disclaimer without CT directives', () => {
    const higher = interpretPecarnHead({
      ageCategory: 'two_plus',
      ruleCriteriaMet: true,
      riskStratum: 'higher',
      triggeredCriteria: ['Vomiting'],
    });
    expect(higher?.disclaimer).toBe(PECARN_HEAD_DISCLAIMER);
    expect(higher?.interpretation).toMatch(/does not direct CT/i);
    expect(higher?.interpretation).not.toMatch(/\b(order|obtain|skip|avoid)\s+(a\s+)?ct\b/i);
  });

  it('returns null for invalid age category', () => {
    expect(evaluatePecarnHead({ ageCategory: 'teen' })).toBeNull();
  });
});
