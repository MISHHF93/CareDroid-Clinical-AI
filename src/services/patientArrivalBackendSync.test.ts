import { describe, expect, it } from 'vitest';
import { PatientState, Priority, type Patient } from '../types/emergency';
import {
  ensurePatientArrivalBlock,
  hydratePatientFromBackendApi,
  patientArrivalContractViolations,
  serializePatientForBackendApi,
} from './patientArrivalBackendSync';

function legacyPatient(overrides: Partial<Patient> = {}): Patient {
  return {
    id: 'patient-1',
    mrn: 'ED-1',
    firstName: 'Alex',
    lastName: 'Kim',
    dob: '1990-01-01',
    age: 35,
    sex: 'F',
    arrivalTime: '2026-06-20T10:00:00.000Z',
    chiefComplaint: 'Chest pain',
    complaintCategory: 'Chest pain',
    state: PatientState.Triage,
    priority: Priority.P3,
    vitals: [],
    flags: [],
    notes: [],
    timeline: [],
    source: 'WalkIn',
    ...overrides,
  };
}

describe('patientArrivalBackendSync', () => {
  it('hydrates legacy backend patients onto the arrival contract', () => {
    const hydrated = hydratePatientFromBackendApi(legacyPatient({ source: 'Self-arrival' }));

    expect(hydrated.arrival?.arrivalMode).toBe('self-check-in');
    expect(hydrated.arrival?.chiefComplaint).toBe('Chest pain');
    expect(hydrated.arrivalTime).toBe(hydrated.arrival?.arrivalTimestamp);
    expect(patientArrivalContractViolations(hydrated)).toEqual([]);
  });

  it('serializes arrival block for API payloads', () => {
    const serialized = serializePatientForBackendApi(
      legacyPatient({
        arrival: {
          arrivalMode: 'EMS',
          arrivalTimestamp: '2026-06-20T11:00:00.000Z',
          chiefComplaint: 'Trauma',
          triageAcuity: {
            code: Priority.P2,
            system: 'PRIORITY',
            level: 2,
            status: 'suggested',
          },
          waitingRoomStatus: 'waiting-for-triage',
          registrationStatus: 'in-progress',
          queueDestination: 'ems-registration',
          triagePending: true,
        },
      }),
    );

    expect(serialized.arrival?.arrivalMode).toBe('EMS');
    expect(serialized.chiefComplaint).toBe('Trauma');
    expect(serialized.priority).toBe(Priority.P2);
  });

  it('keeps an existing arrival block stable through ensure', () => {
    const patient = ensurePatientArrivalBlock(
      legacyPatient({
        arrival: {
          arrivalMode: 'referral',
          arrivalTimestamp: '2026-06-20T09:00:00.000Z',
          chiefComplaint: 'Specialist referral',
          triageAcuity: {
            code: Priority.P4,
            system: 'PRIORITY',
            level: 4,
            status: 'unassigned',
          },
          waitingRoomStatus: 'registered',
          registrationStatus: 'complete',
          queueDestination: 'verification',
          triagePending: false,
        },
      }),
    );

    expect(patient.arrival?.arrivalMode).toBe('referral');
    expect(patientArrivalContractViolations(patient)).toEqual([]);
  });
});