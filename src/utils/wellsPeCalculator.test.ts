import { describe, it, expect } from 'vitest';
import {
  WELLS_PE_CRITERIA_META,
  calculateWellsPeScore,
  computeWellsPeBreakdown,
  interpretWellsPe,
} from './wellsPeCalculator';

const none = Object.fromEntries(WELLS_PE_CRITERIA_META.map((r) => [r.key, false]));

describe('wellsPeCalculator', () => {
  it('sums fractional Wells PE points', () => {
    expect(calculateWellsPeScore(none)).toBe(0);
    const all = Object.fromEntries(WELLS_PE_CRITERIA_META.map((r) => [r.key, true]));
    expect(calculateWellsPeScore(all)).toBe(12.5);
  });

  it('computes breakdown per criterion', () => {
    const b = computeWellsPeBreakdown({ ...none, clinicalDvtSigns: true, hemoptysis: true });
    expect(b.clinicalDvtSigns).toBe(3);
    expect(b.hemoptysis).toBe(1);
    expect(calculateWellsPeScore({ ...none, clinicalDvtSigns: true, hemoptysis: true })).toBe(4);
  });

  it('interpretWellsPe applies low / intermediate / high thresholds', () => {
    expect(interpretWellsPe(4)?.probabilityBand).toBe('Low probability');
    expect(interpretWellsPe(4.5)?.probabilityBand).toBe('Intermediate probability');
    expect(interpretWellsPe(6)?.probabilityBand).toBe('Intermediate probability');
    expect(interpretWellsPe(6.5)?.probabilityBand).toBe('High probability');
  });

  it('includes diagnostic safety disclaimer without rule-out language', () => {
    const low = interpretWellsPe(2);
    expect(low.diagnosticDisclaimer).toMatch(/does not rule in or rule out/i);
    expect(low.interpretation).not.toMatch(/pe is excluded|rule out pe|definitely no pe/i);
  });

  it('high-risk path (score > 6) yields critical severity and high probability band', () => {
    const all = Object.fromEntries(WELLS_PE_CRITERIA_META.map((r) => [r.key, true]));
    expect(calculateWellsPeScore(all)).toBe(12.5);
    const high = interpretWellsPe(7);
    expect(high?.severity).toBe('critical');
    expect(high?.probabilityBand).toBe('High probability');
    expect(high?.label).toMatch(/High clinical probability/i);
  });

  it('returns null for out-of-range scores', () => {
    expect(interpretWellsPe(-0.5)).toBeNull();
    expect(interpretWellsPe(13)).toBeNull();
    expect(calculateWellsPeScore({ ...none, clinicalDvtSigns: true })).toBe(3);
  });
});
