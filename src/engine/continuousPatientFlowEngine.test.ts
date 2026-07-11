import { describe, expect, it } from 'vitest';
import {
  buildContinuousPatientFlowSnapshot,
  buildPatientFlowPatientSnapshot,
  resolveWorkflowStateForPatient,
} from './continuousPatientFlowEngine';
import { PatientFlag, PatientState, Priority, type Patient } from '../types/emergency';

function makePatient(overrides: Partial<Patient> = {}): Patient {
  const now = Date.now();
  return {
    id: 'p-test',
    mrn: 'ED-TEST',
    firstName: 'Flow',
    lastName: 'Patient',
    dob: '1990-01-01',
    age: 36,
    sex: 'F',
    arrivalTime: new Date(now - 90 * 60000).toISOString(),
    chiefComplaint: 'Abdominal pain',
    state: PatientState.Waiting,
    priority: Priority.P2,
    vitals: [],
    flags: [],
    notes: [],
    timeline: [],
    ...overrides,
  } as unknown as Patient;
}

describe('continuousPatientFlowEngine', () => {
  it('maps clinical states to canonical workflow stages', () => {
    expect(resolveWorkflowStateForPatient(makePatient({ state: PatientState.Registration }))).toBe(
      'registration',
    );
    expect(
      resolveWorkflowStateForPatient(
        makePatient({ state: PatientState.Waiting, flags: [PatientFlag.ReassessmentDue] }),
      ),
    ).toBe('reassessment');
    expect(
      resolveWorkflowStateForPatient(
        makePatient({
          state: PatientState.Disposition,
          flags: [PatientFlag.PendingAdmission],
        }),
      ),
    ).toBe('admission');
  });

  it('builds per-patient snapshots with ownership, wait timers, and next steps', () => {
    const patient = makePatient({
      assignedStaffId: 's1',
      timeline: [
        {
          id: 'evt-1',
          patientId: 'p-test',
          type: 'StateChange',
          timestamp: new Date(Date.now() - 50 * 60000).toISOString(),
          summary: 'Moved to waiting',
          to: PatientState.Waiting,
          metadata: { toState: PatientState.Waiting },
        },
      ],
    });

    const snapshot = buildPatientFlowPatientSnapshot(patient, {
      staff: [{ id: 's1', name: 'Dr. Patel', role: 'MD', status: 'Available' as any, active: true }],
      now: new Date(),
    });

    expect(snapshot).toEqual(
      expect.objectContaining({
        patientId: 'p-test',
        workflowStateId: 'waiting',
        ownerName: 'Dr. Patel',
        stageWaitMinutes: 50,
        predictedNextStep: expect.any(String),
      }),
    );
  });

  it('detects congestion, overload, and delayed handoffs across the department', () => {
    const patients = [
      makePatient({
        id: 'p1',
        state: PatientState.Waiting,
        arrivalTime: new Date(Date.now() - 120 * 60000).toISOString(),
        timeline: [
          {
            id: 'evt-p1',
            patientId: 'p1',
            type: 'StateChange',
            timestamp: new Date(Date.now() - 70 * 60000).toISOString(),
            summary: 'Waiting',
            to: PatientState.Waiting,
          metadata: { toState: PatientState.Waiting },
          },
        ],
      }),
      makePatient({
        id: 'p2',
        state: PatientState.Triage,
        priority: Priority.P1,
        arrivalTime: new Date(Date.now() - 40 * 60000).toISOString(),
        timeline: [
          {
            id: 'evt-p2',
            patientId: 'p2',
            type: 'StateChange',
            timestamp: new Date(Date.now() - 25 * 60000).toISOString(),
            summary: 'Triage',
            to: PatientState.Triage,
            metadata: { toState: PatientState.Triage },
          },
        ],
      }),
    ];

    const snapshot = buildContinuousPatientFlowSnapshot({ patients, now: new Date() });

    expect(snapshot.engineId).toBe('continuous-patient-flow-engine');
    expect(snapshot.patients.length).toBe(2);
    expect(snapshot.metrics.trackedPatients).toBe(2);
    expect(snapshot.detections.length).toBeGreaterThan(0);
    expect(snapshot.aiRecommendations.length).toBeGreaterThan(0);
    expect(snapshot.departments.some((entry) => entry.stageId === 'waiting')).toBe(true);
  });
});