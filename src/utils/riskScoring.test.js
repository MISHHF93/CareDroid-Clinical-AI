import { describe, expect, it } from 'vitest';
import { computeRiskScore, generateClinicalAlerts } from './riskScoring';

describe('riskScoring', () => {
  it('scores backend-shaped critical lab summaries', () => {
    const results = {
      summary: { critical: 2, abnormal: 4 },
      criticalValues: ['K 6.8', 'pH 7.1'],
      interpretation: 'Critical hyperkalemia with acidosis',
    };

    const risk = computeRiskScore('lab-interp', results);
    const alerts = generateClinicalAlerts('lab-interp', results, risk);

    expect(risk).toMatchObject({
      severity: 'critical',
      riskFactors: expect.arrayContaining(['2 critical lab values']),
    });
    expect(alerts).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          id: 'alert-lab-critical',
          severity: 'critical',
        }),
      ]),
    );
  });

  it('scores calculator SOFA totalScore aliases', () => {
    const risk = computeRiskScore('calculators', {
      calculator: 'sofa',
      totalScore: 14,
    });

    expect(risk).toMatchObject({
      severity: 'critical',
      riskScore: expect.any(Number),
    });
  });

  it('does not render a false low-risk score for unsupported results', () => {
    expect(computeRiskScore('ambient-scribe', { note: 'normal text result' })).toBeNull();
  });

  it('rejects invalid numeric inputs instead of coercing them to safe values', () => {
    expect(computeRiskScore('gfr', { gfr: Number.NaN })).toBeNull();
    expect(computeRiskScore('bmi', { bmi: -1 })).toBeNull();
  });
});
