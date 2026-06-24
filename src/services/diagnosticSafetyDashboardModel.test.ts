import { describe, expect, it } from 'vitest';
import { PatientFlag, PatientState, Priority, type Patient } from '../types/emergency';
import { buildDiagnosticSafetyDashboardSnapshot } from './diagnosticSafetyDashboardModel';

function patient(overrides: Partial<Patient> = {}): Patient {
  return {
    id: 'p1',
    mrn: 'ED-1',
    firstName: 'Sam',
    lastName: 'Lee',
    dob: '1945-01-01',
    age: 81,
    sex: 'M',
    arrivalTime: '2026-06-24T08:00:00.000Z',
    chiefComplaint: 'Chest pain',
    complaintCategory: 'Cardiac',
    state: PatientState.Waiting,
    priority: Priority.P2,
    vitals: [{ hr: 128, sbp: 88, spo2: 91, recordedAt: '2026-06-24T08:05:00.000Z' }],
    flags: [PatientFlag.ReassessmentDue],
    notes: [],
    timeline: [],
    ...overrides,
  };
}

describe('diagnosticSafetyDashboardModel', () => {
  it('ranks higher-risk patients first with clinical rule drivers', () => {
    const snapshot = buildDiagnosticSafetyDashboardSnapshot([
      patient(),
      patient({
        id: 'p2',
        mrn: 'ED-2',
        firstName: 'Alex',
        lastName: 'Kim',
        age: 32,
        chiefComplaint: 'Laceration',
        priority: Priority.P4,
        vitals: [],
        flags: [],
      }),
    ]);

    expect(snapshot.entries[0]?.patientId).toBe('p1');
    expect(snapshot.entries[0]?.riskDrivers).toEqual(
      expect.arrayContaining(['Elderly patient with chest pain', 'Abnormal vitals on latest set']),
    );
    expect(['critical', 'high', 'moderate', 'watch']).toContain(snapshot.entries[0]?.riskTier);
  });
});