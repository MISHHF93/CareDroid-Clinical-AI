import { describe, expect, it } from 'vitest';
import ReassessmentEngine from './ReassessmentEngine';
import { PatientState } from '../../types/emergency';

const now = new Date('2026-06-11T01:42:00.000Z').getTime();

function patient(overrides = {}) {
  return {
    id: 'patient-001',
    name: 'Test Patient',
    arrivalTime: '2026-06-11T00:50:00.000Z',
    complaint: 'Fever',
    state: PatientState.Waiting,
    priority: 'CTAS 4',
    vitals: { heartRate: 92 },
    vitalsUpdatedAt: '2026-06-11T01:30:00.000Z',
    assignedTo: null,
    ...overrides,
  };
}

describe('ReassessmentEngine', () => {
  it('flags patients waiting more than 45 minutes', () => {
    const result = ReassessmentEngine.evaluatePatientForReassessment(patient(), { now });

    expect(result).toEqual(
      expect.objectContaining({
        patientId: 'patient-001',
        state: PatientState.Waiting,
      })
    );
    expect(result.reasons).toContain('Waiting 52 minutes');
  });

  it('flags patients with stale vitals older than 30 minutes', () => {
    const result = ReassessmentEngine.evaluatePatientForReassessment(
      patient({
        arrivalTime: '2026-06-11T01:30:00.000Z',
        state: PatientState.Results,
        vitalsUpdatedAt: '2026-06-11T00:55:00.000Z',
      }),
      { now }
    );

    expect(result.reasons).toContain('Vitals stale 47 minutes');
  });

  it('flags high-priority triage patients not yet in assessment', () => {
    const result = ReassessmentEngine.evaluatePatientForReassessment(
      patient({
        arrivalTime: '2026-06-11T01:36:00.000Z',
        state: PatientState.Triage,
        priority: 'CTAS 2',
        vitalsUpdatedAt: '2026-06-11T01:36:00.000Z',
      }),
      { now }
    );

    expect(result.reasons).toContain('High-priority triage before assessment');
  });

  it('does not flag stable patients inside reassessment thresholds', () => {
    const result = ReassessmentEngine.evaluatePatientForReassessment(
      patient({
        arrivalTime: '2026-06-11T01:36:00.000Z',
        state: PatientState.Assessment,
        priority: 'CTAS 4',
        vitalsUpdatedAt: '2026-06-11T01:36:00.000Z',
      }),
      { now }
    );

    expect(result).toBeNull();
  });
});
