import { describe, expect, it } from 'vitest';
import CapacityIntelligence from './CapacityIntelligence';
import { CapacityScore, PatientState } from '../types/emergency';

function patients(count, state = PatientState.Assessment) {
  return Array.from({ length: count }, (_, index) => ({
    id: `patient-${index}`,
    name: `Patient ${index}`,
    arrivalTime: '2026-06-11T01:00:00.000Z',
    complaint: 'Test',
    state,
    priority: 'CTAS 4',
    vitals: {},
    assignedTo: null,
  }));
}

describe('CapacityIntelligence', () => {
  it('scores occupancy against a 30-patient max capacity', () => {
    expect(CapacityIntelligence.getCapacitySnapshot({ patients: patients(18) }).score).toBe(
      CapacityScore.Yellow
    );
    expect(CapacityIntelligence.getCapacitySnapshot({ patients: patients(24) }).score).toBe(
      CapacityScore.Orange
    );
    expect(CapacityIntelligence.getCapacitySnapshot({ patients: patients(29) }).score).toBe(
      CapacityScore.Red
    );
  });

  it('escalates for boarding patients in Admission state', () => {
    expect(
      CapacityIntelligence.getCapacitySnapshot({ patients: patients(2, PatientState.Admission) })
        .score
    ).toBe(CapacityScore.Yellow);
    expect(
      CapacityIntelligence.getCapacitySnapshot({ patients: patients(4, PatientState.Admission) })
        .score
    ).toBe(CapacityScore.Orange);
  });

  it('escalates for reassessment queue pressure', () => {
    expect(
      CapacityIntelligence.getCapacitySnapshot({
        patients: patients(5),
        reassessmentQueueLength: 5,
      }).score
    ).toBe(CapacityScore.Orange);
  });

  it('builds chat alert messages only for Orange and Red scores', () => {
    const green = CapacityIntelligence.getCapacitySnapshot({ patients: patients(2) });
    const orange = CapacityIntelligence.getCapacitySnapshot({ patients: patients(24) });

    expect(CapacityIntelligence.getCapacityAlertMessage(green)).toBe('');
    expect(CapacityIntelligence.getCapacityAlertMessage(orange)).toMatch(
      /Capacity Alert: Orange capacity/i
    );
  });
});
