import { describe, it, expect } from 'vitest';
import {
  categorizeAscvdTenYearRisk,
  computeAscvdPceResult,
  computeAscvdPceTenYearRisk,
  interpretAscvdTenYearRisk,
  validateAscvdPceInputs,
  cholesterolMmolLToMgDl,
} from './ascvdPceCalculator';

/** Table A demo profile (Goff et al., Circulation 2014). */
const TABLE_A_DEMO = {
  ageYears: 55,
  totalCholesterol: 213,
  hdlCholesterol: 50,
  cholesterolUnit: 'mg_dl',
  systolicBpMmHg: 120,
  onHypertensionTreatment: false,
  diabetes: false,
  smoker: false,
};

describe('ascvdPceCalculator — PCE formula (Table A)', () => {
  it('matches ACC/AHA Table A examples for all race×sex cohorts', () => {
    const expected = [
      { sex: 'female', race: 'white', pct: 2.1 },
      { sex: 'male', race: 'white', pct: 5.3 },
      { sex: 'female', race: 'african_american', pct: 3.0 },
      { sex: 'male', race: 'african_american', pct: 6.1 },
    ];
    for (const row of expected) {
      const r = computeAscvdPceTenYearRisk({ ...TABLE_A_DEMO, sex: row.sex, race: row.race });
      expect(r.tenYearRiskPct).toBeCloseTo(row.pct, 0);
    }
  });

  it('uses White coefficients for other race', () => {
    const white = computeAscvdPceTenYearRisk({
      ...TABLE_A_DEMO,
      sex: 'female',
      race: 'white',
    });
    const other = computeAscvdPceTenYearRisk({
      ...TABLE_A_DEMO,
      sex: 'female',
      race: 'other',
    });
    expect(other.tenYearRiskPct).toBeCloseTo(white.tenYearRiskPct, 5);
    expect(other.usesOtherRaceWhiteCoefficients).toBe(true);
  });
});

describe('ascvdPceCalculator — risk categories', () => {
  it('maps boundary values per ACC risk bands', () => {
    expect(categorizeAscvdTenYearRisk(4.9)).toBe('low');
    expect(categorizeAscvdTenYearRisk(5)).toBe('borderline');
    expect(categorizeAscvdTenYearRisk(7.4)).toBe('borderline');
    expect(categorizeAscvdTenYearRisk(7.5)).toBe('intermediate');
    expect(categorizeAscvdTenYearRisk(19.9)).toBe('intermediate');
    expect(categorizeAscvdTenYearRisk(20)).toBe('high');
  });
});

describe('ascvdPceCalculator — validation', () => {
  it('rejects out-of-range age and implausible lipids', () => {
    const age = validateAscvdPceInputs({ ...TABLE_A_DEMO, ageYears: 35, sex: 'male', race: 'white' });
    expect(age.valid).toBe(false);
    expect(age.errors.some((e) => /40/.test(e))).toBe(true);

    const hdl = validateAscvdPceInputs({
      ...TABLE_A_DEMO,
      sex: 'male',
      race: 'white',
      totalCholesterol: 150,
      hdlCholesterol: 200,
    });
    expect(hdl.valid).toBe(false);
  });

  it('accepts mmol/L cholesterol with unit conversion', () => {
    const v = validateAscvdPceInputs({
      ageYears: 55,
      sex: 'male',
      race: 'white',
      totalCholesterol: 5.5,
      hdlCholesterol: 1.3,
      cholesterolUnit: 'mmol_l',
      systolicBpMmHg: 120,
      onHypertensionTreatment: false,
      diabetes: false,
      smoker: false,
    });
    expect(v.valid).toBe(true);
    if (!v.inputs) throw new Error('expected validateAscvdPceInputs to return inputs');
    expect(v.inputs.totalCholesterol).toBeCloseTo(cholesterolMmolLToMgDl(5.5), 0);
  });
});

