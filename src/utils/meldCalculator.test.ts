import { describe, it, expect } from 'vitest';
import {
  applyMeldLabClamps,
  calculateMeldNaScore,
  calculateMeldScore,
  clampMeldSodiumMmolL,
  computeMeldResult,
  formatMeldLabValue,
  creatinineUmolLToMgDl,
  interpretMeldScores,
  meldLabsFromInputs,
  validateMeldInputs,
} from './meldCalculator';

describe('meldCalculator', () => {
  it('floors bilirubin, INR, and creatinine at 1.0 mg/dL equivalent', () => {
    const c = applyMeldLabClamps({ bilirubinMgDl: 0.5, inr: 0.9, creatinineMgDl: 0.4, onDialysis: false });
    expect(c.bilirubinMgDl).toBe(1);
    expect(c.inr).toBe(1);
    expect(c.creatinineMgDl).toBe(1);
  });

  it('caps creatinine at 4.0 and uses 4.0 on dialysis', () => {
    expect(applyMeldLabClamps({ bilirubinMgDl: 2, inr: 1.2, creatinineMgDl: 8, onDialysis: false }).creatinineMgDl).toBe(
      4
    );
    expect(
      applyMeldLabClamps({ bilirubinMgDl: 2, inr: 1.2, creatinineMgDl: 1.5, onDialysis: true }).creatinineMgDl
    ).toBe(4);
  });

  it('calculates baseline MELD for minimum labs (score 6)', () => {
    expect(calculateMeldScore({ bilirubinMgDl: 1, inr: 1, creatinineMgDl: 1, onDialysis: false })).toBe(6);
  });

  it('increases MELD with worsening labs', () => {
    const low = calculateMeldScore({ bilirubinMgDl: 1, inr: 1, creatinineMgDl: 1, onDialysis: false });
    const high = calculateMeldScore({ bilirubinMgDl: 3, inr: 2, creatinineMgDl: 3, onDialysis: false });
    if (low === null || high === null) throw new Error('expected calculateMeldScore to return a number');
    expect(high).toBeGreaterThan(low);
    expect(high).toBeLessThanOrEqual(40);
  });

  it('clamps sodium to 125–140 for MELD-Na', () => {
    expect(clampMeldSodiumMmolL(110)).toBe(125);
    expect(clampMeldSodiumMmolL(150)).toBe(140);
    expect(clampMeldSodiumMmolL(132)).toBe(132);
  });

  it('raises MELD-Na above laboratory MELD when sodium is low', () => {
    const meld = 30;
    const meldNa = calculateMeldNaScore(meld, 125);
    expect(meldNa).toBeGreaterThan(meld);
    expect(meldNa).toBeLessThanOrEqual(40);
  });

  it('does not let MELD-Na fall below laboratory MELD', () => {
    const meld = 25;
    const meldNa = calculateMeldNaScore(meld, 140);
    expect(meldNa).toBeGreaterThanOrEqual(meld);
  });

  it('applies MELD floor of 11 before sodium adjustment when laboratory MELD < 11', () => {
    const meld = 8;
    const meldNa = calculateMeldNaScore(meld, 125);
    expect(meldNa).toBeGreaterThanOrEqual(11);
  });

  it('converts creatinine μmol/L to mg/dL', () => {
    expect(creatinineUmolLToMgDl(88.4)).toBeCloseTo(1, 5);
  });

  it('computeMeldResult returns MELD-Na when sodium provided', () => {
    const r = computeMeldResult(
      {
        bilirubin: '2',
        bilirubinUnit: 'mg_dl',
        inr: '1.5',
        creatinine: '1.2',
        creatinineUnit: 'mg_dl',
        onDialysis: false,
        sodium: '125',
      },
      { includeMeldNa: true }
    );
    expect(r.ok).toBe(true);
    if (!r.ok) throw new Error('expected computeMeldResult to succeed');
    expect(r.meld).toBeTypeOf('number');
    expect(r.meldNa).toBeTypeOf('number');
    expect(r.meldNa).toBeGreaterThanOrEqual(r.meld);
  });

  it('validateMeldInputs requires sodium when MELD-Na mode', () => {
    const v = validateMeldInputs(
      {
        bilirubin: '1',
        bilirubinUnit: 'mg_dl',
        inr: '1',
        creatinine: '1',
        creatinineUnit: 'mg_dl',
        onDialysis: false,
      },
      { requireSodium: true }
    );
    expect(v.ok).toBe(false);
    expect(v.errors.some((e) => e.includes('sodium'))).toBe(true);
  });

  it('interpretMeldScores includes transplant disclaimer and no listing language', () => {
    // Second param is inferred as `null | undefined` from its `= null` default in the
    // implementation; cast the deliberately non-null test value to match.
    const i = interpretMeldScores(32, 34 as any);
    if (!i) throw new Error('expected interpretMeldScores to return a result');
    expect(i.transplantDisclaimer).toMatch(/does not recommend transplant/i);
    expect(i.interpretation).not.toMatch(/list for transplant/i);
  });

  it('formatMeldLabValue returns em dash for non-finite values', () => {
    expect(formatMeldLabValue(Number.NaN)).toBe('—');
    expect(formatMeldLabValue(1.234)).toBe('1.23');
  });

  it('validateMeldInputs rejects non-numeric bilirubin', () => {
    const v = validateMeldInputs({
      bilirubin: 'abc',
      bilirubinUnit: 'mg_dl',
      inr: '1',
      creatinine: '1',
      creatinineUnit: 'mg_dl',
      onDialysis: false,
    });
    expect(v.ok).toBe(false);
    expect(v.errors.some((e) => e.includes('valid'))).toBe(true);
  });

  it('meldLabsFromInputs converts bilirubin μmol/L', () => {
    const labs = meldLabsFromInputs({
      bilirubin: '17.104',
      bilirubinUnit: 'umol_l',
      inr: '1',
      creatinine: '1',
      creatinineUnit: 'mg_dl',
      onDialysis: false,
    });
    expect(labs.bilirubinMgDl).toBeCloseTo(1, 2);
  });

  it('matches a known MELD score for fixed laboratory inputs (formula regression)', () => {
    const score = calculateMeldScore({
      bilirubinMgDl: 2,
      inr: 1.5,
      creatinineMgDl: 1.2,
      onDialysis: false,
    });
    expect(score).toBe(15);
  });

  it('matches UNOS MELD-Na adjustment for laboratory MELD 15 and sodium 125', () => {
    const meld = 15;
    const meldNa = calculateMeldNaScore(meld, 125);
    expect(meldNa).toBe(25);
    expect(meldNa).toBeGreaterThanOrEqual(meld);
  });

  it('clamps entered sodium above 140 before MELD-Na formula', () => {
    const meld = 20;
    const meldNaAt140 = calculateMeldNaScore(meld, 140);
    const meldNaAt150 = calculateMeldNaScore(meld, 150);
    expect(meldNaAt150).toBe(meldNaAt140);
  });

  it('treats low creatinine the same as creatinine floored to 1.0 mg/dL', () => {
    const low = calculateMeldScore({
      bilirubinMgDl: 1,
      inr: 1,
      creatinineMgDl: 0.3,
      onDialysis: false,
    });
    const floored = calculateMeldScore({
      bilirubinMgDl: 1,
      inr: 1,
      creatinineMgDl: 1,
      onDialysis: false,
    });
    expect(low).toBe(floored);
    expect(low).toBe(6);
  });

  it('applies dialysis creatinine rule via computeMeldResult (UNOS 4.0 mg/dL)', () => {
    const base = {
      bilirubin: '2',
      bilirubinUnit: 'mg_dl',
      inr: '1.5',
      creatinineUnit: 'mg_dl',
    };
    const lowCrNoDialysis = computeMeldResult({
      ...base,
      creatinine: '0.5',
      onDialysis: false,
    });
    const lowCrDialysis = computeMeldResult({
      ...base,
      creatinine: '0.5',
      onDialysis: true,
    });
    const crFour = computeMeldResult({
      ...base,
      creatinine: '4',
      onDialysis: false,
    });
    expect(lowCrNoDialysis.ok).toBe(true);
    expect(lowCrDialysis.ok).toBe(true);
    expect(crFour.ok).toBe(true);
    if (!lowCrDialysis.ok || !crFour.ok) throw new Error('expected computeMeldResult calls to succeed');
    expect(lowCrDialysis.meld).toBe(crFour.meld);
    expect(lowCrDialysis.clamped?.creatinineMgDl).toBe(4);
  });

  it('raises MELD-Na above laboratory MELD when hyponatremia is entered', () => {
    const out = computeMeldResult(
      {
        bilirubin: '2',
        bilirubinUnit: 'mg_dl',
        inr: '1.5',
        creatinine: '1.2',
        creatinineUnit: 'mg_dl',
        onDialysis: false,
        sodium: '125',
      },
      { includeMeldNa: true }
    );
    expect(out.ok).toBe(true);
    if (!out.ok) throw new Error('expected computeMeldResult to succeed');
    expect(out.meldNa).toBeGreaterThan(out.meld);
    expect(out.sodiumUsed).toBe(125);
  });

  it('computeMeldResult returns ok:false without throwing on invalid input', () => {
    const out = computeMeldResult({
      bilirubin: '',
      bilirubinUnit: 'mg_dl',
      inr: '',
      creatinine: '',
      creatinineUnit: 'mg_dl',
      onDialysis: false,
    });
    expect(out.ok).toBe(false);
    expect(Array.isArray(out.errors)).toBe(true);
    // Deliberately checking that the failure branch carries no `meld` field.
    expect((out as { meld?: number }).meld).toBeUndefined();
  });

  it('clamps MELD score to the 6–40 range for extreme laboratory values', () => {
    const veryHigh = calculateMeldScore({
      bilirubinMgDl: 4,
      inr: 3,
      creatinineMgDl: 4,
      onDialysis: false,
    });
    expect(veryHigh).toBeGreaterThanOrEqual(6);
    expect(veryHigh).toBeLessThanOrEqual(40);
    expect(veryHigh).toBeGreaterThan(30);
  });
});
