import { describe, expect, it } from 'vitest';
import { PatientState, Priority, type Patient } from '../../types/emergency';
import {
  PUBLIC_WAITING_ESCALATION_MESSAGE,
  buildPublicWaitingDisplaySnapshot,
  derivePublicCrowdLevel,
  formatPublicWaitDuration,
  formatPublicWaitRange,
} from './publicWaitingDisplayModel';

function buildPatient(overrides: Partial<Patient> = {}): Patient {
  return {
    id: 'patient-1',
    mrn: 'MRN-SECRET',
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
  };
}

describe('publicWaitingDisplayModel', () => {
  it('formats public wait durations without identifiers', () => {
    expect(formatPublicWaitDuration(42)).toBe('42 min');
    expect(formatPublicWaitDuration(95)).toBe('1 hr 35 min');
    expect(formatPublicWaitRange(30, 75)).toBe('30 min – 1 hr 15 min');
    expect(formatPublicWaitRange(20, 22)).toBe('About 20 min');
  });

  it('derives crowd level from waiting count and capacity band', () => {
    expect(derivePublicCrowdLevel(3, 'Green').label).toBe('Calm');
    expect(derivePublicCrowdLevel(8, 'Yellow').label).toBe('Moderate');
    expect(derivePublicCrowdLevel(14, 'Orange').label).toBe('Busy');
    expect(derivePublicCrowdLevel(22, 'Red').label).toBe('Very busy');
  });

  it('builds PHI-safe aggregate snapshot for waiting-room display', () => {
    const now = new Date('2026-06-20T10:00:00.000Z');
    const snapshot = buildPublicWaitingDisplaySnapshot({
      now,
      updatedAt: now.toISOString(),
      patients: [
        buildPatient({ id: 'w1', state: PatientState.Waiting }),
        buildPatient({
          id: 'w2',
          state: PatientState.Waiting,
          arrivalTime: '2026-06-20T07:00:00.000Z',
        }),
        buildPatient({ id: 't1', state: PatientState.Triage, arrivalTime: '2026-06-20T09:30:00.000Z' }),
        buildPatient({ id: 'r1', state: PatientState.Registration }),
      ],
      capacity: {
        score: 78,
        band: 'Orange',
        updatedAt: now.toISOString(),
        totalPatients: 4,
        occupiedRooms: 18,
        boardingCount: 0,
        reassessmentDue: 0,
        waitingCount: 2,
        averageWaitMinutes: 45,
        longestWaitMinutes: 180,
      },
    });

    const serialized = JSON.stringify(snapshot);
    expect(serialized).not.toContain('Alex');
    expect(serialized).not.toContain('Lee');
    expect(serialized).not.toContain('MRN-SECRET');
    expect(serialized).not.toContain('Chest pain');

    expect(snapshot.waitRange.value).toBe('45 min – 3 hr');
    expect(snapshot.crowdLevel.label).toBe('Busy');
    expect(snapshot.triageWait.available).toBe(true);
    expect(snapshot.triageWait.value).not.toBe('Not available');
    expect(snapshot.careStages.length).toBeGreaterThan(0);
    expect(snapshot.careStages.every((stage) => stage.count > 0)).toBe(true);
    expect(snapshot.guidanceMessages.length).toBeGreaterThan(0);
    expect(snapshot.statusMessaging.statusLines.length).toBeGreaterThan(0);
    expect(snapshot.statusMessaging.advisories.some((line) => line.id === 'symptom-escalation')).toBe(
      true,
    );
    expect(snapshot.escalationMessage).toBe(PUBLIC_WAITING_ESCALATION_MESSAGE);
  });

  it('marks triage wait unavailable when no triage queue exists', () => {
    const now = new Date('2026-06-20T10:00:00.000Z');
    const snapshot = buildPublicWaitingDisplaySnapshot({
      now,
      patients: [buildPatient({ id: 'w1', state: PatientState.Assessment })],
      capacity: {
        score: 40,
        band: 'Green',
        updatedAt: now.toISOString(),
        totalPatients: 1,
        occupiedRooms: 8,
        boardingCount: 0,
        reassessmentDue: 0,
        waitingCount: 0,
      },
    });

    expect(snapshot.triageWait.available).toBe(false);
    expect(snapshot.triageWait.value).toBe('Not available');
  });
});
