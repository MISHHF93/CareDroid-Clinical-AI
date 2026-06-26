import { describe, it, expect } from 'vitest';
import {
  TIMI_UA_NSTEMI_CRITERIA_META,
  calculateTimiUaNstemiScore,
  computeTimiBreakdown,
  interpretTimiUaNstemi,
  sumTimiScore,
} from './timiUaNstemiCalculator';

const none = {
  age65OrOlder: false,
  threeOrMoreCadRiskFactors: false,
  knownCadStenosis50: false,
  aspirinLast7Days: false,
  severeAngina: false,
  stDeviation: false,
  elevatedCardiacMarkers: false,
};

const all = Object.fromEntries(TIMI_UA_NSTEMI_CRITERIA_META.map((r) => [r.key, true]));

describe('timiUaNstemiCalculator', () => {
  it('scores zero when no criteria selected', () => {
    expect(calculateTimiUaNstemiScore(none)).toBe(0);
  });

  it('scores seven when all criteria selected', () => {
    expect(calculateTimiUaNstemiScore(all)).toBe(7);
  });

  it('sums one point per criterion', () => {
    const partial = { ...none, age65OrOlder: true, stDeviation: true, elevatedCardiacMarkers: true };
    const b = computeTimiBreakdown(partial);
    expect(sumTimiScore(b)).toBe(3);
    expect(calculateTimiUaNstemiScore(partial)).toBe(3);
  });

  it('interpretTimiUaNstemi uses 0–2 as lower, 3–4 intermediate, 5–7 higher bands', () => {
    expect(interpretTimiUaNstemi(0)?.severity).toBe('normal');
    expect(interpretTimiUaNstemi(2)?.severity).toBe('normal');
    expect(interpretTimiUaNstemi(3)?.severity).toBe('warning');
    expect(interpretTimiUaNstemi(4)?.severity).toBe('warning');
    expect(interpretTimiUaNstemi(5)?.severity).toBe('critical');
    expect(interpretTimiUaNstemi(7)?.severity).toBe('critical');
  });

  it('applies interpretation thresholds at band boundaries', () => {
    expect(interpretTimiUaNstemi(2)?.riskBand).toBe('0–2 points');
    expect(interpretTimiUaNstemi(3)?.riskBand).toBe('3–4 points');
    expect(interpretTimiUaNstemi(4)?.riskBand).toBe('3–4 points');
    expect(interpretTimiUaNstemi(5)?.riskBand).toBe('5–7 points');
  });

  it('scores each criterion independently (one point each)', () => {
    for (const row of TIMI_UA_NSTEMI_CRITERIA_META) {
      const single = { ...none, [row.key]: true };
      expect(calculateTimiUaNstemiScore(single)).toBe(1);
    }
  });

  it('includes ACS disclaimer without treatment directives', () => {
    const i = interpretTimiUaNstemi(4);
    expect(i.acsDisclaimer).toMatch(/does not recommend/i);
    expect(i.interpretation).not.toMatch(/start heparin|give aspirin|pci/i);
  });

  it('returns null for invalid scores', () => {
    expect(interpretTimiUaNstemi(-1)).toBeNull();
    expect(interpretTimiUaNstemi(8)).toBeNull();
    expect(interpretTimiUaNstemi(Number.NaN)).toBeNull();
  });

  it('max score (7) maps to highest TIMI risk band with critical severity', () => {
    expect(calculateTimiUaNstemiScore(all)).toBe(7);
    const atMax = interpretTimiUaNstemi(7);
    expect(atMax?.riskBand).toBe('5–7 points');
    expect(atMax?.severity).toBe('critical');
    expect(atMax?.label).toBe('Higher TIMI risk band');
    expect(atMax?.approximateEventRate).toMatch(/26–41%|26-41%/);
  });

  it('breakdown sums to total for partial selection', () => {
    const partial = { ...none, severeAngina: true, stDeviation: true };
    const breakdown = computeTimiBreakdown(partial);
    expect(Object.values(breakdown).reduce((a, b) => a + b, 0)).toBe(2);
    expect(calculateTimiUaNstemiScore(partial)).toBe(2);
  });
});
