import { describe, expect, it, vi } from 'vitest';
import { PatientState, type Patient } from '../types/emergency';
import {
  buildFindPatientPath,
  buildReceptionSearchFilterPath,
  buildViewEncounterPath,
  createEncounterForPatient,
  getPatientEncounterId,
} from './patientSearchActions';

describe('patientSearchActions', () => {
  const patient = {
    id: 'patient-1',
    mrn: 'ED-100',
    firstName: 'Ava',
    lastName: 'Stone',
    dob: '1991-06-18',
    age: 34,
    sex: 'F' as const,
    arrivalTime: new Date().toISOString(),
    chiefComplaint: 'Chest pain',
    complaintCategory: 'Chest pain',
    state: PatientState.Triage,
    priority: 'P3' as const,
    vitals: [],
    flags: [],
    notes: [],
    timeline: [
      {
        id: 'evt-1',
        patientId: 'patient-1',
        type: 'EncounterCreated',
        timestamp: new Date().toISOString(),
        summary: 'Encounter encounter-patient-1 created from walk-in.',
        metadata: { encounterId: 'encounter-patient-1' },
      },
    ],
  };

  it('builds find and encounter navigation paths', () => {
    expect(buildFindPatientPath('patient-1', { receptionScoped: true })).toContain(
      '/emergency/reception?patientId=patient-1',
    );
    expect(buildViewEncounterPath('patient-1', 'encounter-patient-1')).toContain(
      '/emergency/reception',
    );
    expect(buildViewEncounterPath('patient-1', 'encounter-patient-1')).toContain(
      'encounter=encounter-patient-1',
    );
    expect(buildReceptionSearchFilterPath('ava')).toContain('q=ava');
  });

  it('runs full intake handoff when creating encounter from search', () => {
    expect(getPatientEncounterId(patient as unknown as Patient)).toBe('encounter-patient-1');

    const store = {
      patients: [patient],
      emergencySettings: {
        intakeSettings: { autoCreateEncounter: true, autoAssignTriageQueue: true },
      },
      updatePatient: vi.fn(),
      movePatientToState: vi.fn(),
      selectPatient: vi.fn(),
      setQueueFilter: vi.fn(),
      dispatchWebSocketEvent: vi.fn(),
      recordWorkflowAction: vi.fn(() => ({ id: 'log-1' })),
    };

    const handoff = createEncounterForPatient(store as never, 'patient-1');
    expect(handoff.createdEncounter).toBe(false);
    expect(handoff.encounterId).toBe('encounter-patient-1');
    expect(handoff.queue).toBe('Triage');
    expect(store.selectPatient).toHaveBeenCalledWith('patient-1');
  });
});
