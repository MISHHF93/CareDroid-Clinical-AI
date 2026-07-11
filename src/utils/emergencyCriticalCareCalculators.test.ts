import { describe, expect, it } from 'vitest';
import {
  calculateApacheIIScore,
  calculateCurb65Score,
  calculateGcsScore,
  calculatePewsScore,
  computeMewsBreakdown,
  computeRevisedTraumaScore,
  interpretApacheIIScore,
  interpretCurb65Score,
  interpretGcsScore,
  interpretMewsScore,
  interpretPewsScore,
  interpretRevisedTraumaScore,
  sumMewsScore,
  validateApacheIIInputs,
  validateMewsInputs,
  validateRtsInputs,
} from './emergencyCriticalCareCalculators';

describe('emergency critical care calculators', () => {
  it('scores and interprets GCS', () => {
    const score = calculateGcsScore({ eye: 4, verbal: 5, motor: 6 });
    expect(score).toBe(15);
    const gcs8 = interpretGcsScore(8);
    const gcs12 = interpretGcsScore(12);
    const gcs15 = interpretGcsScore(15);
    if (!gcs8 || !gcs12 || !gcs15) throw new Error('expected interpretGcsScore to return a result');
    expect(gcs8.riskCategory).toBe('severe');
    expect(gcs12.riskCategory).toBe('moderate');
    expect(gcs15.riskCategory).toBe('mild');
  });

  it('scores CURB-65 criteria and interpretation ranges', () => {
    expect(
      calculateCurb65Score({
        confusion: true,
        urea: true,
        respiratoryRate: false,
        bloodPressure: false,
        age65: false,
      })
    ).toBe(2);
    expect(interpretCurb65Score(1).riskCategory).toBe('low');
    expect(interpretCurb65Score(2).riskCategory).toBe('moderate');
    expect(interpretCurb65Score(4).riskCategory).toBe('high');
  });

  it('validates and scores APACHE II point bands', () => {
    const inputs = {
      temperature: 0,
      map: 0,
      heartRate: 0,
      respiratoryRate: 0,
      oxygenation: 0,
      acidBase: 0,
      sodium: 0,
      potassium: 0,
      creatinine: 2,
      hematocrit: 0,
      wbc: 0,
      age: 5,
      chronicHealth: 0,
      gcs: 10,
      acuteRenalFailure: true,
    };
    expect(validateApacheIIInputs(inputs).ok).toBe(true);
    const score = calculateApacheIIScore(inputs);
    if (!score) throw new Error('expected calculateApacheIIScore to return a result');
    expect(score.total).toBe(14);
    expect(score.gcsContribution).toBe(5);
    expect(score.renalAdjustment).toBe(2);
    const apacheInterp = interpretApacheIIScore(31);
    if (!apacheInterp) throw new Error('expected interpretApacheIIScore to return a result');
    expect(apacheInterp.riskCategory).toBe('very_high');
  });

  it('validates MEWS required fields and computes score ranges', () => {
    expect(validateMewsInputs({ respiratoryRate: '', heartRate: '', systolicBp: '', temperature: '', avpu: '' }).ok).toBe(false);
    const breakdown = computeMewsBreakdown({
      respiratoryRate: 32,
      heartRate: 120,
      systolicBp: 90,
      temperature: 39,
      avpu: 1,
    });
    expect(sumMewsScore(breakdown)).toBe(9);
    expect(interpretMewsScore(2).riskCategory).toBe('low');
    expect(interpretMewsScore(3).riskCategory).toBe('medium');
    expect(interpretMewsScore(5).riskCategory).toBe('high');
  });

  it('validates and computes Revised Trauma Score', () => {
    expect(validateRtsInputs({ gcs: 16, systolicBp: 120, respiratoryRate: 18 }).ok).toBe(false);
    const rts = computeRevisedTraumaScore({ gcs: 15, systolicBp: 120, respiratoryRate: 18 });
    if (!rts) throw new Error('expected computeRevisedTraumaScore to return a result');
    expect(rts.gcsCode).toBe(4);
    expect(rts.sbpCode).toBe(4);
    expect(rts.rrCode).toBe(4);
    expect(rts.weighted).toBe(7.8408);
    const rtsInterp = interpretRevisedTraumaScore(7.8408);
    if (!rtsInterp) throw new Error('expected interpretRevisedTraumaScore to return a result');
    expect(rtsInterp.riskCategory).toBe('maximal');
  });

  it('scores PEWS and exposes pediatric interpretation', () => {
    expect(
      calculatePewsScore({
        behavior: 1,
        cardiovascular: 2,
        respiratory: 1,
        nebulizer: 0,
        vomiting: 0,
      })
    ).toBe(4);
    const pews2 = interpretPewsScore(2);
    const pews3 = interpretPewsScore(3);
    const pews4 = interpretPewsScore(4);
    if (!pews2 || !pews3 || !pews4) throw new Error('expected interpretPewsScore to return a result');
    expect(pews2.riskCategory).toBe('low');
    expect(pews3.riskCategory).toBe('medium');
    expect(pews4.warnings.join(' ')).toMatch(/Pediatric caution/i);
  });
});
