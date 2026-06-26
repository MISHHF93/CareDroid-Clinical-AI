import { describe, it, expect } from 'vitest';
import {
  classifyAlbuminuria,
  classifyGfrCategory,
  combineCkdPrognosticRisk,
  computeCkdEpi2021Egfr,
  computeCkdStagingResult,
  creatinineUmolLToMgDl,
  interpretCkdStaging,
  prognosticRiskSeverity,
  toAcrMgG,
  validateCkdStagingInputs,
} from './ckdStagingCalculator';

describe('ckdStagingCalculator — CKD-EPI 2021', () => {
  it('computes eGFR for reference creatinine values', () => {
    expect(computeCkdEpi2021Egfr(50, 'male', 1.2)).toBe(74);
    expect(computeCkdEpi2021Egfr(35, 'female', 1.1)).toBe(67);
  });

  it('converts µmol/L creatinine to mg/dL before eGFR', () => {
    const mgDl = computeCkdEpi2021Egfr(50, 'male', 1.2);
    const fromUmol = computeCkdEpi2021Egfr(50, 'male', creatinineUmolLToMgDl(106.08));
    expect(fromUmol).toBe(mgDl);
  });
});

describe('ckdStagingCalculator — KDIGO categories', () => {
  it('classifies GFR category boundaries', () => {
    expect(classifyGfrCategory(90).category).toBe('G1');
    expect(classifyGfrCategory(89).category).toBe('G2');
    expect(classifyGfrCategory(60).category).toBe('G2');
    expect(classifyGfrCategory(59).category).toBe('G3a');
    expect(classifyGfrCategory(45).category).toBe('G3a');
    expect(classifyGfrCategory(44).category).toBe('G3b');
    expect(classifyGfrCategory(30).category).toBe('G3b');
    expect(classifyGfrCategory(29).category).toBe('G4');
    expect(classifyGfrCategory(15).category).toBe('G4');
    expect(classifyGfrCategory(14).category).toBe('G5');
  });

  it('classifies albuminuria boundaries in mg/g', () => {
    expect(classifyAlbuminuria(29).category).toBe('A1');
    expect(classifyAlbuminuria(30).category).toBe('A2');
    expect(classifyAlbuminuria(300).category).toBe('A2');
    expect(classifyAlbuminuria(301).category).toBe('A3');
  });

  it('converts mg/mmol ACR to mg/g thresholds', () => {
    expect(toAcrMgG(3, 'mg_mmol')).toBeCloseTo(26.52, 0);
    expect(classifyAlbuminuria(toAcrMgG(3.4, 'mg_mmol')).category).toBe('A2');
    expect(classifyAlbuminuria(toAcrMgG(34, 'mg_mmol')).category).toBe('A3');
  });

  it('maps KDIGO heat-map combined prognostic risk', () => {
    expect(combineCkdPrognosticRisk('G1', 'A1')).toBe('low');
    expect(combineCkdPrognosticRisk('G2', 'A3')).toBe('moderately_increased');
    expect(combineCkdPrognosticRisk('G3b', 'A3')).toBe('very_high');
    expect(combineCkdPrognosticRisk('G5', 'A1')).toBe('very_high');
  });
});

describe('ckdStagingCalculator — validation', () => {
  it('rejects invalid units and implausible values', () => {
    const bad = validateCkdStagingInputs({
      ageYears: 10,
      sex: 'male',
      serumCreatinine: 1,
      creatinineUnit: 'mg_dl',
      urineAcr: 50,
      acrUnit: 'mg_g',
    });
    expect(bad.valid).toBe(false);

    const good = validateCkdStagingInputs({
      ageYears: 55,
      sex: 'female',
      serumCreatinine: 88.4,
      creatinineUnit: 'umol_l',
      urineAcr: 3.4,
      acrUnit: 'mg_mmol',
    });
    expect(good.valid).toBe(true);
  });
});

describe('ckdStagingCalculator — full result', () => {
  it('returns eGFR, categories, combined stage, and non-prescriptive copy', () => {
    const out = computeCkdStagingResult({
      ageYears: 55,
      sex: 'male',
      serumCreatinine: 1.5,
      creatinineUnit: 'mg_dl',
      urineAcr: 45,
      acrUnit: 'mg_g',
    });
    expect(out.ok).toBe(true);
    expect(out.egfrMlMin).toBeGreaterThan(0);
    expect(out.gfrCategory).toBeTruthy();
    expect(out.albuminuriaCategory).toBe('A2');
    expect(out.combinedStage).toMatch(/^G\d/);
    expect(out.combinedStageLabel).toMatch(/G×A category/);
    expect(out.clinicianPatientDisclaimer).toBe(
      'Use as decision-support for clinician-patient discussions.'
    );
    expect(out.pathwayDisclaimer.toLowerCase()).not.toMatch(/\bprescribe\b/);
    expect(out.stagingDiscussion.toLowerCase()).not.toMatch(/\bstart (ace|arb|sglt2)\b/);
    expect(out.prognosticRisk).toBe(combineCkdPrognosticRisk(out.gfrCategory, out.albuminuriaCategory));
  });
});

describe('ckdStagingCalculator — edge cases', () => {
  it('maps prognostic severity bands for heat-map categories', () => {
    expect(prognosticRiskSeverity('low')).toBe('normal');
    expect(prognosticRiskSeverity('moderately_increased')).toBe('warning');
    expect(prognosticRiskSeverity('high')).toBe('warning');
    expect(prognosticRiskSeverity('very_high')).toBe('critical');
  });

  it('handles eGFR at G1/G2 boundary and zero ACR', () => {
    expect(classifyGfrCategory(90).category).toBe('G1');
    expect(classifyGfrCategory(89).category).toBe('G2');
    expect(classifyAlbuminuria(0).category).toBe('A1');
    const gfr = classifyGfrCategory(90);
    const alb = classifyAlbuminuria(0);
    const risk = combineCkdPrognosticRisk(gfr.category, alb.category);
    const interp = interpretCkdStaging(90, gfr, alb, risk);
    expect(interp.prognosticRisk).toBe('low');
    expect(interp.combinedStage).toBe('G1A1');
  });

  it('rejects missing sex and negative ACR', () => {
    const noSex = validateCkdStagingInputs({
      ageYears: 50,
      sex: '',
      serumCreatinine: 1.2,
      creatinineUnit: 'mg_dl',
      urineAcr: 30,
      acrUnit: 'mg_g',
    });
    expect(noSex.valid).toBe(false);

    const negAcr = validateCkdStagingInputs({
      ageYears: 50,
      sex: 'male',
      serumCreatinine: 1.2,
      creatinineUnit: 'mg_dl',
      urineAcr: -5,
      acrUnit: 'mg_g',
    });
    expect(negAcr.valid).toBe(false);
  });

  it('computeCkdStagingResult fails cleanly for invalid input object', () => {
    const out = computeCkdStagingResult(null);
    expect(out.ok).toBe(false);
    expect(out.errors?.length).toBeGreaterThan(0);
  });
});
