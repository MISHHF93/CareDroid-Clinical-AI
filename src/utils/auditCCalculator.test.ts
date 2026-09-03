import { describe, it, expect } from 'vitest';
import {
  AUDIT_C_MEN_POSITIVE_THRESHOLD,
  AUDIT_C_WOMEN_POSITIVE_THRESHOLD,
  AUDIT_C_FREQUENCY_OPTIONS,
  AUDIT_C_DRINKS_PER_DAY_OPTIONS,
  AUDIT_C_BINGE_OPTIONS,
  categorizeAuditCScreening,
  computeAuditCResult,
  computeAuditCBreakdown,
  interpretAuditCScore,
  sumAuditCScore,
  validateAuditCInputs,
} from './auditCCalculator';

describe('auditCCalculator — scoring', () => {
  it('defines three AUDIT-C consumption questions', () => {
    expect(AUDIT_C_FREQUENCY_OPTIONS.length).toBe(5);
    expect(AUDIT_C_DRINKS_PER_DAY_OPTIONS.length).toBe(5);
    expect(AUDIT_C_BINGE_OPTIONS.length).toBe(5);
  });

  it('sums three question points (0–12)', () => {
    const breakdown = computeAuditCBreakdown({
      drinkingFrequency: 'never',
      drinksPerDay: 'one_or_two',
      bingeFrequency: 'never',
    });
    expect(breakdown).toEqual({ drinkingFrequency: 0, drinksPerDay: 0, bingeFrequency: 0 });
    expect(sumAuditCScore(breakdown)).toBe(0);

    const high = computeAuditCBreakdown({
      drinkingFrequency: 'four_plus_per_week',
      drinksPerDay: 'ten_plus',
      bingeFrequency: 'daily_or_almost_daily',
    });
    expect(sumAuditCScore(high)).toBe(12);
  });

  it('scores a mixed response pattern', () => {
    const breakdown = computeAuditCBreakdown({
      drinkingFrequency: 'two_to_four_per_month',
      drinksPerDay: 'three_or_four',
      bingeFrequency: 'monthly',
    });
    expect(sumAuditCScore(breakdown)).toBe(5);
  });
});

describe('auditCCalculator — screening thresholds', () => {
  it('applies sex-specific AUDIT-C cutoffs', () => {
    expect(categorizeAuditCScreening(2)).toBe('negative');
    expect(categorizeAuditCScreening(AUDIT_C_WOMEN_POSITIVE_THRESHOLD - 1)).toBe('negative');
    expect(categorizeAuditCScreening(AUDIT_C_WOMEN_POSITIVE_THRESHOLD)).toBe('positive_women');
    expect(categorizeAuditCScreening(AUDIT_C_MEN_POSITIVE_THRESHOLD - 1)).toBe('positive_women');
    expect(categorizeAuditCScreening(AUDIT_C_MEN_POSITIVE_THRESHOLD)).toBe('positive_men');
    expect(categorizeAuditCScreening(12)).toBe('positive_men');
  });
});

describe('auditCCalculator — interpretation', () => {
  it('requires all dropdown answers', () => {
    const out = computeAuditCResult({ drinkingFrequency: 'never' });
    expect(out.ok).toBe(false);
    if (!out.errors) throw new Error('expected computeAuditCResult to report errors');
    expect(out.errors.length).toBeGreaterThan(0);
  });

  it('avoids detox advice and AUD diagnosis language', () => {
    const out = computeAuditCResult({
      drinkingFrequency: 'four_plus_per_week',
      drinksPerDay: 'ten_plus',
      bingeFrequency: 'weekly',
    });
    expect(out.ok).toBe(true);
    // NOTE: computeAuditCResult's inferred return type spreads `interp` into the success
    // branch, which widens `ok` to `boolean` on both branches — `out.ok` alone can't
    // narrow. Discriminate on a success-only field instead.
    if (!('totalScore' in out)) throw new Error('expected computeAuditCResult to succeed');
    expect(out.totalScore).toBe(11);
    expect(out.screeningResult).toBe('positive_men');
    const combined =
      `${out.screeningDiscussion} ${out.pathwayDisclaimer} ${out.screeningDisclaimer}`.toLowerCase();
    expect(combined).not.toMatch(/\bdetox\b/);
    expect(combined).not.toMatch(/\bdiagnosed with alcohol use disorder\b/);
    expect(out.screeningDisclaimer).toMatch(/^Screening only\./i);
    expect(out.screeningDisclaimer).toMatch(/does not diagnose alcohol use disorder/i);
    expect(out.screeningDisclaimer).toMatch(/withdrawal-management/i);
  });

  it('reports negative screen interpretation at score 2', () => {
    const out = computeAuditCResult({
      drinkingFrequency: 'monthly_or_less',
      drinksPerDay: 'one_or_two',
      bingeFrequency: 'never',
    });
    expect(out.ok).toBe(true);
    if (!('totalScore' in out)) throw new Error('expected computeAuditCResult to succeed');
    expect(out.totalScore).toBe(1);
    expect(out.screeningResult).toBe('negative');
    expect(out.label).toMatch(/negative/i);
  });
});

describe('auditCCalculator — edge cases', () => {
  it('returns null interpretation for invalid scores', () => {
    expect(interpretAuditCScore(-1)).toBeNull();
    expect(interpretAuditCScore(13)).toBeNull();
    expect(categorizeAuditCScreening(-1)).toBeNull();
  });

  it('rejects invalid option values for each question', () => {
    const v = validateAuditCInputs({
      drinkingFrequency: 'not-a-valid-option',
      drinksPerDay: 'one_or_two',
      bingeFrequency: 'never',
    });
    expect(v.valid).toBe(false);
    expect(v.errors.some((e) => /drinking frequency/i.test(e))).toBe(true);
  });

  it('requires every AUDIT-C question', () => {
    for (const field of ['drinkingFrequency', 'drinksPerDay', 'bingeFrequency']) {
      const partial = {
        drinkingFrequency: AUDIT_C_FREQUENCY_OPTIONS[0].value,
        drinksPerDay: 'one_or_two',
        bingeFrequency: 'never',
      };
      delete partial[field];
      expect(validateAuditCInputs(partial).valid).toBe(false);
    }
  });

  it('assigns warning severity for positive screens', () => {
    expect(interpretAuditCScore(AUDIT_C_WOMEN_POSITIVE_THRESHOLD)?.severity).toBe('warning');
    expect(interpretAuditCScore(0)?.severity).toBe('normal');
  });
});
