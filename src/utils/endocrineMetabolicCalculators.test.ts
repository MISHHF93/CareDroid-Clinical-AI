import { describe, expect, it } from 'vitest';
import {
  computeAdjustedBodyWeight,
  computeBmi,
  computeBsaMosteller,
  computeCorrectedCalcium,
  computeHomaIr,
  computeIdealBodyWeight,
  computeSerumOsmolality,
  computeWaistHipRatio,
} from './endocrineMetabolicCalculators';

describe('endocrineMetabolicCalculators', () => {
  it('computes HOMA-IR without insulin dosing directives', () => {
    const result = computeHomaIr({
      fastingGlucose: 90,
      glucoseUnit: 'mg_dl',
      fastingInsulinUiuMl: 10,
    });
    expect(result.ok).toBe(true);
    expect(result.homaIr).toBe(2.22);
    expect(result.disclaimer).toMatch(/does not recommend insulin or medication dosing/i);
  });

  it('computes corrected calcium and calculated osmolality', () => {
    expect(
      computeCorrectedCalcium({
        calcium: 8,
        calciumUnit: 'mg_dl',
        albumin: 2,
        albuminUnit: 'g_dl',
      }).correctedCalciumMgDl,
    ).toBe(9.6);

    expect(
      computeSerumOsmolality({
        sodium: 140,
        glucose: 90,
        glucoseUnit: 'mg_dl',
        bun: 14,
        bunUnit: 'mg_dl',
        ethanol: 0,
        ethanolUnit: 'mg_dl',
      }).calculatedOsmolality,
    ).toBe(290);
  });

  it('computes anthropometrics locally without dosing automation', () => {
    expect(
      computeBmi({
        weight: 70,
        weightUnit: 'kg',
        height: 170,
        heightUnit: 'cm',
      }).bmi,
    ).toBe(24.2);

    expect(
      computeBsaMosteller({
        weight: 70,
        weightUnit: 'kg',
        height: 170,
        heightUnit: 'cm',
      }).bsaM2,
    ).toBe(1.82);

    const ibw = computeIdealBodyWeight({ sex: 'male', height: 70, heightUnit: 'in' });
    expect(ibw.idealBodyWeightKg).toBe(73);

    const adjbw = computeAdjustedBodyWeight({
      sex: 'male',
      height: 70,
      heightUnit: 'in',
      actualWeight: 100,
      weightUnit: 'kg',
      correctionFactor: '0.4',
    });
    expect(adjbw.adjustedBodyWeightKg).toBe(83.8);
    expect(adjbw.disclaimer).toMatch(/not medication dosing automation/i);

    const whr = computeWaistHipRatio({ sex: 'female', waist: 82, hip: 100 });
    expect(whr.waistHipRatio).toBe(0.82);
    expect(whr.riskBand).toBe('moderate');
  });

  it('rejects implausible values', () => {
    const result = computeSerumOsmolality({
      sodium: 220,
      glucose: '',
      bun: -1,
      ethanol: 0,
    });
    expect(result.ok).toBe(false);
    if (!result.errors) throw new Error('expected result.errors to be defined');
    expect(result.errors.length).toBeGreaterThan(0);
  });
});
