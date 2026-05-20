import { describe, it, expect } from 'vitest';
import { calculateHeartScore, interpretHeartScore } from './heartScoreCalculator';
import { calculateCentorMcisaacScore, interpretCentorMcisaac } from './centorMcisaacCalculator';
import { calculateBishopScore, interpretBishopScore } from './bishopScoreCalculator';
import { calculateApgarScore, interpretApgarScore } from './apgarScoreCalculator';
import { calculateBradenScore, interpretBradenScore } from './bradenScaleCalculator';
import { calculateMorseFallScore, interpretMorseFallScore } from './morseFallScaleCalculator';
import { calculateRansonScore, interpretRansonScore } from './ransonCriteriaCalculator';
import { calculateBisapScore, interpretBisapScore } from './bisapScoreCalculator';
import { calculateFib4, interpretFib4 } from './fib4Calculator';
import { computeFraminghamRisk, interpretFraminghamRisk } from './framinghamRiskCalculator';

describe('PR8 calculator utilities', () => {
  it('scores HEART 0–10', () => {
    const inputs = { history: 2, ecg: 2, age: 2, riskFactors: 2, troponin: 2 };
    expect(calculateHeartScore(inputs)).toBe(10);
    expect(interpretHeartScore(10)?.severity).toBe('critical');
    expect(interpretHeartScore(2)?.severity).toBe('normal');
  });

  it('scores Centor/McIsaac with age band', () => {
    expect(
      calculateCentorMcisaacScore({
        tonsillarExudates: true,
        tenderAnteriorCervicalNodes: true,
        feverHistory: false,
        absenceOfCough: true,
        ageBand: '45_plus',
      })
    ).toBe(4);
    expect(interpretCentorMcisaac(4)?.severity).toBe('warning');
  });

  it('scores Bishop and Braden', () => {
    expect(
      calculateBishopScore({
        dilation: 3,
        effacement: 3,
        station: 3,
        consistency: 2,
        position: 2,
      })
    ).toBe(13);
    expect(interpretBishopScore(8)?.label).toMatch(/Favourable/i);
    expect(calculateBradenScore({
      sensoryPerception: 1,
      moisture: 1,
      activity: 1,
      mobility: 1,
      nutrition: 1,
      frictionShear: 1,
    })).toBe(6);
    expect(interpretBradenScore(6)?.severity).toBe('critical');
  });

  it('scores Apgar and Morse', () => {
    expect(
      calculateApgarScore({
        appearance: 2,
        pulse: 2,
        grimace: 2,
        activity: 2,
        respiration: 2,
      })
    ).toBe(10);
    expect(interpretApgarScore(10)?.severity).toBe('normal');
    expect(
      calculateMorseFallScore({
        historyOfFalling: 25,
        secondaryDiagnosis: 15,
        ambulatoryAid: 30,
        ivHeparinLock: 20,
        gait: 20,
        mentalStatus: 15,
      })
    ).toBe(125);
    expect(interpretMorseFallScore(125)?.severity).toBe('critical');
  });

  it('scores Ranson and BISAP', () => {
    expect(
      calculateRansonScore(
        { ageOver55: true, wbcOver16000: true, glucoseOver200: false, ldhOver350: false, astOver250: false },
        { hematocritDrop10: true, bunRise5: true, calciumBelow8: false, pao2Below60: false, baseDeficitOver4: false, fluidSequestration6L: false }
      )
    ).toBe(4);
    expect(interpretRansonScore(4)?.severity).toBe('warning');
    expect(
      calculateBisapScore({
        bunOver25: true,
        impairedMentalStatus: true,
        sirsPresent: true,
        ageOver60: false,
        pleuralEffusion: false,
      })
    ).toBe(3);
    expect(interpretBisapScore(3)?.severity).toBe('warning');
  });

  it('computes FIB-4 and Framingham risk', () => {
    const fib4 = calculateFib4({ ageYears: 50, astUPerL: 40, altUPerL: 30, platelets10e9PerL: 200 });
    expect(fib4).toBeGreaterThan(0);
    expect(interpretFib4(fib4, 50)?.referenceLine).toMatch(/FIB-4/i);
    const framingham = computeFraminghamRisk({
      ageYears: 55,
      sex: 'male',
      totalCholesterolMgDl: 200,
      hdlCholesterolMgDl: 45,
      systolicBpMmHg: 130,
      onHypertensionTreatment: false,
      smoker: false,
    });
    expect(framingham?.tenYearRiskPct).toBeGreaterThan(0);
    expect(interpretFraminghamRisk(framingham.tenYearRiskPct)?.referenceLine).toMatch(/coronary heart disease/i);
  });
});
