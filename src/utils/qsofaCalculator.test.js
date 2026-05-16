import { describe, it, expect } from 'vitest';
import {
  calculateQsofaScore,
  interpretQsofaScore,
  qsofaCriteriaFromInputs,
  validateQsofaInputs,
} from './qsofaCalculator';

describe('qsofaCalculator', () => {
  it('calculateQsofaScore counts three binary criteria', () => {
    expect(
      calculateQsofaScore({
        respiratoryRateGte22: true,
        systolicBpLte100: false,
        alteredMentationOrGcsLt15: false,
      })
    ).toBe(1);
    expect(
      calculateQsofaScore({
        respiratoryRateGte22: true,
        systolicBpLte100: true,
        alteredMentationOrGcsLt15: true,
      })
    ).toBe(3);
    expect(
      calculateQsofaScore({
        respiratoryRateGte22: false,
        systolicBpLte100: false,
        alteredMentationOrGcsLt15: false,
      })
    ).toBe(0);
  });

  it('qsofaCriteriaFromInputs applies RR ≥22, SBP ≤100, GCS<15', () => {
    const c = qsofaCriteriaFromInputs({
      respiratoryRate: 23,
      systolicBloodPressure: 99,
      alteredMentation: false,
      gcs: 14,
    });
    expect(c.respiratoryRateGte22).toBe(true);
    expect(c.systolicBpLte100).toBe(true);
    expect(c.alteredMentationOrGcsLt15).toBe(true);
    expect(calculateQsofaScore(c)).toBe(3);
  });

  it('altered mentation alone satisfies third criterion without GCS', () => {
    const c = qsofaCriteriaFromInputs({
      respiratoryRate: 18,
      systolicBloodPressure: 110,
      alteredMentation: true,
      gcs: '',
    });
    expect(c.respiratoryRateGte22).toBe(false);
    expect(c.systolicBpLte100).toBe(false);
    expect(c.alteredMentationOrGcsLt15).toBe(true);
    expect(calculateQsofaScore(c)).toBe(1);
  });

  it('interpretQsofaScore flags ≥2 as elevated risk wording', () => {
    const two = interpretQsofaScore(2);
    expect(two.severity).toBe('critical');
    expect(two.interpretation.toLowerCase()).toContain('≥2');
    expect(two.interpretation).toMatch(/not diagnostic/i);
    expect(interpretQsofaScore(3).severity).toBe('critical');
    expect(interpretQsofaScore(0).severity).toBe('normal');
  });

  it('validateQsofaInputs requires RR, SBP, and mentation or GCS', () => {
    expect(
      validateQsofaInputs({
        respiratoryRate: '',
        systolicBloodPressure: '100',
        alteredMentation: false,
        gcs: '',
      }).ok
    ).toBe(false);
    expect(
      validateQsofaInputs({
        respiratoryRate: '20',
        systolicBloodPressure: '110',
        alteredMentation: true,
        gcs: '',
      }).ok
    ).toBe(true);
    expect(
      validateQsofaInputs({
        respiratoryRate: '20',
        systolicBloodPressure: '110',
        alteredMentation: false,
        gcs: '10',
      }).ok
    ).toBe(true);
  });

  it('enumerates all eight qSOFA score permutations from boolean criteria', () => {
    const bits = [false, true];
    for (const rr of bits) {
      for (const sbp of bits) {
        for (const ment of bits) {
          const expected = (rr ? 1 : 0) + (sbp ? 1 : 0) + (ment ? 1 : 0);
          expect(
            calculateQsofaScore({
              respiratoryRateGte22: rr,
              systolicBpLte100: sbp,
              alteredMentationOrGcsLt15: ment,
            })
          ).toBe(expected);
        }
      }
    }
  });

  it('interpretQsofaScore distinguishes 0, 1, and ≥2 for severity bands', () => {
    expect(interpretQsofaScore(0).severity).toBe('normal');
    expect(interpretQsofaScore(1).severity).toBe('normal');
    expect(interpretQsofaScore(2).severity).toBe('critical');
    expect(interpretQsofaScore(3).severity).toBe('critical');
  });

  it('qsofaCriteriaFromInputs uses inclusive RR ≥22 and SBP ≤100 boundaries', () => {
    expect(qsofaCriteriaFromInputs({ respiratoryRate: 21, systolicBloodPressure: 120, alteredMentation: false, gcs: '' }).respiratoryRateGte22).toBe(false);
    expect(qsofaCriteriaFromInputs({ respiratoryRate: 22, systolicBloodPressure: 120, alteredMentation: false, gcs: '' }).respiratoryRateGte22).toBe(true);
    expect(qsofaCriteriaFromInputs({ respiratoryRate: 18, systolicBloodPressure: 101, alteredMentation: false, gcs: '' }).systolicBpLte100).toBe(false);
    expect(qsofaCriteriaFromInputs({ respiratoryRate: 18, systolicBloodPressure: 100, alteredMentation: false, gcs: '' }).systolicBpLte100).toBe(true);
  });

  it('validateQsofaInputs rejects out-of-range vitals and invalid optional GCS', () => {
    const rrHigh = validateQsofaInputs({
      respiratoryRate: '121',
      systolicBloodPressure: '110',
      alteredMentation: true,
      gcs: '',
    });
    expect(rrHigh.ok).toBe(false);
    expect(rrHigh.errors.some((e) => /respiratory/i.test(e))).toBe(true);

    const gcsBad = validateQsofaInputs({
      respiratoryRate: '18',
      systolicBloodPressure: '120',
      alteredMentation: false,
      gcs: '2',
    });
    expect(gcsBad.ok).toBe(false);
    expect(gcsBad.errors.some((e) => /gcs/i.test(e))).toBe(true);
  });
});
