import { describe, it, expect } from 'vitest';
import {
  PERC_CRITERIA_META,
  evaluatePerc,
  interpretPerc,
} from './percCalculator';

const allMet = Object.fromEntries(PERC_CRITERIA_META.map((r) => [r.key, true]));
const noneMet = Object.fromEntries(PERC_CRITERIA_META.map((r) => [r.key, false]));

describe('percCalculator', () => {
  it('is satisfied only when all eight criteria are met', () => {
    expect(evaluatePerc(allMet).satisfied).toBe(true);
    expect(evaluatePerc(noneMet).satisfied).toBe(false);
    expect(evaluatePerc({ ...allMet, ageUnder50: false }).unmetKeys).toContain('ageUnder50');
  });

  it('interpretPerc when satisfied includes strong safety language', () => {
    const r = evaluatePerc(allMet);
    const i = interpretPerc(r, { lowPretestProbabilityAcknowledged: true });
    expect(i.percStatus).toBe('PERC satisfied');
    expect(i.safetyDisclaimer).toMatch(/only when pre-test probability/i);
    expect(i.interpretation).toMatch(/not definitive exclusion/i);
    expect(i.interpretation).not.toMatch(/pe is ruled out|pe excluded|definitely no pe/i);
  });

  it('interpretPerc when not satisfied warns against deferring workup', () => {
    const i = interpretPerc(evaluatePerc({ ...allMet, noHemoptysis: false }), {
      lowPretestProbabilityAcknowledged: true,
    });
    expect(i.percStatus).toBe('PERC not satisfied');
    expect(i.interpretation).toMatch(/cannot be used/i);
  });

  it('requires low pre-test probability acknowledgment in guidance', () => {
    const warn = interpretPerc(evaluatePerc(allMet));
    expect(warn.label).toMatch(/low pre-test probability/i);
  });

  it('all-negative path (no criteria met) is not satisfied and lists all unmet keys', () => {
    const evalResult = evaluatePerc(noneMet);
    expect(evalResult.satisfied).toBe(false);
    expect(evalResult.unmetKeys).toHaveLength(PERC_CRITERIA_META.length);
    const i = interpretPerc(evalResult, { lowPretestProbabilityAcknowledged: true });
    expect(i.percStatus).toBe('PERC not satisfied');
    expect(i.severity).toBe('warning');
    expect(i.interpretation).toMatch(/cannot be used/i);
  });

  it('single unmet criterion prevents PERC satisfaction', () => {
    const oneMiss = { ...allMet, spo2AtLeast95: false };
    expect(evaluatePerc(oneMiss).satisfied).toBe(false);
    expect(evaluatePerc(oneMiss).unmetKeys).toEqual(['spo2AtLeast95']);
  });
});
