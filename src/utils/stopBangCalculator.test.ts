import { describe, it, expect } from 'vitest';
import {
  STOP_BANG_CRITERIA_META,
  calculateStopBangScore,
  categorizeStopBangOsaRisk,
  computeStopBangBreakdown,
  computeStopBangResult,
  interpretStopBangScore,
  validateStopBangInputs,
} from './stopBangCalculator';

const ALL_FALSE = Object.fromEntries(STOP_BANG_CRITERIA_META.map((r) => [r.key, false]));
const ALL_TRUE = Object.fromEntries(STOP_BANG_CRITERIA_META.map((r) => [r.key, true]));

describe('stopBangCalculator — scoring', () => {
  it('defines all eight STOP-Bang criteria', () => {
    expect(STOP_BANG_CRITERIA_META).toHaveLength(8);
    expect(STOP_BANG_CRITERIA_META.map((r) => r.key)).toEqual([
      'snoring',
      'tiredness',
      'observedApnea',
      'hypertension',
      'bmiOver35',
      'ageOver50',
      'largeNeckCircumference',
      'maleSex',
    ]);
  });

  it('sums one point per positive criterion (0–8)', () => {
    expect(calculateStopBangScore(ALL_FALSE)).toBe(0);
    expect(calculateStopBangScore(ALL_TRUE)).toBe(8);
    expect(
      calculateStopBangScore({
        ...ALL_FALSE,
        snoring: true,
        tiredness: true,
        observedApnea: true,
      })
    ).toBe(3);
  });

  it('exposes per-criterion breakdown', () => {
    const breakdown = computeStopBangBreakdown({
      ...ALL_FALSE,
      hypertension: true,
      maleSex: true,
    });
    expect(breakdown.hypertension).toBe(1);
    expect(breakdown.maleSex).toBe(1);
    expect(breakdown.snoring).toBe(0);
  });
});

describe('stopBangCalculator — OSA risk thresholds', () => {
  it('maps score bands per validation literature', () => {
    expect(categorizeStopBangOsaRisk(0)).toBe('low');
    expect(categorizeStopBangOsaRisk(2)).toBe('low');
    expect(categorizeStopBangOsaRisk(3)).toBe('intermediate');
    expect(categorizeStopBangOsaRisk(4)).toBe('intermediate');
    expect(categorizeStopBangOsaRisk(5)).toBe('high');
    expect(categorizeStopBangOsaRisk(8)).toBe('high');
  });

  it('handles threshold boundaries', () => {
    expect(interpretStopBangScore(2)?.osaRiskCategory).toBe('low');
    expect(interpretStopBangScore(3)?.osaRiskCategory).toBe('intermediate');
    expect(interpretStopBangScore(4)?.osaRiskCategory).toBe('intermediate');
    expect(interpretStopBangScore(5)?.osaRiskCategory).toBe('high');
  });
});

describe('stopBangCalculator — interpretation', () => {
  it('includes required screening disclaimer and avoids treatment directives', () => {
    const out = computeStopBangResult(ALL_TRUE);
    expect(out.ok).toBe(true);
    if (!out.ok) throw new Error('expected computeStopBangResult to succeed');
    expect(out.screeningDisclaimer).toBe('Screening tool only.');
    expect(out.pathwayDisclaimer.toLowerCase()).not.toMatch(/\bprescribe cpap\b/);
    expect(out.osaRiskDiscussion.toLowerCase()).not.toMatch(/\bstart cpap\b/);
  });
});

describe('stopBangCalculator — edge cases', () => {
  it('returns null interpretation for out-of-range scores', () => {
    expect(interpretStopBangScore(-1)).toBeNull();
    expect(interpretStopBangScore(9)).toBeNull();
    expect(categorizeStopBangOsaRisk(-1)).toBeNull();
    expect(categorizeStopBangOsaRisk(9)).toBeNull();
  });

  it('validateStopBangInputs accepts any boolean combination', () => {
    const v = validateStopBangInputs(ALL_FALSE);
    expect(v.valid).toBe(true);
    if (!v.inputs) throw new Error('expected validateStopBangInputs to return inputs');
    expect(v.inputs.snoring).toBe(false);
  });

  it('computeStopBangResult rejects missing input object', () => {
    const out = computeStopBangResult(undefined);
    expect(out.ok).toBe(false);
    expect(out.errors?.length).toBeGreaterThan(0);
  });

  it('assigns severity bands by OSA risk category', () => {
    expect(interpretStopBangScore(0)?.severity).toBe('normal');
    expect(interpretStopBangScore(3)?.severity).toBe('warning');
    expect(interpretStopBangScore(8)?.severity).toBe('critical');
  });
});
