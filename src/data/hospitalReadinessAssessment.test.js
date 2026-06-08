import { describe, expect, it } from 'vitest';
import {
  buildHospitalReadinessAssessment,
  calculateHospitalReadinessScore,
  getHospitalReadinessBand,
} from './hospitalReadinessAssessment';

describe('hospitalReadinessAssessment', () => {
  it('calculates readiness scores and bands', () => {
    expect(calculateHospitalReadinessScore([{ score: 60 }, { score: 80 }])).toBe(70);
    expect(getHospitalReadinessBand(88)).toMatchObject({ id: 'advanced' });
    expect(getHospitalReadinessBand(66)).toMatchObject({ id: 'developing' });
  });

  it('measures all required dimensions and recommendations', () => {
    const assessment = buildHospitalReadinessAssessment();
    const dimensionIds = assessment.dimensions.map((dimension) => dimension.id);

    expect(dimensionIds).toEqual(
      expect.arrayContaining([
        'digital_maturity',
        'ai_maturity',
        'interoperability',
        'simulation_readiness',
        'iot_readiness',
        'governance_readiness',
      ]),
    );
    expect(assessment.summary.measuredDimensionCount).toBe(6);
    expect(assessment.recommendations.products.length).toBeGreaterThan(0);
    expect(assessment.recommendations.packs.length).toBeGreaterThan(0);
    expect(assessment.recommendations.integrations.length).toBeGreaterThan(0);
    expect(assessment.recommendations.training.length).toBeGreaterThan(0);
  });

  it('uses questionnaire answers to generate a hospital readiness score', () => {
    const assessment = buildHospitalReadinessAssessment({
      answers: {
        digital_maturity: 4,
        ai_maturity: 3,
        interoperability: 2,
        simulation_readiness: 3,
        iot_readiness: 2,
        governance_readiness: 4,
      },
    });

    expect(assessment.hospitalReadinessScore).toBe(75);
    expect(assessment.readinessBand).toMatchObject({ id: 'ready' });
  });
});
