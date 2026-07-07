import { describe, expect, it } from 'vitest';
import { getAutoScorePrefill } from './autoScorePopulator';

function patient(overrides: any = {}) {
  return {
    id: 'pt-heart',
    firstName: 'Sarah',
    lastName: 'Miller',
    age: 58,
    chiefComplaint: 'Chest pain',
    complaintCategory: 'Chest Pain',
    vitals: {
      rr: 24,
      bpSystolic: 96,
    },
    notes: [
      {
        body: 'History of diabetes and hypertension. Smoker. ECG pending physician interpretation.',
      },
    ],
    ...overrides,
  };
}

describe('AutoScorePopulator', () => {
  it('pre-populates HEART age, risk factors, and troponin while requiring ECG/history assessment', () => {
    const result = getAutoScorePrefill(patient(), {
      labs: [
        {
          name: 'High sensitivity Troponin',
          value: '42',
          unit: 'ng/L',
          referenceRange: '0-14',
          resultedAt: '2026-06-11T20:00:00-04:00',
        },
      ],
    });

    expect(result.calculatorId).toBe('heart');
    expect(result.values).toMatchObject({
      age: 1,
      riskFactors: 2,
      troponin: 1,
    });
    expect(result.fields.history.status).toBe('requires-assessment');
    expect(result.fields.ecg.status).toBe('requires-assessment');
    expect(result.bannerSummary).toBe('3 fields filled · 2 require assessment');
  });

  it('pre-populates qSOFA objective vitals and leaves mentation for assessment', () => {
    const result = getAutoScorePrefill(
      patient({
        complaintCategory: 'Sepsis',
        chiefComplaint: 'Fever and suspected infection',
      })
    );

    expect(result.calculatorId).toBe('qsofa');
    expect(result.values).toMatchObject({
      rr22: 1,
      sbp100: 1,
    });
    expect(result.fields.alteredMentation.status).toBe('requires-assessment');
  });

  it('flags NIHSS objective note findings for confirmation', () => {
    const result = getAutoScorePrefill(
      patient({
        complaintCategory: 'Stroke',
        chiefComplaint: 'Stroke symptoms',
        notes: [{ body: 'Left arm weakness and slurred speech documented by triage.' }],
      })
    );

    expect(result.calculatorId).toBe('nihss');
    expect(result.values).toMatchObject({
      motorLeft: 1,
      dysarthria: 1,
    });
    expect(result.fields.motorLeft.status).toBe('needs-confirmation');
  });
});
