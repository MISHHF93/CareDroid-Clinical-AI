import { describe, it, expect } from 'vitest';
import {
  calculateHasBledScore,
  computeHasBledBreakdown,
  interpretHasBled,
  sumHasBledScore,
} from './hasBledCalculator';

const none = {
  hypertension: false,
  renalDysfunction: false,
  liverDysfunction: false,
  strokeHistory: false,
  bleedingHistory: false,
  labileInr: false,
  ageOver65: false,
  bleedingPredisposingDrugs: false,
  alcoholUse: false,
};

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

  it('flags elevated bleeding-risk interpretation at ≥3', () => {
    const low = interpretHasBled(2);
    expect(low?.severity).toBe('normal');
    const high = interpretHasBled(3);
    expect(high?.severity).toBe('critical');
    expect(high?.interpretation).toMatch(/3 or more/i);
    expect(high?.label).toMatch(/elevated/i);
  });

  it('interpretHasBled stays on lower band below threshold and covers maximum score', () => {
    const one = interpretHasBled(1);
    expect(one?.severity).toBe('normal');
    expect(one?.interpretation).toMatch(/below 3/i);

    const nine = interpretHasBled(9);
    expect(nine?.severity).toBe('critical');
    expect(nine?.interpretation).toMatch(/3 or more/i);
  });

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
