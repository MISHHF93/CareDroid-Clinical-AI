import { describe, it, expect } from 'vitest';
import {
  calculateHasBledScore,
  computeHasBledBreakdown,
  interpretHasBled,
  sumHasBledScore,
} from './hasBledCalculator';
import { HAS_BLED_NONE, HAS_BLED_SEVERITY_BY_SCORE } from '../data/testHelpers/pr1TestFixtures';

const none = HAS_BLED_NONE;

describe('hasBledCalculator', () => {
  it('scores zero when no factors present', () => {
    expect(calculateHasBledScore(none)).toBe(0);
    const interp = interpretHasBled(0);
    expect(interp?.severity).toBe('normal');
  });

  it('sums one point per factor (max 9)', () => {
    const all = { ...none };
    for (const k of Object.keys(none)) {
      all[k] = true;
    }
    expect(calculateHasBledScore(all)).toBe(9);
    const b = computeHasBledBreakdown(all);
    expect(sumHasBledScore(b)).toBe(9);
  });

  it.each(HAS_BLED_SEVERITY_BY_SCORE)(
    'interpretHasBled($score) elevated=$elevated severity=$severity',
    ({ score, elevated, severity }) => {
      const interp = interpretHasBled(score);
      expect(interp?.severity).toBe(severity);
      if (elevated) {
        expect(interp?.interpretation).toMatch(/3 or more/i);
        expect(interp?.label).toMatch(/elevated/i);
      } else {
        expect(interp?.interpretation).toMatch(/below 3/i);
      }
    },
  );

  it('calculateHasBledScore counts a subset of factors', () => {
    const three = { ...none, hypertension: true, renalDysfunction: true, strokeHistory: true };
    expect(calculateHasBledScore(three)).toBe(3);
    expect(interpretHasBled(3)?.severity).toBe('critical');
  });

  it('returns null for invalid totals', () => {
    expect(interpretHasBled(-1)).toBeNull();
    expect(interpretHasBled(10)).toBeNull();
  });
});
