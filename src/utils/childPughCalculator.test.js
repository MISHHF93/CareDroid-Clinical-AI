import { describe, it, expect } from 'vitest';
import {
  bilirubinUmolLToMgDl,
  computeChildPughBreakdown,
  interpretChildPughClass,
  scoreChildPughAlbuminGdl,
  scoreChildPughAscites,
  scoreChildPughBilirubinMgDl,
  scoreChildPughEncephalopathy,
  scoreChildPughInr,
  scoreChildPughPtProlongationSec,
  sumChildPughScore,
  validateChildPughInputs,
} from './childPughCalculator';

describe('childPughCalculator', () => {
  it('scores bilirubin, albumin, INR, PT prolongation', () => {
    expect(scoreChildPughBilirubinMgDl(1)).toBe(1);
    expect(scoreChildPughBilirubinMgDl(2.5)).toBe(2);
    expect(scoreChildPughBilirubinMgDl(4)).toBe(3);

    expect(scoreChildPughAlbuminGdl(3.8)).toBe(1);
    expect(scoreChildPughAlbuminGdl(3.0)).toBe(2);
    expect(scoreChildPughAlbuminGdl(2.5)).toBe(3);

    expect(scoreChildPughInr(1.5)).toBe(1);
    expect(scoreChildPughInr(2.0)).toBe(2);
    expect(scoreChildPughInr(2.5)).toBe(3);

    expect(scoreChildPughPtProlongationSec(2)).toBe(1);
    expect(scoreChildPughPtProlongationSec(5)).toBe(2);
    expect(scoreChildPughPtProlongationSec(8)).toBe(3);
  });

  it('scores ascites and encephalopathy levels', () => {
    expect(scoreChildPughAscites('none')).toBe(1);
    expect(scoreChildPughAscites('slight')).toBe(2);
    expect(scoreChildPughAscites('moderate')).toBe(3);
    expect(scoreChildPughEncephalopathy('none')).toBe(1);
    expect(scoreChildPughEncephalopathy('grade12')).toBe(2);
    expect(scoreChildPughEncephalopathy('grade34')).toBe(3);
  });

  it('converts bilirubin μmol/L to mg/dL for scoring', () => {
    expect(bilirubinUmolLToMgDl(34.2)).toBeCloseTo(2, 2);
  });

  it('computes minimum score (class A) with INR path', () => {
    const b = computeChildPughBreakdown({
      bilirubin: '1',
      bilirubinUnit: 'mg_dl',
      albumin: '4',
      albuminUnit: 'g_dl',
      coagulationMode: 'inr',
      inr: '1.2',
      ptProlongationSec: '',
      ascites: 'none',
      encephalopathy: 'none',
    });
    expect(sumChildPughScore(b)).toBe(5);
    const interp = interpretChildPughClass(5);
    expect(interp?.childPughClass).toBe('A');
  });

  it('computes class B and C boundaries', () => {
    expect(interpretChildPughClass(6)?.childPughClass).toBe('A');
    expect(interpretChildPughClass(7)?.childPughClass).toBe('B');
    expect(interpretChildPughClass(9)?.childPughClass).toBe('B');
    expect(interpretChildPughClass(10)?.childPughClass).toBe('C');
    expect(interpretChildPughClass(15)?.childPughClass).toBe('C');
  });

  it('interpretChildPughClass assigns severity bands at class boundaries', () => {
    expect(interpretChildPughClass(5)?.severity).toBe('normal');
    expect(interpretChildPughClass(6)?.severity).toBe('normal');
    expect(interpretChildPughClass(7)?.severity).toBe('warning');
    expect(interpretChildPughClass(9)?.severity).toBe('warning');
    expect(interpretChildPughClass(10)?.severity).toBe('critical');
    expect(interpretChildPughClass(15)?.severity).toBe('critical');
  });

  it('uses PT prolongation when selected', () => {
    const b = computeChildPughBreakdown({
      bilirubin: '2',
      bilirubinUnit: 'mg_dl',
      albumin: '3',
      albuminUnit: 'g_dl',
      coagulationMode: 'pt',
      inr: '',
      ptProlongationSec: '5',
      ascites: 'slight',
      encephalopathy: 'grade12',
    });
    expect(b.coagulation).toBe(2);
    expect(sumChildPughScore(b)).toBe(10);
    expect(interpretChildPughClass(10)?.childPughClass).toBe('C');
  });

  it('returns null for out-of-range totals', () => {
    expect(interpretChildPughClass(4)).toBeNull();
    expect(interpretChildPughClass(16)).toBeNull();
  });

  it('validates inputs', () => {
    const bad = validateChildPughInputs({
      bilirubin: '',
      bilirubinUnit: 'mg_dl',
      albumin: '3.5',
      albuminUnit: 'g_dl',
      coagulationMode: 'inr',
      inr: '',
      ptProlongationSec: '',
      ascites: 'none',
      encephalopathy: 'none',
    });
    expect(bad.ok).toBe(false);

    const good = validateChildPughInputs({
      bilirubin: '20',
      bilirubinUnit: 'umol_l',
      albumin: '38',
      albuminUnit: 'g_l',
      coagulationMode: 'inr',
      inr: '1.8',
      ptProlongationSec: '',
      ascites: 'moderate',
      encephalopathy: 'grade34',
    });
    expect(good.ok).toBe(true);
  });

  it('validateChildPughInputs rejects out-of-range labs and invalid selects', () => {
    const biliMg = validateChildPughInputs({
      bilirubin: '60',
      bilirubinUnit: 'mg_dl',
      albumin: '3.5',
      albuminUnit: 'g_dl',
      coagulationMode: 'inr',
      inr: '1.2',
      ptProlongationSec: '',
      ascites: 'none',
      encephalopathy: 'none',
    });
    expect(biliMg.ok).toBe(false);

    const biliUmol = validateChildPughInputs({
      bilirubin: '2000',
      bilirubinUnit: 'umol_l',
      albumin: '35',
      albuminUnit: 'g_l',
      coagulationMode: 'inr',
      inr: '1.2',
      ptProlongationSec: '',
      ascites: 'none',
      encephalopathy: 'none',
    });
    expect(biliUmol.ok).toBe(false);

    const inrHigh = validateChildPughInputs({
      bilirubin: '1',
      bilirubinUnit: 'mg_dl',
      albumin: '3.5',
      albuminUnit: 'g_dl',
      coagulationMode: 'inr',
      inr: '20',
      ptProlongationSec: '',
      ascites: 'none',
      encephalopathy: 'none',
    });
    expect(inrHigh.ok).toBe(false);

    const badAscites = validateChildPughInputs({
      bilirubin: '1',
      bilirubinUnit: 'mg_dl',
      albumin: '3.5',
      albuminUnit: 'g_dl',
      coagulationMode: 'inr',
      inr: '1.2',
      ptProlongationSec: '',
      ascites: 'invalid-level',
      encephalopathy: 'none',
    });
    expect(badAscites.ok).toBe(false);
  });
});
