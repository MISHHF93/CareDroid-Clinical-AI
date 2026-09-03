import { describe, expect, it } from 'vitest';
import {
  PEDIATRIC_DOSING_PLACEHOLDER_DISCLAIMER,
  computeFentonGrowthChartHelper,
  computeGestationalAge,
  computeNeonatalBilirubinRiskHelper,
  computePediatricBpPercentile,
  computePediatricDoseSafetyCheckerPlaceholder,
  computePregnancyDueDate,
} from './pediatricsObgynCalculators';

describe('pediatricsObgynCalculators', () => {
  it('computes OB dating outputs with ACOG-style safety copy', () => {
    const dueDate = computePregnancyDueDate({ method: 'lmp', lmpDate: '2026-01-01' });
    expect(dueDate.edd).toBe('2026-10-08');
    expect(dueDate.disclaimer).toMatch(/OB-GYN decision support only|Pediatric and OB-GYN/i);

    const gestationalAge = computeGestationalAge({
      method: 'lmp',
      lmpDate: '2026-01-01',
      asOfDate: '2026-03-05',
    });
    expect(gestationalAge.gestationalAge.label).toBe('9w 0d');
    expect(gestationalAge.interpretation).not.toMatch(/recommend delivery|induce/i);
  });

  it('classifies pediatric BP and neonatal helpers without treatment recommendations', () => {
    const bp = computePediatricBpPercentile({
      ageYears: 10,
      sex: 'female',
      systolic: 142,
      diastolic: 92,
    });
    expect(bp.severity).toBe('critical');
    expect(bp.interpretation).toMatch(/does not diagnose hypertension/i);

    const fenton = computeFentonGrowthChartHelper({
      gestationalAgeWeeks: 34,
      weightPercentile: 8,
      lengthPercentile: 35,
      headCircumferencePercentile: 55,
    });
    expect(fenton.label).toMatch(/Small-for-gestational-age/i);
    expect(fenton.interpretation).not.toMatch(/recommend feeding|fortification/i);

    const bilirubin = computeNeonatalBilirubinRiskHelper({
      ageHours: 18,
      bilirubin: 12,
      gestationalAgeWeeks: 38,
      neurotoxicityRiskFactors: 'yes',
    });
    expect(bilirubin.severity).toBe('critical');
    expect(bilirubin.interpretation).toMatch(/does not recommend phototherapy/i);
  });

  it('blocks pediatric dose calculation in placeholder mode', () => {
    const doseSafety = computePediatricDoseSafetyCheckerPlaceholder({
      medicationName: 'antibiotic',
      weightKg: 18,
      governedProtocol: 'no',
    });
    expect(doseSafety.label).toBe('Dose calculation blocked');
    expect(doseSafety.disclaimer).toBe(PEDIATRIC_DOSING_PLACEHOLDER_DISCLAIMER);
    expect(`${doseSafety.interpretation} ${doseSafety.disclaimer}`).not.toMatch(/\d+\s*mg\/kg/i);
  });

  it('rejects invalid dating, BP, and bilirubin inputs', () => {
    expect(computePregnancyDueDate({ method: 'lmp', lmpDate: 'bad-date' }).ok).toBe(false);
    expect(
      computePediatricBpPercentile({ ageYears: 0, sex: '', systolic: '', diastolic: '' }).ok,
    ).toBe(false);
    expect(
      computeNeonatalBilirubinRiskHelper({
        ageHours: 400,
        bilirubin: 60,
        gestationalAgeWeeks: 30,
        neurotoxicityRiskFactors: '',
      }).errors.length,
    ).toBeGreaterThan(0);
  });
});
