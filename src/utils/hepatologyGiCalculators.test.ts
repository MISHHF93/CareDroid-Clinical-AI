import { describe, expect, it } from 'vitest';
import {
  calculateApri,
  calculateGlasgowBlatchfordScore,
  calculateMaddreyDiscriminantFunction,
  calculateRockallScore,
  interpretApri,
  interpretGlasgowBlatchford,
  interpretMaddreyDf,
  interpretRockall,
  parseBilirubinMgDl,
  parseBunMmolL,
  parseHemoglobinGDl,
} from './hepatologyGiCalculators';

describe('hepatology/GI calculator utilities', () => {
  it('calculates Maddrey DF with bilirubin unit conversion', () => {
    expect(parseBilirubinMgDl(171.04, 'umol_l')).toBeCloseTo(10, 2);
    const score = calculateMaddreyDiscriminantFunction({
      patientPtSeconds: 20,
      controlPtSeconds: 12,
      bilirubinMgDl: 15,
    });
    expect(score).toBe(51.8);
    expect(interpretMaddreyDf(score)?.severity).toBe('critical');
    expect(interpretMaddreyDf(score)?.interpretation).toMatch(/does not recommend/i);
  });

  it('calculates APRI from AST, AST ULN, and platelets', () => {
    const apri = calculateApri({
      astUPerL: 80,
      astUpperLimitUPerL: 40,
      platelets10e9PerL: 100,
    });
    expect(apri).toBe(2);
    expect(interpretApri(apri)?.severity).toBe('critical');
    expect(interpretApri(0.4)?.severity).toBe('normal');
  });

  it('calculates Glasgow-Blatchford Score with BUN and hemoglobin unit conversions', () => {
    expect(parseBunMmolL(28.01, 'mg_dl')).toBeCloseTo(10, 2);
    expect(parseHemoglobinGDl(90, 'g_l')).toBe(9);

    const result = calculateGlasgowBlatchfordScore({
      bun: 84.03,
      bunUnit: 'mg_dl',
      hemoglobin: 90,
      hemoglobinUnit: 'g_l',
      sex: 'male',
      systolicBpMmHg: 85,
      pulseAtLeast100: true,
      melena: true,
      syncope: true,
      hepaticDisease: true,
      cardiacFailure: true,
    });

    expect(result?.total).toBe(23);
    expect(interpretGlasgowBlatchford(result.total)?.severity).toBe('critical');
    expect(interpretGlasgowBlatchford(0)?.label).toBe('GBS 0');
  });

  it('calculates full Rockall score from clinical and endoscopic components', () => {
    const result = calculateRockallScore({
      agePoints: 2,
      shockPoints: 2,
      comorbidityPoints: 3,
      diagnosisPoints: 2,
      stigmataPoints: 2,
    });
    expect(result?.total).toBe(11);
    expect(interpretRockall(result.total)?.severity).toBe('critical');
    expect(interpretRockall(1)?.severity).toBe('normal');
  });
});
