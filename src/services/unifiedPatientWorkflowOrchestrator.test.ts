import './_workflowTestMocks';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { useEmergencyStore } from '../store/emergencyStore';
import { PatientState, Priority, type Patient } from '../types/emergency';
import {
  afterPatientWorkflowTransition,
  buildPatientWorkflowContext,
  syncPatientWorkflowSurfaces,
} from './unifiedPatientWorkflowOrchestrator';

const originalState = useEmergencyStore.getState();

function basePatient(patch: Partial<Patient> = {}): Patient {
  return {
    id: 'patient-workflow-1',
    mrn: 'MRN-1',
    firstName: 'Alex',
    lastName: 'Rivera',
    dob: '1988-04-02',
    age: 38,
    sex: 'F',
    state: PatientState.Registration,
    priority: Priority.P3,
    chiefComplaint: 'Abdominal pain',
    complaintCategory: 'GI',
    flags: [],
    vitals: [],
    notes: [],
    timeline: [],
    ...patch,
  } as Patient;
}

function resetStore(patients: Patient[] = [basePatient()]) {
  useEmergencyStore.setState(
    {
      ...originalState,
      patients,
      alerts: [],
      workflowLogs: [],
      referrals: [],
      selectedPatientId: null,
      dispatchWebSocketEvent: vi.fn(),
      refreshAdministrativeAutomationsAsync: vi.fn().mockResolvedValue({
        engineId: 'unified-clinical-workflow-orchestrator',
        generatedAt: '2026-01-01T00:00:00.000Z',
        tasks: [],
        metrics: {
          pendingReview: 0,
          executedToday: 0,
          overridden: 0,
          byCategory: {},
        },
        safetyStatement: 'test',
      }),
    },
    true,
  );
}

describe('unifiedPatientWorkflowOrchestrator', () => {
  beforeEach(() => {
    resetStore();
  });

  it('builds workflow context with route and automation metadata', () => {
    const patient = basePatient();
    const context = buildPatientWorkflowContext(
      patient,
      PatientState.Registration,
      PatientState.Triage,
      'enc-1',
    );
    expect(context.patientName).toBe('Alex Rivera');
    expect(context.encounterId).toBe('enc-1');
    expect(context.toStepId).toBe('triage');
    expect(context.route).toContain('patient-workflow-1');
    expect(context.clicksSavedEstimate).toBeGreaterThan(0);
  });

  it('syncs surfaces and records workflow actions on transition', () => {
    const events: string[] = [];
    const store = useEmergencyStore.getState();
    store.dispatchWebSocketEvent = (event) => {
      const record = event as { type?: string };
      events.push(String(record.type));
    };

    const patient = basePatient({ state: PatientState.Triage });
    const context = buildPatientWorkflowContext(
      patient,
      PatientState.Registration,
      PatientState.Triage,
      'enc-2',
    );

    syncPatientWorkflowSurfaces(store, {
      patientId: patient.id,
      fromState: PatientState.Registration,
      toState: PatientState.Triage,
      source: 'intake-handoff',
      context,
    });

    expect(events).toContain('journey_state_changed');
    expect(
      useEmergencyStore.getState().workflowLogs.some((log) => log.patientId === patient.id),
    ).toBe(true);
  });

  it('afterPatientWorkflowTransition selects patient and returns next route', () => {
    const result = afterPatientWorkflowTransition(useEmergencyStore.getState(), {
      patientId: 'patient-workflow-1',
      fromState: PatientState.Registration,
      toState: PatientState.Triage,
      source: 'reception',
      actorName: 'Desk Clerk',
    });

    expect(result.ok).toBe(true);
    expect(result.nextRoute).toContain('patient-workflow-1');
    expect(useEmergencyStore.getState().selectedPatientId).toBe('patient-workflow-1');
  });
});
