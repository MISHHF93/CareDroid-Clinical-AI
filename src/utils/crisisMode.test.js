import { describe, expect, it } from 'vitest';
import { PatientState } from '../../types/emergency';
import { deriveCrisisModeState } from './crisisMode';

function patient(id, state, overrides = {}) {
  return {
    id,
    firstName: overrides.firstName || 'Test',
    lastName: overrides.lastName || id,
    name: overrides.name,
    state,
    roomId: overrides.roomId || null,
    arrivalTime: overrides.arrivalTime || '2026-06-11T18:00:00-04:00',
    lastAssessedTime: overrides.lastAssessedTime || '2026-06-11T19:00:00-04:00',
    timeline: overrides.timeline || [],
    referral: overrides.referral,
  };
}

describe('deriveCrisisModeState', () => {
  it('activates for Orange capacity and builds deterministic action groups', () => {
    const result = deriveCrisisModeState({
      capacity: { riskLevel: 'Orange', score: 68 },
      patients: [
        patient('boarding', PatientState.Admission, {
          referral: { targetDepartment: 'Cardiology' },
        }),
        patient('ready', PatientState.Disposition),
      ],
      reassessmentQueue: [{ patientId: 'a' }, { patientId: 'b' }, { patientId: 'c' }, { patientId: 'd' }],
      emsArrivals: [
        {
          id: 'ems-1',
          unitName: 'Medic 1',
          status: 'Inbound',
          eta: 8,
          chiefComplaint: 'Chest pain',
        },
      ],
      now: new Date('2026-06-11T20:00:00-04:00'),
    });

    expect(result.active).toBe(true);
    expect(result.actionGroups.map((group) => group.id)).toEqual([
      'boarding',
      'discharge',
      'reassessment',
      'ems',
    ]);
    expect(result.boardingPatients[0]).toMatchObject({
      targetDepartment: 'Cardiology',
    });
  });

  it('does not activate below Orange', () => {
    expect(
      deriveCrisisModeState({
        capacity: { riskLevel: 'Yellow', score: 82 },
      }).active
    ).toBe(false);
  });
});
