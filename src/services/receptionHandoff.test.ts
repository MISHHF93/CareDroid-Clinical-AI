import { describe, expect, it } from 'vitest';
import { CANONICAL_ROUTES } from '../config/routes.config';
import { PatientState } from '../types/emergency';
import { completeReceptionHandoff } from './receptionHandoff';

describe('receptionHandoff', () => {
  it('moves patient to triage, selects patient, sets queue, and records workflow log', () => {
    const calls: string[] = [];
    const store = {
      patients: [{ id: 'patient-123', state: PatientState.Registration, timeline: [] }],
      emergencySettings: {
        intakeSettings: { autoAssignTriageQueue: true, autoCreateEncounter: true },
      },
      updatePatient: (patientId: string) => calls.push(`update:${patientId}`),
      movePatientToState: (patientId: string, to: PatientState) =>
        calls.push(`move:${patientId}:${to}`),
      selectPatient: (patientId: string) => calls.push(`select:${patientId}`),
      setQueueFilter: (filter: string | null) => calls.push(`queue:${filter}`),
      recordWorkflowAction: (input: { metadata?: Record<string, unknown>; type?: string }) => {
        calls.push(`workflow:${input.metadata?.handoff || input.type}`);
        return { id: 'log-1' };
      },
    };

    const result = completeReceptionHandoff(store, {
      patientId: 'patient-123',
      source: 'smart-intake',
    });

    expect(calls).toEqual([
      'move:patient-123:Triage',
      'update:patient-123',
      'queue:Triage',
      'select:patient-123',
      'workflow:reception.handoff',
      'update:patient-123',
      'workflow:encounter_created',
    ]);
    expect(result.receptionPath).toBe(
      `${CANONICAL_ROUTES.emergencyReception}?arrived=${encodeURIComponent('patient-123')}`,
    );
    expect(result.queuesPath).toBe(
      `${CANONICAL_ROUTES.emergencyReception}?queue=${encodeURIComponent('pretriage')}&patient=${encodeURIComponent('patient-123')}`,
    );
    expect(result.whiteboardPath).toBe(
      `${CANONICAL_ROUTES.emergencyWhiteboard}?patient=${encodeURIComponent('patient-123')}`,
    );
  });

  it('skips state move when patient is already in triage', () => {
    const calls: string[] = [];
    const store = {
      patients: [{ id: 'patient-456', state: PatientState.Triage, timeline: [] }],
      emergencySettings: {
        intakeSettings: { autoAssignTriageQueue: true, autoCreateEncounter: true },
      },
      updatePatient: (patientId: string) => calls.push(`update:${patientId}`),
      movePatientToState: (patientId: string, to: PatientState) =>
        calls.push(`move:${patientId}:${to}`),
      selectPatient: (patientId: string) => calls.push(`select:${patientId}`),
      setQueueFilter: (filter: string | null) => calls.push(`queue:${filter}`),
      recordWorkflowAction: (input: { type?: string; metadata?: Record<string, unknown> }) => {
        calls.push(`workflow:${input.metadata?.handoff || input.type}`);
        return { id: 'log-2' };
      },
    };

    completeReceptionHandoff(store, { patientId: 'patient-456', source: 'quick-intake' });

    expect(calls).toEqual([
      'update:patient-456',
      'queue:Triage',
      'select:patient-456',
      'workflow:reception.handoff',
      'update:patient-456',
      'workflow:encounter_created',
    ]);
  });
});
