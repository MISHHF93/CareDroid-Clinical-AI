import { describe, expect, it } from 'vitest';
import {
  computeBunCreatinineRatio,
  computeCorrectedSodium,
  computeCreatinineClearanceCockcroftGault,
  computeEgfrCkdEpi2021,
  computeFeNa,
  computeFeUrea,
  computeFreeWaterDeficit,
  computeKfre4Variable,
  computeOsmolalGap,
} from './nephrologyCalculators';

describe('nephrologyCalculators', () => {
  it('computes race-free CKD-EPI 2021 eGFR', () => {
    const result = computeEgfrCkdEpi2021({
      ageYears: 50,
      sex: 'male',
      serumCreatinine: 1.2,
      creatinineUnit: 'mg_dl',
    });
    expect(result.ok).toBe(true);
    expect(result.egfrMlMin173).toBe(74);
    expect(result.disclaimer).toMatch(/does not automate renal medication dose adjustment/i);
  });

  it('computes Cockcroft-Gault creatinine clearance without dosing directives', () => {
    const result = computeCreatinineClearanceCockcroftGault({
      ageYears: 65,
      sex: 'female',
      weightKg: 70,
      serumCreatinine: 1.4,
      creatinineUnit: 'mg_dl',
    });
    expect(result.ok).toBe(true);
    expect(result.creatinineClearanceMlMin).toBeCloseTo(44.3, 1);
    expect(result.disclaimer).toMatch(/not medication dosing automation/i);
    expect(result.disclaimer).toMatch(/does not recommend a drug dose/i);
  });

  it('computes FeNa and FeUrea with unit validation', () => {
    const fena = computeFeNa({
      serumSodium: 140,
      urineSodium: 20,
      serumCreatinine: 2,
      serumCreatinineUnit: 'mg_dl',
      urineCreatinine: 100,
      urineCreatinineUnit: 'mg_dl',
    });
    expect(fena.fractionalExcretionPct).toBeCloseTo(0.29, 2);

    const feurea = computeFeUrea({
      bun: 40,
      bunUnit: 'mg_dl',
      urineUreaNitrogen: 400,
      urineUreaUnit: 'mg_dl',
      serumCreatinine: 2,
      serumCreatinineUnit: 'mg_dl',
      urineCreatinine: 100,
      urineCreatinineUnit: 'mg_dl',
    });
    expect(feurea.fractionalExcretionPct).toBe(20);
    expect(feurea.disclaimer).toMatch(/does not diagnose AKI etiology/i);
  });

  it('computes KFRE 2-year and 5-year risk percentages', () => {
    const result = computeKfre4Variable({
      ageYears: 70,
      sex: 'male',
      egfrMlMin173: 25,
      acrMgG: 500,
    });
    expect(result.ok).toBe(true);
    if (result.twoYearRiskPct === undefined) {
      throw new Error('expected twoYearRiskPct to be defined');
    }
    expect(result.twoYearRiskPct).toBeGreaterThan(0);
    expect(result.fiveYearRiskPct).toBeGreaterThan(result.twoYearRiskPct);
    expect(result.disclaimer).toMatch(/does not diagnose CKD/i);
  });

  it('computes BUN/Cr ratio, corrected sodium, free water deficit, and osmolal gap', () => {
    expect(
      computeBunCreatinineRatio({
        bun: 30,
        bunUnit: 'mg_dl',
        serumCreatinine: 1.5,
        creatinineUnit: 'mg_dl',
      }).ratio
    ).toBe(20);

    expect(
      computeCorrectedSodium({
        sodium: 128,
        glucose: 500,
        glucoseUnit: 'mg_dl',
        correctionFactor: '1.6',
      }).correctedSodium
    ).toBe(134.4);

    expect(
      computeFreeWaterDeficit({
        sodium: 160,
        weightKg: 70,
        tbwFactor: 0.6,
        targetSodium: 140,
      }).deficitLiters
    ).toBe(6);

    const gap = computeOsmolalGap({
      sodium: 140,
      glucose: 90,
      glucoseUnit: 'mg_dl',
      bun: 14,
      bunUnit: 'mg_dl',
      ethanol: 0,
      ethanolUnit: 'mg_dl',
      measuredOsmolality: 320,
    });
    expect(gap.calculatedOsmolality).toBe(290);
    expect(gap.osmolalGap).toBe(30);
    expect(gap.disclaimer).toMatch(/does not diagnose toxic alcohol ingestion/i);
  });

  it('rejects implausible units and values', () => {
    const result = computeOsmolalGap({
      sodium: 400,
      glucose: '',
      bun: -1,
      measuredOsmolality: 120,
    });
    expect(result.ok).toBe(false);
    if (!result.errors) {
      throw new Error('expected errors to be defined');
    }
    expect(result.errors.length).toBeGreaterThan(0);
  });
});
