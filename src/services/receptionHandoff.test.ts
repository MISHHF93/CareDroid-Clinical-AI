import { describe, expect, it } from 'vitest';
import { CANONICAL_ROUTES } from '../config/routes.config';
import { PatientState } from '../types/emergency';
import {
  buildPostHandoffNavigationPaths,
  completeIntakeHandoff,
  completeReceptionHandoff,
} from './receptionHandoff';

function buildStore(patient: { id: string; state: PatientState; timeline?: unknown[] }) {
  const calls: string[] = [];
  const store = {
    patients: [patient],
    emergencySettings: {
      intakeSettings: { autoAssignTriageQueue: true, autoCreateEncounter: true },
    },
    updatePatient: (patientId: string) => calls.push(`update:${patientId}`),
    movePatientToState: (patientId: string, to: PatientState) =>
      calls.push(`move:${patientId}:${to}`),
    selectPatient: (patientId: string) => calls.push(`select:${patientId}`),
    setQueueFilter: (filter: string | null) => calls.push(`queue:${filter}`),
    dispatchWebSocketEvent: () => calls.push('websocket:intake_handoff_complete'),
    recordWorkflowAction: (input: { metadata?: Record<string, unknown>; type?: string }) => {
      calls.push(`workflow:${input.metadata?.handoff || input.type}`);
      return { id: 'log-1' };
    },
  };
  return { store, calls };
}

describe('receptionHandoff', () => {
  it('moves patient to triage, selects patient, sets queue, creates encounter, and syncs surfaces', () => {
    const { store, calls } = buildStore({
      id: 'patient-123',
      state: PatientState.Registration,
      timeline: [],
    });

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
      'websocket:intake_handoff_complete',
      'workflow:intake.complete',
      'update:patient-123',
    ]);
    expect(result.receptionPath).toBe(
      `${CANONICAL_ROUTES.emergencyReception}?arrived=${encodeURIComponent('patient-123')}`,
    );
    expect(result.queuesPath).toBe(
      `${CANONICAL_ROUTES.emergencyReception}?queue=${encodeURIComponent('pretriage')}&patient=${encodeURIComponent('patient-123')}`,
    );
    expect(result.whiteboardPath).toBe(
      `${CANONICAL_ROUTES.emergencyWhiteboard}?patient=${encodeURIComponent('patient-123')}&encounter=${encodeURIComponent('encounter-patient-123')}`,
    );
    expect(result.encounterId).toBe('encounter-patient-123');
    expect(result.createdEncounter).toBe(true);
    expect(result.queue).toBe('Triage');
  });

  it('skips state move when patient is already in triage', () => {
    const { store, calls } = buildStore({
      id: 'patient-456',
      state: PatientState.Triage,
      timeline: [],
    });

    completeReceptionHandoff(store, { patientId: 'patient-456', source: 'quick-intake' });

    expect(calls).toEqual([
      'update:patient-456',
      'queue:Triage',
      'select:patient-456',
      'workflow:reception.handoff',
      'update:patient-456',
      'workflow:encounter_created',
      'websocket:intake_handoff_complete',
      'workflow:intake.complete',
      'update:patient-456',
    ]);
  });

  it('completeIntakeHandoff supports whiteboard central intake source', () => {
    const { store, calls } = buildStore({
      id: 'patient-789',
      state: PatientState.Triage,
      timeline: [],
    });

    const result = completeIntakeHandoff(store, {
      patientId: 'patient-789',
      source: 'whiteboard-central-intake',
    });

    expect(calls).toContain('workflow:intake.complete');
    expect(result.encounterId).toBe('encounter-patient-789');
    expect(result.whiteboardPath).toContain('encounter=');
  });

  it('builds post-handoff navigation without re-running queue assignment', () => {
    const paths = buildPostHandoffNavigationPaths('patient-123', 'encounter-patient-123');
    expect(paths.receptionPath).toBe(
      `${CANONICAL_ROUTES.emergencyReception}?arrived=${encodeURIComponent('patient-123')}`,
    );
    expect(paths.whiteboardPath).toContain('patient=patient-123');
    expect(paths.queuesPath).toContain('queue=pretriage');
  });
});