describe('ascvdPceCalculator — interpretation', () => {
  it('includes clinician disclaimer and avoids treatment directives', () => {
    const out = computeAscvdPceResult({ ...TABLE_A_DEMO, sex: 'male', race: 'white' });
    expect(out.ok).toBe(true);
    if (!out.ok) throw new Error('expected computeAscvdPceResult to succeed');
    expect(out.clinicianPatientDisclaimer).toBe(
      'Use as decision-support for clinician-patient discussions.'
    );
    expect(out.preventionDiscussion).toBeTruthy();
    expect(out.preventionDiscussion.toLowerCase()).not.toMatch(/\b(start|prescribe|statin dose)\b/);
    if (!out.pathwayDisclaimer) throw new Error('expected out.pathwayDisclaimer to be defined');
    expect(out.pathwayDisclaimer.toLowerCase()).not.toMatch(/\bprescribe\b/);
  });

  it('returns prevention discussion for each risk category', () => {
    for (const pct of [3, 6, 12, 25]) {
      const i = interpretAscvdTenYearRisk(pct);
      if (!i) throw new Error('expected interpretAscvdTenYearRisk to return a result');
      expect(i.preventionDiscussion).toBeTruthy();
      expect(i.preventionDiscussion.toLowerCase()).not.toMatch(/\bprescribe\b/);
      expect(i.riskCategory).toBe(categorizeAscvdTenYearRisk(pct));
    }
  });

  it('returns null interpretation for non-finite risk', () => {
    expect(interpretAscvdTenYearRisk(Number.NaN)).toBeNull();
    expect(categorizeAscvdTenYearRisk(Number.NaN)).toBeNull();
  });
});

describe('ascvdPceCalculator — clinical edge cases', () => {
  const maleWhite = { ...TABLE_A_DEMO, sex: 'male', race: 'white' };

  it('increases estimated risk with smoking and diabetes', () => {
    const baseline = computeAscvdPceTenYearRisk(maleWhite);
    const smoker = computeAscvdPceTenYearRisk({ ...maleWhite, smoker: true });
    const diabetic = computeAscvdPceTenYearRisk({ ...maleWhite, diabetes: true });
    expect(smoker.tenYearRiskPct).toBeGreaterThan(baseline.tenYearRiskPct);
    expect(diabetic.tenYearRiskPct).toBeGreaterThan(baseline.tenYearRiskPct);
  });

  it('clamps risk percentage to 0–100', () => {
    const extreme = computeAscvdPceTenYearRisk({
      ageYears: 79,
      sex: 'male',
      race: 'white',
      totalCholesterol: 400,
      hdlCholesterol: 30,
      cholesterolUnit: 'mg_dl',
      systolicBpMmHg: 200,
      onHypertensionTreatment: true,
      diabetes: true,
      smoker: true,
    });
    expect(extreme.tenYearRiskPct).toBeGreaterThanOrEqual(0);
    expect(extreme.tenYearRiskPct).toBeLessThanOrEqual(100);
  });

  it('rejects age 79 vs 80 boundary and missing sex', () => {
    const ok79 = validateAscvdPceInputs({ ...maleWhite, ageYears: 79 });
    expect(ok79.valid).toBe(true);
    const bad80 = validateAscvdPceInputs({ ...maleWhite, ageYears: 80 });
    expect(bad80.valid).toBe(false);

    const noSex = validateAscvdPceInputs({ ...maleWhite, sex: '' });
    expect(noSex.valid).toBe(false);
  });

  it('computeAscvdPceResult returns structured errors when validation fails', () => {
    const out = computeAscvdPceResult({ ...maleWhite, ageYears: 25 });
    expect(out.ok).toBe(false);
    if (out.ok) throw new Error('expected computeAscvdPceResult to fail');
    expect(Array.isArray(out.errors)).toBe(true);
    expect(out.errors.length).toBeGreaterThan(0);
  });
});
