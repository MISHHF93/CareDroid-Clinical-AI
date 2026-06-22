import { describe, expect, it } from 'vitest';
import { PatientFlag, PatientState, Priority } from '../types/emergency';
import { collectReassessmentAttentionPatients } from './reassessmentAttentionPatients';

function buildPatient(overrides = {}) {
  return {
    id: 'patient-1',
    mrn: 'MRN-1',
    firstName: 'Alex',
    lastName: 'Lee',
    state: PatientState.Waiting,
    priority: Priority.P3,
    arrivalTime: '2026-06-20T08:00:00.000Z',
    triageTime: '2026-06-20T08:15:00.000Z',
    flags: [],
    vitals: [],
    notes: [],
    timeline: [],
    ...overrides,
  };
}

describe('reassessmentAttentionPatients', () => {
  it('includes score-reassessment flags and overdue timer patients', () => {
    const patients = [
      buildPatient({
        id: 'flagged',
        flags: [PatientFlag.ScoreReassessmentRecommended],
      }),
      buildPatient({
        id: 'timer',
        arrivalTime: '2026-06-20T06:00:00.000Z',
        triageTime: '2026-06-20T06:05:00.000Z',
        lastAssessedTime: '2026-06-20T06:10:00.000Z',
      }),
    ];

    const attention = collectReassessmentAttentionPatients(patients);
    expect(attention.map((patient) => patient.id)).toEqual(
      expect.arrayContaining(['flagged', 'timer']),
    );
  });
});
