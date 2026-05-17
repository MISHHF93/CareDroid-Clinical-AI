import { describe, it, expect } from 'vitest';
import {
  PHQ9_ITEMS,
  PHQ9_QUESTION9_ELEVATED_THRESHOLD,
  categorizePhq9Severity,
  computePhq9Breakdown,
  computePhq9Result,
  interpretPhq9Score,
  isPhq9Question9Elevated,
  sumPhq9Score,
  validatePhq9Inputs,
} from './phq9Calculator';

function allZeros() {
  return Object.fromEntries(PHQ9_ITEMS.map((item) => [item.key, 0]));
}

function allThrees() {
  return Object.fromEntries(PHQ9_ITEMS.map((item) => [item.key, 3]));
}

describe('phq9Calculator — scoring', () => {
  it('sums nine item scores (0–27)', () => {
    const breakdown = computePhq9Breakdown(allZeros());
    expect(sumPhq9Score(breakdown)).toBe(0);
    expect(sumPhq9Score(computePhq9Breakdown(allThrees()))).toBe(27);
  });

  it('scores a mixed response pattern', () => {
    const breakdown = computePhq9Breakdown({
      q1: 1,
      q2: 2,
      q3: 0,
      q4: 1,
      q5: 0,
      q6: 2,
      q7: 1,
      q8: 0,
      q9: 0,
    });
    expect(sumPhq9Score(breakdown)).toBe(7);
  });
});

describe('phq9Calculator — severity thresholds', () => {
  it('applies standard PHQ-9 severity bands', () => {
    expect(categorizePhq9Severity(0)).toBe('none_minimal');
    expect(categorizePhq9Severity(4)).toBe('none_minimal');
    expect(categorizePhq9Severity(5)).toBe('mild');
    expect(categorizePhq9Severity(9)).toBe('mild');
    expect(categorizePhq9Severity(10)).toBe('moderate');
    expect(categorizePhq9Severity(14)).toBe('moderate');
    expect(categorizePhq9Severity(15)).toBe('moderately_severe');
    expect(categorizePhq9Severity(19)).toBe('moderately_severe');
    expect(categorizePhq9Severity(20)).toBe('severe');
    expect(categorizePhq9Severity(27)).toBe('severe');
  });
});

describe('phq9Calculator — question 9 safety', () => {
  it('flags elevated handling at threshold ≥ 1', () => {
    expect(PHQ9_QUESTION9_ELEVATED_THRESHOLD).toBe(1);
    expect(isPhq9Question9Elevated(0)).toBe(false);
    expect(isPhq9Question9Elevated(1)).toBe(true);
    expect(isPhq9Question9Elevated(3)).toBe(true);
  });

  it('returns critical severity and safety alert when question 9 is non-zero', () => {
    const interp = interpretPhq9Score(2, 1);
    expect(interp.question9Elevated).toBe(true);
    expect(interp.severity).toBe('critical');
    expect(interp.question9SafetyAlert.elevated).toBe(true);
    expect(interp.question9SafetyAlert.message).toMatch(/urgent safety assessment/i);
    expect(interp.interpretation).toMatch(/Question 9/i);
    expect(interp.label).toMatch(/Question 9 elevated/i);
  });

  it('does not flag question 9 safety when score is zero', () => {
    const interp = interpretPhq9Score(18, 0);
    expect(interp.question9Elevated).toBe(false);
    expect(interp.question9SafetyAlert.elevated).toBe(false);
  });
});

describe('phq9Calculator — interpretation guardrails', () => {
  it('requires all nine responses', () => {
    const out = computePhq9Result({ q1: 0 });
    expect(out.ok).toBe(false);
    expect(out.errors.length).toBeGreaterThan(0);
  });

  it('avoids depression diagnosis and medication language', () => {
    const out = computePhq9Result(allThrees());
    expect(out.ok).toBe(true);
    expect(out.totalScore).toBe(27);
    expect(out.severityCategory).toBe('severe');
    const combined = `${out.screeningDiscussion} ${out.screeningDisclaimer} ${out.pathwayDisclaimer} ${out.clinicianReviewDisclaimer}`.toLowerCase();
    expect(combined).not.toMatch(/\bdiagnosed with depression\b/);
    expect(combined).not.toMatch(/\bstart (an )?antidepressant\b/);
    expect(combined).not.toMatch(/\bprescribe\b/);
    expect(combined).toMatch(/does not diagnose/);
    expect(combined).toMatch(/clinician/);
  });
});

describe('phq9Calculator — edge cases', () => {
  it('returns null for invalid totals', () => {
    expect(interpretPhq9Score(-1, 0)).toBeNull();
    expect(interpretPhq9Score(28, 0)).toBeNull();
    expect(categorizePhq9Severity(-1)).toBeNull();
  });

  it('rejects invalid item scores in validation', () => {
    const invalid = { ...allZeros(), q5: 4 };
    expect(validatePhq9Inputs(invalid).valid).toBe(false);
  });
});
