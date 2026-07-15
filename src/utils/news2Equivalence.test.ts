import { describe, it, expect } from 'vitest';
import { scoreRange, NEWS2_ITEMS } from './news2';
import {
  scoreRespiratoryRate,
  scoreSpo2Scale1,
  scoreSupplementalOxygen,
  scoreSystolicBp,
  scorePulse,
  scoreConsciousness,
  scoreTemperature,
} from './news2Calculator';

/**
 * `NEWS2.tsx` (live, vitals-driven patient monitoring, via utils/news2.ts) and
 * `pages/tools/Calculators.tsx` (standalone manual-entry calculator with Scale 2
 * support, via utils/news2Calculator.ts) are two real, independently-consumed
 * UI flows -- not a redundant duplicate to merge. But they each carry their own
 * copy of the same RCP NEWS2 scoring thresholds, so a future edit to one could
 * silently diverge from the other. This test locks the two implementations to
 * identical scores across every shared parameter's full input range so any
 * future drift fails loudly here instead of surfacing as a live clinical
 * scoring disagreement between the whiteboard and the standalone calculator.
 */
function itemRanges(id: string) {
  const item = NEWS2_ITEMS.find((candidate) => candidate.id === id);
  if (!item || !('ranges' in item)) throw new Error(`expected ranged NEWS2 item for ${id}`);
  return item.ranges;
}

describe('NEWS2 cross-implementation equivalence (utils/news2.ts vs utils/news2Calculator.ts)', () => {
  it('agrees on respiratory rate across the full clinical range', () => {
    for (let rr = 0; rr <= 40; rr += 1) {
      expect(scoreRespiratoryRate(rr)).toBe(scoreRange(rr, itemRanges('rr')));
    }
  });

  it('agrees on SpO2 Scale 1 across the full clinical range', () => {
    for (let spo2 = 70; spo2 <= 100; spo2 += 1) {
      expect(scoreSpo2Scale1(spo2)).toBe(scoreRange(spo2, itemRanges('spo2_scale1')));
    }
  });

  it('agrees on systolic BP across the full clinical range', () => {
    for (let sbp = 50; sbp <= 260; sbp += 1) {
      expect(scoreSystolicBp(sbp)).toBe(scoreRange(sbp, itemRanges('sbp')));
    }
  });

  it('agrees on pulse across the full clinical range', () => {
    for (let pulse = 20; pulse <= 200; pulse += 1) {
      expect(scorePulse(pulse)).toBe(scoreRange(pulse, itemRanges('hr')));
    }
  });

  it('agrees on temperature across the full clinical range', () => {
    for (let tempTenths = 300; tempTenths <= 420; tempTenths += 1) {
      const temp = tempTenths / 10;
      expect(scoreTemperature(temp)).toBe(scoreRange(temp, itemRanges('temp')));
    }
  });

  it('agrees on the air/supplemental-oxygen row', () => {
    const airOption = NEWS2_ITEMS.find((item) => item.id === 'air');
    if (!airOption || !('options' in airOption)) throw new Error('expected air NEWS2 item');
    const airScore = airOption.options.find((option) => option.label === 'Air')?.score;
    const oxygenScore = airOption.options.find((option) => option.label === 'On supplemental oxygen')?.score;

    expect(scoreSupplementalOxygen(false)).toBe(airScore);
    expect(scoreSupplementalOxygen(true)).toBe(oxygenScore);
  });

  it('agrees on the consciousness row (any deviation from Alert scores 3)', () => {
    const consciousnessItem = NEWS2_ITEMS.find((item) => item.id === 'consciousness');
    if (!consciousnessItem || !('options' in consciousnessItem)) throw new Error('expected consciousness NEWS2 item');
    const alertScore = consciousnessItem.options.find((option) => option.label === 'Alert (A)')?.score;
    const confusedScore = consciousnessItem.options.find((option) => option.label === 'Confused (C)')?.score;

    expect(scoreConsciousness(false)).toBe(alertScore);
    expect(scoreConsciousness(true)).toBe(confusedScore);
  });
});
