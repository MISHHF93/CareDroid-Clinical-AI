import { describe, it, expect } from 'vitest';
import { scoreRange, NEWS2_ITEMS, news2Response } from './news2';
import {
  scoreRespiratoryRate,
  scoreSpo2Scale1,
  scoreSupplementalOxygen,
  scoreSystolicBp,
  scorePulse,
  scoreConsciousness,
  scoreTemperature,
  interpretNews2Risk,
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

  // HEAL-184: this equivalence file never covered response-band agreement, only per-parameter
  // point scoring -- news2.ts's news2Response() and news2Calculator.ts's interpretNews2Risk()
  // are two independently-written escalation-banding functions. Both correctly treat a single
  // parameter scoring 3 ("single red") as a Warning-level escalation even when the aggregate
  // total is below 5 (news2.ts folds it into the same 'Medium'/'Warning' band as aggregate 5-6;
  // news2Calculator.ts gives it a distinct 'low_medium_red' label but the same 'warning'
  // severity) -- so this locks the safety-relevant invariant (both escalate at the same
  // severity) without forcing the 2 UIs' differently-detailed label text to match, which is a
  // deliberate granularity difference (the standalone calculator's longer interpretation text
  // explicitly says single-red "does not automatically equal the same response as aggregate
  // >=5, but must not be ignored" -- a nuance the simpler whiteboard badge doesn't need).
  it('agrees on escalation severity for a single-red parameter even when the aggregate is below 5', () => {
    const total = 3; // single item at 3, nothing else contributing
    const fromWhiteboard = news2Response(total, true);
    const fromCalculator = interpretNews2Risk(total, { respiratoryRate: 3 });

    expect(fromWhiteboard.alertSeverity).toBe('Warning');
    expect(fromCalculator.severity).toBe('warning');
    expect(fromCalculator.hasRed).toBe(true);
  });

  it('agrees that a low aggregate with no single-red stays low/normal severity on both sides', () => {
    const total = 2;
    const fromWhiteboard = news2Response(total, false);
    const fromCalculator = interpretNews2Risk(total, { respiratoryRate: 1, pulse: 1 });

    expect(fromWhiteboard.band).toBe('Low');
    expect(fromWhiteboard.alertSeverity).toBeUndefined();
    expect(fromCalculator.severity).toBe('normal');
    expect(fromCalculator.hasRed).toBe(false);
  });

  it('agrees that an aggregate of 7+ is always the highest-severity band on both sides', () => {
    const total = 8;
    const fromWhiteboard = news2Response(total, false);
    const fromCalculator = interpretNews2Risk(total, { respiratoryRate: 3, pulse: 3 });

    expect(fromWhiteboard.band).toBe('High');
    expect(fromWhiteboard.alertSeverity).toBe('Critical');
    expect(fromCalculator.severity).toBe('critical');
  });
});
