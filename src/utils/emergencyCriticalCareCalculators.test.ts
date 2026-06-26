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
    expect(interpretGcsScore(8).riskCategory).toBe('severe');
    expect(interpretGcsScore(12).riskCategory).toBe('moderate');
    expect(interpretGcsScore(15).riskCategory).toBe('mild');
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
    expect(score.total).toBe(14);
    expect(score.gcsContribution).toBe(5);
    expect(score.renalAdjustment).toBe(2);
    expect(interpretApacheIIScore(31).riskCategory).toBe('very_high');
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
    expect(rts.gcsCode).toBe(4);
    expect(rts.sbpCode).toBe(4);
    expect(rts.rrCode).toBe(4);
    expect(rts.weighted).toBe(7.8408);
    expect(interpretRevisedTraumaScore(7.8408).riskCategory).toBe('maximal');
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
    expect(interpretPewsScore(2).riskCategory).toBe('low');
    expect(interpretPewsScore(3).riskCategory).toBe('medium');
    expect(interpretPewsScore(4).warnings.join(' ')).toMatch(/Pediatric caution/i);
  });
});
