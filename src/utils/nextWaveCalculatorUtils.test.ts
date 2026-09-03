import { describe, expect, it } from 'vitest';
import {
  calculateAnionGap,
  calculateShockIndex,
  interpretAnionGap,
  interpretRassScore,
  interpretShockIndex,
} from './nextWaveCalculatorUtils';

describe('next-wave calculator utilities', () => {
  it('calculates and interprets Shock Index', () => {
    expect(calculateShockIndex({ heartRate: 120, systolicBp: 100 })).toBe(1.2);
    expect(interpretShockIndex(1.2)?.severity).toBe('critical');
    expect(interpretShockIndex(0.65)?.riskCategory).toBe('not_elevated');
  });

  it('calculates anion gap with optional albumin correction', () => {
    expect(calculateAnionGap({ sodium: 140, chloride: 104, bicarbonate: 24 })).toEqual({
      anionGap: 12,
      correctedAnionGap: null,
    });
    expect(
      calculateAnionGap({ sodium: 140, chloride: 100, bicarbonate: 18, albumin: 2.4 }),
    ).toEqual({
      anionGap: 22,
      correctedAnionGap: 26,
    });
    expect(interpretAnionGap(26)?.riskCategory).toBe('high');
  });

  it('interprets RASS levels without treatment directives', () => {
    expect(interpretRassScore(0)?.severity).toBe('normal');
    expect(interpretRassScore(3)?.riskCategory).toBe('agitated');
    expect(interpretRassScore(-5)?.riskCategory).toBe('deep_sedation');
  });
});
