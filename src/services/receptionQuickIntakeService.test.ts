import { describe, expect, it, vi } from 'vitest';
import { PatientFlag, PatientState, Priority } from '../types/emergency';
import {
  buildReceptionQuickIntakePatient,
  calculateAgeFromDob,
  persistReceptionQuickIntakePatient,
  splitPatientName,
} from './receptionQuickIntakeService';

vi.mock('./emergencyOsApi', () => ({
  createSmartIntakePatient: vi.fn(),
}));

import { createSmartIntakePatient } from './emergencyOsApi';

describe('receptionQuickIntakeService', () => {
  it('calculates age from date of birth', () => {
    expect(calculateAgeFromDob('1990-06-20')).toBeGreaterThan(30);
  });

  it('splits a single desk name field into first and last name', () => {
    expect(splitPatientName('Alex Kim')).toEqual({ firstName: 'Alex', lastName: 'Kim' });
    expect(splitPatientName('Madonna')).toEqual({ firstName: 'Madonna', lastName: '' });
  });

  it('builds a new walk-in patient with complaint, mode, and notes', () => {
    const patient = buildReceptionQuickIntakePatient(
      {
        firstName: 'Alex',
        lastName: 'Kim',
        dob: '1988-03-12',
        healthCard: '1234567890',
        phone: '555-0100',
        complaint: 'Chest pain',
        arrivalMode: 'walk-in',
        quickNotes: 'Needs wheelchair',
      },
      { actorId: 'registration-clerk', now: '2026-06-20T12:00:00.000Z' },
    );

    expect(patient.firstName).toBe('Alex');
    expect(patient.chiefComplaint).toBe('Chest pain');
    expect(patient.state).toBe(PatientState.Registration);
    expect(patient.queueDestination).toBe('rapid-review');
    expect(patient.notes).toHaveLength(1);
    expect(patient.highRiskComplaintFlags?.map((flag) => flag.id)).toContain('chest-pain');
    expect(patient.arrival).toMatchObject({
      arrivalMode: 'walk-in',
      chiefComplaint: 'Chest pain',
      waitingRoomStatus: 'registered',
    });
  });

  it('reuses an existing chart and stamps EMS arrival mode', () => {
    const existing = {
      id: 'patient-9',
      mrn: 'ED-999',
      firstName: 'Sam',
      lastName: 'Lee',
      dob: '1975-01-01',
      age: 51,
      sex: 'M' as const,
      arrivalTime: '2026-06-19T08:00:00.000Z',
      chiefComplaint: 'Old complaint',
      complaintCategory: 'Other',
      state: PatientState.Discharge,
      priority: Priority.P4,
      vitals: [],
      flags: [],
      notes: [],
      timeline: [],
    };

    const patient = buildReceptionQuickIntakePatient(
      {
        firstName: 'Sam',
        lastName: 'Lee',
        dob: '1975-01-01',
        complaint: 'Shortness of breath',
        arrivalMode: 'EMS',
        existingPatient: existing,
      },
      { now: '2026-06-20T12:00:00.000Z' },
    );

    expect(patient.id).toBe('patient-9');
    expect(patient.flags).toContain(PatientFlag.EMSArrival);
    expect(patient.arrivalMode).toBe('EMS');
    expect(patient.arrival?.arrivalMode).toBe('EMS');
    expect(patient.chiefComplaint).toBe('Shortness of breath');
    expect(patient.arrivalTime).toBe('2026-06-20T12:00:00.000Z');
  });

  it('falls back to local store when create API fails', async () => {
    vi.mocked(createSmartIntakePatient).mockRejectedValueOnce(new Error('Network error'));
    const patient = buildReceptionQuickIntakePatient(
      {
        firstName: 'Local',
        lastName: 'Fallback',
        complaint: 'Headache',
        arrivalMode: 'walk-in',
      },
      { now: '2026-06-20T12:00:00.000Z' },
    );
    const added: typeof patient[] = [];
    const result = await persistReceptionQuickIntakePatient(
      { patients: [], addPatient: (entry) => added.push(entry), updatePatient: () => undefined },
      patient,
      { isNew: true },
    );

    expect(result.persistedLocally).toBe(true);
    expect(result.patient.id).toBe(patient.id);
    expect(added).toHaveLength(1);
    expect(added[0].chiefComplaint).toBe('Headache');
  });
});
