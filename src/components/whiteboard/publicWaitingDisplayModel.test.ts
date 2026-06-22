import { describe, expect, it } from 'vitest';
import { PatientState, Priority, type Patient } from '../../types/emergency';
import {
  PUBLIC_WAIT_URGENCY_DISCLAIMER,
  PUBLIC_WAITING_ESCALATION_MESSAGE,
  assertPublicWaitingDisplaySnapshotIsPhiSafe,
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
  it('formats public wait durations as patient-safe buckets', () => {
    expect(formatPublicWaitDuration(42)).toBe('30–60 minutes');
    expect(formatPublicWaitDuration(95)).toBe('1–2 hours');
    expect(formatPublicWaitRange(30, 75)).toBe('30–60 minutes to 1–2 hours');
    expect(formatPublicWaitRange(20, 22)).toBe('Less than 30 minutes');
  });

  it('derives crowd level from waiting count and capacity band', () => {
    expect(derivePublicCrowdLevel(2, 'Green').label).toBe('Low');
    expect(derivePublicCrowdLevel(8, 'Yellow').label).toBe('Busy');
    expect(derivePublicCrowdLevel(14, 'Orange').label).toBe('Very busy');
    expect(derivePublicCrowdLevel(22, 'Red').label).toBe('Critical');
  });

  it('builds PHI-safe aggregate snapshot for waiting-room display', () => {
    const now = new Date('2026-06-20T10:00:00.000Z');
    const patients = [
      buildPatient({ id: 'w1', state: PatientState.Waiting }),
      buildPatient({
        id: 'w2',
        state: PatientState.Waiting,
        arrivalTime: '2026-06-20T07:00:00.000Z',
      }),
      buildPatient({ id: 't1', state: PatientState.Triage, arrivalTime: '2026-06-20T09:30:00.000Z' }),
      buildPatient({ id: 'r1', state: PatientState.Registration }),
    ];
    const snapshot = buildPublicWaitingDisplaySnapshot({
      now,
      updatedAt: now.toISOString(),
      patients,
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

    expect(assertPublicWaitingDisplaySnapshotIsPhiSafe(snapshot, patients)).toBe(true);

    expect(snapshot.waitRange.value).toBe('30–60 minutes to 2–4 hours');
    expect(snapshot.waitRange.disclaimer).toBe(PUBLIC_WAIT_URGENCY_DISCLAIMER);
    expect(snapshot.waitDisclaimer).toBe(PUBLIC_WAIT_URGENCY_DISCLAIMER);
    expect(snapshot.crowdLevel.label).toBe('Critical');
    expect(snapshot.triageWait.available).toBe(true);
    expect(snapshot.triageWait.value).not.toBe('Not available');
    expect(snapshot.careStages.length).toBeGreaterThan(0);
    expect(snapshot.careStages.every((stage) => stage.count > 0)).toBe(true);
    expect(snapshot.processEducation.steps).toHaveLength(7);
    expect(snapshot.processEducation.steps[0]?.label).toBe('Registration');
    expect(snapshot.processEducation.steps[6]?.label).toBe('Discharge / Admission');
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
