import { describe, expect, it } from 'vitest';
import {
  computeAaGradient,
  computeAsthmaSeverityScore,
  computeBodeIndex,
  computeCopdGoldAssessment,
  computePao2Fio2Ratio,
  computePneumoniaSeverityIndex,
  computeRoxIndex,
} from './pulmonologyCalculators';

describe('pulmonologyCalculators', () => {
  it('computes BODE Index component points', () => {
    const result = computeBodeIndex({
      bmi: 20,
      fev1PctPredicted: 34,
      sixMinuteWalkMeters: 140,
      mmrcDyspnea: 4,
    });
    expect(result.ok).toBe(true);
    expect(result.totalScore).toBe(10);
    expect(result.severity).toBe('critical');
  });

  it('classifies COPD GOLD A/B/E grouping without treatment advice', () => {
    const result = computeCopdGoldAssessment({
      mmrcGrade: 3,
      catScore: 18,
      moderateExacerbations: 2,
      severeExacerbations: 0,
      fev1PctPredicted: 45,
    });
    expect(result.group).toBe('E');
    expect(result.spirometricGrade).toBe('GOLD 3');
    expect(result.disclaimer).toMatch(/does not diagnose COPD/i);
    expect(result.disclaimer).toMatch(/recommend inhalers/i);
  });

  it('computes A-a gradient with age-adjusted comparison', () => {
    const result = computeAaGradient({
      ageYears: 60,
      fio2Pct: 21,
      pao2MmHg: 80,
      paco2MmHg: 40,
    });
    expect(result.ok).toBe(true);
    expect(result.gradient).toBeGreaterThanOrEqual(0);
    expect(result.expectedUpperLimit).toBe(19);
  });

  it('computes PaO2/FiO2 and ROX oxygenation helpers', () => {
    expect(computePao2Fio2Ratio({ pao2MmHg: 80, fio2Pct: 40 }).ratio).toBe(200);
    expect(computeRoxIndex({ spo2Pct: 96, fio2Pct: 50, respiratoryRate: 24 }).roxIndex).toBe(8);
  });

  it('scores Pneumonia Severity Index risk class', () => {
    const result = computePneumoniaSeverityIndex({
      ageYears: 82,
      sex: 'male',
      nursingHomeResident: true,
      neoplasticDisease: false,
      liverDisease: false,
      congestiveHeartFailure: true,
      cerebrovascularDisease: false,
      renalDisease: true,
      alteredMentalStatus: true,
      respiratoryRate30OrMore: true,
      systolicBpUnder90: false,
      temperatureExtreme: false,
      pulse125OrMore: true,
      phUnder735: false,
      bun30OrMore: true,
      sodiumUnder130: false,
      glucose250OrMore: false,
      hematocritUnder30: false,
      pao2Under60: false,
      pleuralEffusion: false,
    });
    expect(result.riskClass).toBe('V');
  });

  it('flags life-threatening asthma features', () => {
    const result = computeAsthmaSeverityScore({
      pefPctPersonalBest: 45,
      spo2Pct: 88,
      respiratoryRate: 32,
      silentChest: true,
      alteredMentalStatus: false,
      exhaustion: false,
      speaksWordsOnly: true,
      speaksPhrasesOnly: false,
      accessoryMuscleUse: true,
    });
    expect(result.riskBand).toBe('life_threatening');
    expect(result.disclaimer).toMatch(/does not diagnose asthma/i);
  });
});
