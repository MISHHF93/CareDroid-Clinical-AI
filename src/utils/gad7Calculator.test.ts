import { describe, it, expect } from 'vitest';
import {
  GAD7_ITEMS,
  categorizeGad7Severity,
  computeGad7Breakdown,
  computeGad7Result,
  interpretGad7Score,
  sumGad7Score,
  validateGad7Inputs,
} from './gad7Calculator';

function allZeros() {
  return Object.fromEntries(GAD7_ITEMS.map((item) => [item.key, 0]));
}

function allThrees() {
  return Object.fromEntries(GAD7_ITEMS.map((item) => [item.key, 3]));
}

describe('gad7Calculator — scoring', () => {
  it('sums seven item scores (0–21)', () => {
    expect(sumGad7Score(computeGad7Breakdown(allZeros()))).toBe(0);
    expect(sumGad7Score(computeGad7Breakdown(allThrees()))).toBe(21);
  });

  it('scores a mixed response pattern', () => {
    const breakdown = computeGad7Breakdown({
      q1: 2,
      q2: 1,
      q3: 0,
      q4: 2,
      q5: 1,
      q6: 0,
      q7: 1,
    });
    expect(sumGad7Score(breakdown)).toBe(7);
  });
});

describe('gad7Calculator — severity thresholds', () => {
  it('applies standard GAD-7 severity bands', () => {
    expect(categorizeGad7Severity(0)).toBe('none_minimal');
    expect(categorizeGad7Severity(4)).toBe('none_minimal');
    expect(categorizeGad7Severity(5)).toBe('mild');
    expect(categorizeGad7Severity(9)).toBe('mild');
    expect(categorizeGad7Severity(10)).toBe('moderate');
    expect(categorizeGad7Severity(14)).toBe('moderate');
    expect(categorizeGad7Severity(15)).toBe('severe');
    expect(categorizeGad7Severity(21)).toBe('severe');
  });
});

describe('gad7Calculator — interpretation guardrails', () => {
  it('requires all seven responses', () => {
    const out = computeGad7Result({ q1: 0 });
    expect(out.ok).toBe(false);
    if (out.ok) throw new Error('expected computeGad7Result to fail');
    expect(out.errors.length).toBeGreaterThan(0);
  });

  it('avoids anxiety disorder diagnosis and medication language', () => {
    const out = computeGad7Result(allThrees());
    expect(out.ok).toBe(true);
    if (!out.ok) throw new Error('expected computeGad7Result to succeed');
    expect(out.totalScore).toBe(21);
    expect(out.severityCategory).toBe('severe');
    const combined = `${out.screeningDiscussion} ${out.screeningDisclaimer} ${out.safetyDisclaimer} ${out.clinicianReviewDisclaimer}`.toLowerCase();
    expect(combined).not.toMatch(/\bdiagnosed with generalized anxiety\b/);
    expect(combined).not.toMatch(/\bprescribe\b/);
    expect(combined).toMatch(/does not diagnose/);
    expect(combined).toMatch(/clinician/);
  });
});

describe('gad7Calculator — severe-range safety', () => {
  it('returns acute distress alert for severe scores', () => {
    const interp = interpretGad7Score(15);
    if (!interp) throw new Error('expected interpretGad7Score to return a result');
    expect(interp.acuteDistressSafetyAlert.elevated).toBe(true);
    expect(interp.acuteDistressSafetyAlert.message).toMatch(/988/i);
  });

  it('does not flag acute distress alert below severe range', () => {
    const interp = interpretGad7Score(14);
    if (!interp) throw new Error('expected interpretGad7Score to return a result');
    expect(interp.acuteDistressSafetyAlert.elevated).toBe(false);
    expect(interp.moderateSymptomEscalation.warranted).toBe(true);
    expect(interp.moderateSymptomEscalation.message).toMatch(/PHQ-9 question 9/i);
  });
});

describe('gad7Calculator — edge cases', () => {
  it('returns null for invalid totals', () => {
    expect(interpretGad7Score(-1)).toBeNull();
    expect(interpretGad7Score(22)).toBeNull();
    expect(validateGad7Inputs({ ...allZeros(), q3: 4 }).valid).toBe(false);
  });
});
