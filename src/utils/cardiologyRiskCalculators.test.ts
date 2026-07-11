import { describe, expect, it } from 'vitest';
import {
  calculateChads2Score,
  computeDukeTreadmillScore,
  computeHcmSuddenDeathRisk,
  computeReynoldsRiskHelper,
  determineHeartFailureStage,
  interpretDukeTreadmillScore,
  interpretHcmSuddenDeathRisk,
} from './cardiologyRiskCalculators';

describe('cardiologyRiskCalculators', () => {
  it('calculates CHADS2 with prior stroke/TIA weighted as two points', () => {
    expect(
      calculateChads2Score({
        congestiveHeartFailure: true,
        hypertension: true,
        age75OrOlder: false,
        diabetes: true,
        strokeTia: true,
      })
    ).toBe(5);
  });

  it('calculates and interprets Duke treadmill score bands', () => {
    const result = computeDukeTreadmillScore({
      exerciseMinutes: 6,
      stDeviationMm: 2,
      anginaIndex: 2,
    });
    if (!result) throw new Error('expected computeDukeTreadmillScore to return a result');
    expect(result.score).toBe(-12);
    expect(interpretDukeTreadmillScore(result.score)?.severity).toBe('critical');
  });

  it('creates Reynolds helper risk categories without treatment recommendations', () => {
    const result = computeReynoldsRiskHelper({
      ageYears: 66,
      sex: 'female',
      systolicBpMmHg: 145,
      totalCholesterolMgDl: 240,
      hdlCholesterolMgDl: 40,
      hsCrpMgL: 4,
      smoker: true,
      parentalMiBefore60: true,
      diabetes: true,
      hba1cPct: 7.2,
    });
    if (!result) throw new Error('expected computeReynoldsRiskHelper to return a result');
    expect(result.riskCategory).toBe('high');
  });

  it('computes HCM Risk-SCD percentage and risk band', () => {
    const result = computeHcmSuddenDeathRisk({
      ageYears: 45,
      maxWallThicknessMm: 30,
      leftAtriumDiameterMm: 45,
      maxLvotGradientMmHg: 50,
      familyHistoryScd: true,
      nsvt: true,
      unexplainedSyncope: false,
    });
    if (!result) throw new Error('expected computeHcmSuddenDeathRisk to return a result');
    expect(result.fiveYearRiskPct).toBeGreaterThan(0);
    expect(interpretHcmSuddenDeathRisk(result.fiveYearRiskPct)).toBeTruthy();
  });

  it('prioritizes advanced heart failure stage D features', () => {
    expect(
      determineHeartFailureStage({
        riskFactors: true,
        structuralHeartDisease: true,
        currentOrPriorSymptoms: true,
        refractorySymptoms: true,
      }).stage
    ).toBe('D');
  });
});
