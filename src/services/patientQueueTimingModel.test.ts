import { describe, expect, it } from 'vitest';
import { PatientState, Priority, type Patient } from '../types/emergency';
import {
  buildQueueTimingSummary,
  countOnlineQueuePatients,
  resolvePatientQueueTiming,
} from './patientQueueTimingModel';

const now = new Date('2026-06-22T12:00:00.000Z');

function buildPatient(overrides: Partial<Patient> = {}): Patient {
  return {
    id: 'ED-1',
    mrn: 'MRN-1',
    firstName: 'Alex',
    lastName: 'Patient',
    age: 42,
    sex: 'F',
    chiefComplaint: 'Chest pain',
    priority: Priority.P3,
    state: PatientState.Triage,
    arrivalTime: '2026-06-22T11:55:00.000Z',
    triageTime: null,
    flags: [],
    vitals: [],
    ...overrides,
  } as Patient;
}

describe('patientQueueTimingModel', () => {
  it('shows triage elapsed and remaining time for pre-triage patients', () => {
    const timing = resolvePatientQueueTiming(buildPatient(), { now });
    expect(timing?.scenario).toBe('triage');
    expect(timing?.isOnline).toBe(true);
    expect(timing?.elapsedMinutes).toBe(5);
    expect(timing?.remainingLabel).toMatch(/left|Due now/);
    expect(timing?.rowLabel).toContain('5m');
  });

  it('shows provider wait timing after triage', () => {
    const timing = resolvePatientQueueTiming(
      buildPatient({
        state: PatientState.Waiting,
        triageTime: '2026-06-22T11:40:00.000Z',
        priority: Priority.P2,
      }),
      { now },
    );
    expect(timing?.scenario).toBe('provider-wait');
    expect(timing?.elapsedMinutes).toBe(20);
    expect(timing?.remainingLabel).toMatch(/left|overdue|Due now/);
  });

  it('counts online queue patients', () => {
    const patients = [buildPatient(), buildPatient({ id: 'ED-2', state: PatientState.Discharge })];
    expect(countOnlineQueuePatients(patients, { now })).toBe(1);
    expect(buildQueueTimingSummary(patients, { now }).onlineCount).toBe(1);
  });
});
