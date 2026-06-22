import { describe, expect, it } from 'vitest';
import { PatientState, Priority, type Patient } from '../types/emergency';
import { WAITING_ROOM_PROCESS_STEP } from './waitingRoomProcessEducation';
import { buildReceptionPatientAnswersSnapshot } from './receptionPatientAnswersModel';

const NOW = new Date('2026-06-20T12:00:00.000Z');

function buildPatient(overrides: Partial<Patient> = {}): Patient {
  return {
    id: 'patient-1',
    mrn: 'ED-100',
    firstName: 'Ava',
    lastName: 'Stone',
    state: PatientState.Triage,
    priority: Priority.P3,
    arrivalTime: '2026-06-20T10:00:00.000Z',
    chiefComplaint: 'Abdominal pain',
    flags: [],
    vitals: [],
    notes: [],
    timeline: [],
    ...overrides,
  };
}

describe('receptionPatientAnswersModel', () => {
  it('builds department answers from public waiting display signals', () => {
    const snapshot = buildReceptionPatientAnswersSnapshot({
      now: NOW,
      patients: [buildPatient({ state: PatientState.Waiting })],
      capacity: {
        score: 72,
        band: 'Yellow',
        updatedAt: NOW.toISOString(),
        totalPatients: 1,
        occupiedRooms: 14,
        boardingCount: 0,
        reassessmentDue: 0,
        waitingCount: 6,
        averageWaitMinutes: 48,
        longestWaitMinutes: 95,
      },
    });

    expect(snapshot.department.crowdLevelLabel).toBeTruthy();
    expect(snapshot.department.waitRangeValue).toBeTruthy();
    expect(snapshot.department.waitExplanation).toContain('Emergency patients are prioritized');
    expect(snapshot.processSteps).toHaveLength(7);
  });

  it('builds focused patient shareable answers for common reception questions', () => {
    const snapshot = buildReceptionPatientAnswersSnapshot({
      now: NOW,
      patients: [buildPatient()],
      focusedPatientId: 'patient-1',
      capacity: {
        score: 40,
        band: 'Green',
        updatedAt: NOW.toISOString(),
        totalPatients: 1,
        occupiedRooms: 8,
        boardingCount: 0,
        reassessmentDue: 0,
        waitingCount: 1,
      },
    });

    expect(snapshot.focusedPatient?.shareable.whereInProcess).toContain('waiting');
    expect(snapshot.focusedPatient?.shareable.whatHappensNext.length).toBeGreaterThan(0);
    expect(snapshot.focusedPatient?.shareable.whyWaitLong).toContain('Typical clinician wait');
    expect(
      snapshot.processSteps.find((step) => step.id === WAITING_ROOM_PROCESS_STEP.TRIAGE)?.isCurrent,
    ).toBe(true);
  });
});
