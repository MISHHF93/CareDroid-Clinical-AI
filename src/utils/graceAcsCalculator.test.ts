import { describe, it, expect } from 'vitest';
import {
  categorizeSixMonthMortalityPct,
  computeGraceAcsRisk,
  creatinineUmolLToMgDl,
  interpretGraceAcsRisk,
  logisticProbability,
  validateGraceAcsInputs,
} from './graceAcsCalculator';

describe('graceAcsCalculator', () => {
  const baseline = {
    ageYears: 65,
    heartRateBpm: 80,
    systolicBpMmHg: 120,
    creatinineMgDl: 1.0,
    killipClass: 'I',
    cardiacArrestAtAdmission: false,
    stSegmentDeviation: false,
    elevatedCardiacEnzymes: false,
  };

  it('converts creatinine µmol/L to mg/dL', () => {
    expect(creatinineUmolLToMgDl(88.4)).toBeCloseTo(1, 4);
  });

  it('computes logistic probability', () => {
    expect(logisticProbability(0)).toBeCloseTo(0.5, 6);
    expect(logisticProbability(-10)).toBeLessThan(0.001);
  });

  it('validates required inputs', () => {
    expect(validateGraceAcsInputs(baseline).valid).toBe(true);
    expect(validateGraceAcsInputs({ ...baseline, killipClass: 'V' }).valid).toBe(false);
    expect(validateGraceAcsInputs({ ...baseline, ageYears: 10 }).valid).toBe(false);
  });

  it('returns low 6-month risk for favorable baseline profile', () => {
    const result = computeGraceAcsRisk(baseline);
    expect(result.sixMonthMortalityPct).toBeLessThan(3);
    expect(result.sixMonthRiskCategory).toBe('low');
    expect(result.inHospitalMortalityPct).toBeGreaterThan(0);
    expect(result.inHospitalMortalityPct).toBeLessThan(100);
  });

  it('returns high 6-month risk when high-risk features present', () => {
    const result = computeGraceAcsRisk({
      ...baseline,
      ageYears: 85,
      heartRateBpm: 110,
      systolicBpMmHg: 90,
      creatinineMgDl: 2.5,
      killipClass: 'IV',
      cardiacArrestAtAdmission: true,
      stSegmentDeviation: true,
      elevatedCardiacEnzymes: true,
    });
    expect(result.sixMonthMortalityPct).toBeGreaterThan(8);
    expect(result.sixMonthRiskCategory).toBe('high');
  });

  it('categorizes mortality percentages', () => {
    expect(categorizeSixMonthMortalityPct(1)).toBe('low');
    expect(categorizeSixMonthMortalityPct(5)).toBe('intermediate');
    expect(categorizeSixMonthMortalityPct(12)).toBe('high');
  });

  it('interpretation avoids treatment directives and diagnostic certainty', () => {
    const result = computeGraceAcsRisk(baseline);
    const interp = interpretGraceAcsRisk(result);
    expect(interp.label).toMatch(/risk/i);
    expect(interp.safetyDisclaimer).toMatch(/does not confirm or exclude/i);
    expect(interp.pathwayDisclaimer).toMatch(/local acute coronary syndrome protocols/i);
    expect(interp.interpretation).not.toMatch(/recommend (antiplatelet|anticoagulation|pci|stent)/i);
  });
});
