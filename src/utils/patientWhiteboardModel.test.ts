import { describe, expect, it } from 'vitest';
import { PatientState, Priority, type Patient } from '../types/emergency';
import { buildPatientWhiteboardSnapshot } from './patientWhiteboardModel';

function patient(overrides: Partial<Patient> = {}): Patient {
  return {
    id: 'p1',
    mrn: 'ED-1',
    firstName: 'Sam',
    lastName: 'Lee',
    dob: '1990-01-01',
    age: 35,
    sex: 'F',
    arrivalTime: '2026-06-24T08:00:00.000Z',
    chiefComplaint: 'Abdominal pain',
    complaintCategory: 'GI',
    state: PatientState.Waiting,
    priority: Priority.P3,
    vitals: [],
    flags: [],
    notes: [],
    timeline: [],
    ...overrides,
  };
}

describe('patientWhiteboardModel', () => {
  it('uses plain-language next steps and wait labels', () => {
    const snapshot = buildPatientWhiteboardSnapshot(patient());
    expect(snapshot.nextStep.toLowerCase()).not.toContain('triage');
    expect(snapshot.estimatedWaitLabel.length).toBeGreaterThan(0);
    expect(snapshot.careTeamMembers.length).toBeGreaterThan(0);
  });

  it('includes discharge instructions for discharge state', () => {
    const snapshot = buildPatientWhiteboardSnapshot(
      patient({ state: PatientState.Discharge }),
    );
    expect(snapshot.dischargeInstructions.length).toBeGreaterThan(0);
    expect(snapshot.dischargeInstructions.join(' ').toLowerCase()).not.toContain('npo');
  });
});