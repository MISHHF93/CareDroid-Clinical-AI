import { describe, expect, it } from 'vitest';
import { PatientState, Priority, type Patient } from '../types/emergency';
import {
  CROWD_LEVEL,
  buildCrowdLevelSnapshot,
  derivePublicCrowdLevelFromEngine,
} from './crowdLevelEngine';

function buildPatient(overrides: Partial<Patient> = {}): Patient {
  return {
    id: 'patient-1',
    mrn: 'MRN-1',
    firstName: 'Alex',
    lastName: 'Lee',
    state: PatientState.Waiting,
    priority: Priority.P3,
    arrivalTime: '2026-06-20T08:00:00.000Z',
    triageTime: '2026-06-20T08:15:00.000Z',
    chiefComplaint: 'Chest pain',
    flags: [],
    notes: [],
    timeline: [],
    ...overrides,
    dob: overrides.dob ?? '1990-01-01',
    age: overrides.age ?? 40,
    sex: overrides.sex ?? 'Unknown',
    complaintCategory: overrides.complaintCategory ?? 'Other',
    vitals: overrides.vitals ?? [],
  };
}

describe('crowdLevelEngine', () => {
  it('classifies low crowding for calm departments', () => {
    const snapshot = buildCrowdLevelSnapshot({
      patients: [buildPatient()],
      capacity: {
        score: 35,
        band: 'Green',
        waitingCount: 2,
        averageWaitMinutes: 15,
        longestWaitMinutes: 20,
        updatedAt: '2026-06-20T10:00:00.000Z',
        totalPatients: 2,
        occupiedRooms: 10,
        boardingCount: 0,
        reassessmentDue: 0,
      },
    });
    expect(snapshot.id).toBe(CROWD_LEVEL.LOW);
    expect(snapshot.staffLabel).toBe('LOW');
  });

  it('escalates with capacity band, waiting count, and EMS pressure', () => {
    const snapshot = buildCrowdLevelSnapshot({
      patients: Array.from({ length: 14 }, (_, index) =>
        buildPatient({ id: `w-${index}`, state: PatientState.Waiting }),
      ),
      capacity: {
        score: 78,
        band: 'Orange',
        waitingCount: 14,
        averageWaitMinutes: 70,
        longestWaitMinutes: 95,
        emsInboundCount: 3,
        updatedAt: '2026-06-20T10:00:00.000Z',
        totalPatients: 14,
        occupiedRooms: 22,
        boardingCount: 1,
        reassessmentDue: 2,
      },
      emsOffloadDelays: 2,
      queueBreaches: 1,
    });
    expect([CROWD_LEVEL.BUSY, CROWD_LEVEL.VERY_BUSY, CROWD_LEVEL.CRITICAL]).toContain(snapshot.id);
  });

  it('marks critical crowding for red band and very high waits', () => {
    const snapshot = buildCrowdLevelSnapshot({
      patients: Array.from({ length: 22 }, (_, index) =>
        buildPatient({ id: `w-${index}`, state: PatientState.Waiting }),
      ),
      capacity: {
        score: 92,
        band: 'Red',
        waitingCount: 22,
        averageWaitMinutes: 130,
        longestWaitMinutes: 190,
        updatedAt: '2026-06-20T10:00:00.000Z',
        totalPatients: 22,
        occupiedRooms: 24,
        boardingCount: 4,
        reassessmentDue: 3,
      },
      emsInbound: 5,
      emsOffloadDelays: 3,
      queueBreaches: 2,
    });
    expect(snapshot.id).toBe(CROWD_LEVEL.CRITICAL);
  });

  it('exposes public-friendly labels', () => {
    expect(derivePublicCrowdLevelFromEngine(2, 'Green').label).toBe('Low');
    expect(derivePublicCrowdLevelFromEngine(8, 'Yellow').label).toBe('Busy');
    expect(derivePublicCrowdLevelFromEngine(14, 'Orange').label).toBe('Very busy');
    expect(derivePublicCrowdLevelFromEngine(22, 'Red').label).toBe('Critical');
  });
});
