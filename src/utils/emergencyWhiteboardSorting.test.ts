import { describe, expect, it } from 'vitest';
import { PatientFlag, PatientState, Priority, type Patient } from '../types/emergency';
import { sortWhiteboardPatients } from './emergencyWhiteboardSorting';

const now = new Date('2026-06-13T16:00:00.000Z').getTime();

function isoMinutesAgo(minutes: number): string {
  return new Date(now - minutes * 60_000).toISOString();
}

function patient(overrides: Partial<Patient> = {}): Patient {
  return {
    id: 'patient-1',
    mrn: 'ED-TEST-1',
    firstName: 'Test',
    lastName: 'Patient',
    dob: '1980-01-01',
    age: 46,
    sex: 'F',
    arrivalTime: isoMinutesAgo(10),
    chiefComplaint: 'Pain',
    complaintCategory: 'Other',
    state: PatientState.Waiting,
    priority: Priority.P3,
    vitals: [],
    flags: [],
    notes: [],
    timeline: [],
    ...overrides,
  };
}

describe('sortWhiteboardPatients', () => {
  it('sorts waiting patients by longest wait before priority', () => {
    const p2Short = patient({ id: 'p2-short', priority: Priority.P2, arrivalTime: isoMinutesAgo(20) });
    const p4Long = patient({ id: 'p4-long', priority: Priority.P4, arrivalTime: isoMinutesAgo(90), flags: [PatientFlag.LongWait] });

    expect([p2Short, p4Long].sort((a, b) => sortWhiteboardPatients(a, b, now)).map((entry) => entry.id)).toEqual([
      'p4-long',
      'p2-short',
    ]);
  });

  it('sorts by normalized arrival acuity level when arrival block is present', () => {
    const p2 = patient({
      id: 'p2-arrival',
      state: PatientState.Assessment,
      priority: Priority.P4,
      arrival: {
        arrivalMode: 'walk-in',
        arrivalTimestamp: isoMinutesAgo(5),
        chiefComplaint: 'Pain',
        triageAcuity: { code: Priority.P2, system: 'PRIORITY', level: 2, status: 'confirmed' },
        waitingRoomStatus: 'waiting-for-clinician',
        registrationStatus: 'complete',
        queueDestination: 'waiting-room',
        triagePending: false,
      },
    });
    const p4 = patient({
      id: 'p4-arrival',
      state: PatientState.Assessment,
      priority: Priority.P2,
      arrival: {
        arrivalMode: 'walk-in',
        arrivalTimestamp: isoMinutesAgo(5),
        chiefComplaint: 'Pain',
        triageAcuity: { code: Priority.P4, system: 'PRIORITY', level: 4, status: 'confirmed' },
        waitingRoomStatus: 'waiting-for-clinician',
        registrationStatus: 'complete',
        queueDestination: 'waiting-room',
        triagePending: false,
      },
    });

    expect([p4, p2].sort((a, b) => sortWhiteboardPatients(a, b, now)).map((entry) => entry.id)).toEqual([
      'p2-arrival',
      'p4-arrival',
    ]);
  });

  it('keeps priority ordering for non-waiting comparisons', () => {
    const p1Assessment = patient({ id: 'p1-assessment', state: PatientState.Assessment, priority: Priority.P1 });
    const p4Waiting = patient({ id: 'p4-waiting', priority: Priority.P4, arrivalTime: isoMinutesAgo(90) });

    expect([p4Waiting, p1Assessment].sort((a, b) => sortWhiteboardPatients(a, b, now)).map((entry) => entry.id)).toEqual([
      'p1-assessment',
      'p4-waiting',
    ]);
  });
});
