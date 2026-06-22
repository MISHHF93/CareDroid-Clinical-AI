import { describe, expect, it } from 'vitest';
import { PatientFlag, PatientState, Priority, type Patient } from '../types/emergency';
import {
  buildArrivalControlFields,
  buildArrivalControlSnapshot,
  buildArrivalControlSummary,
  deriveQueueDestination,
  deriveRegistrationStatus,
  deriveTriagePending,
  normalizeArrivalMode,
  queueDestinationToWhiteboardFilter,
  registerArrivalControl,
  registerNewArrival,
  routeArrivalToDestination,
  toArrivalControlStore,
} from './arrivalControlLayer';

function buildPatient(overrides: Partial<Patient> = {}): Patient {
  return {
    id: 'patient-1',
    mrn: 'ED-123456',
    firstName: 'Jane',
    lastName: 'Doe',
    dob: '1990-01-01',
    age: 35,
    sex: 'F',
    arrivalTime: '2026-06-20T10:00:00.000Z',
    chiefComplaint: 'Chest pain',
    complaintCategory: 'Chest pain',
    state: PatientState.Registration,
    priority: Priority.P3,
    vitals: [],
    flags: [],
    notes: [],
    timeline: [],
    source: 'WalkIn',
    ...overrides,
  };
}

describe('arrivalControlLayer', () => {
  it('normalizes arrival modes including police and EMS', () => {
    expect(normalizeArrivalMode('walkin')).toBe('walk-in');
    expect(normalizeArrivalMode('EMS')).toBe('EMS');
    expect(normalizeArrivalMode('police')).toBe('police');
    expect(normalizeArrivalMode('transfer')).toBe('transfer');
    expect(normalizeArrivalMode(null, buildPatient({ flags: [PatientFlag.EMSArrival] }))).toBe(
      'EMS',
    );
  });

  it('builds a complete arrival control snapshot from patient data', () => {
    const snapshot = buildArrivalControlSnapshot(
      buildPatient({
        arrivalMode: 'walk-in',
        flags: [PatientFlag.HighRisk],
        state: PatientState.Triage,
        triagePending: true,
        firstContactAt: '2026-06-20T10:05:00.000Z',
        queueDestination: 'triage-queue',
      }),
    );

    expect(snapshot).toMatchObject({
      patientId: 'patient-1',
      arrivalMode: 'walk-in',
      presentingComplaint: 'Chest pain',
      quickSafetyFlags: [PatientFlag.HighRisk],
      highRiskComplaintFlags: [],
      registrationStatus: 'complete',
      triagePending: true,
      firstContactTimestamp: '2026-06-20T10:05:00.000Z',
      queueDestination: 'triage-queue',
    });
  });

  it('derives registration and queue destination for legacy patients', () => {
    const patient = buildPatient({ state: PatientState.Registration, flags: [PatientFlag.EMSArrival] });
    expect(deriveRegistrationStatus(patient)).toBe('in-progress');
    expect(deriveQueueDestination(patient)).toBe('ems-registration');
    expect(deriveTriagePending(buildPatient({ state: PatientState.Triage }))).toBe(true);
  });

  it('builds arrival control fields for new walk-in registration', () => {
    const fields = buildArrivalControlFields({
      arrivalMode: 'walk-in',
      state: PatientState.Registration,
      presentingComplaint: 'Abdominal pain',
    });

    expect(fields).toMatchObject({
      arrivalMode: 'walk-in',
      registrationStatus: 'in-progress',
      triagePending: false,
      queueDestination: 'verification',
    });
  });

  it('routes arrival to triage queue and syncs operational surfaces', () => {
    const events: string[] = [];
    const store = {
      patients: [buildPatient()],
      updatePatient: () => events.push('update'),
      dispatchWebSocketEvent: (event: { type: string }) => events.push(event.type),
    };

    const snapshot = routeArrivalToDestination(store, 'patient-1', 'triage-queue', {
      source: 'test-handoff',
    });

    expect(snapshot?.queueDestination).toBe('triage-queue');
    expect(snapshot?.triagePending).toBe(true);
    expect(events).toContain('update');
    expect(events).toContain('arrival_control_sync');
  });

  it('summarizes arrival control metrics across active patients', () => {
    const summary = buildArrivalControlSummary([
      buildPatient({ id: 'a', state: PatientState.Triage, triagePending: true }),
      buildPatient({
        id: 'b',
        state: PatientState.Registration,
        arrivalMode: 'EMS',
        flags: [PatientFlag.EMSArrival],
      }),
      buildPatient({ id: 'c', state: PatientState.Waiting, queueDestination: 'waiting-room' }),
    ]);

    expect(summary.triagePending).toBe(1);
    expect(summary.awaitingRegistration).toBe(1);
    expect(summary.inWaitingRoom).toBe(1);
    expect(summary.byMode.EMS).toBe(1);
  });

  it('routes high-risk complaint arrivals to rapid review on register', () => {
    const updates: Partial<Patient>[] = [];
    const store = {
      patients: [buildPatient({ chiefComplaint: 'Chest pain', complaintCategory: 'Chest pain' })],
      updatePatient: (_id: string, patch: Partial<Patient>) => {
        updates.push(patch);
      },
      dispatchWebSocketEvent: () => {},
      recordWorkflowAction: () => {},
    };

    const snapshot = registerNewArrival(store, 'patient-1', { source: 'express-register' });

    expect(updates.some((patch) => patch.highRiskComplaintFlags?.length)).toBe(true);
    expect(snapshot?.queueDestination).toBe('rapid-review');
    expect(snapshot?.triagePending).toBe(true);
  });

  it('registers arrival control and emits sync event', () => {
    const events: string[] = [];
    const store = {
      patients: [
        buildPatient({
          arrivalMode: 'walk-in',
          chiefComplaint: 'Medication refill',
          complaintCategory: 'Other',
        }),
      ],
      updatePatient: () => events.push('update'),
      dispatchWebSocketEvent: (event: { type: string }) => events.push(event.type),
    };

    registerArrivalControl(store, 'patient-1', { source: 'express-register' });

    expect(events).toEqual(['update', 'arrival_control_sync']);
  });

  it('maps queue destinations to whiteboard filters', () => {
    expect(queueDestinationToWhiteboardFilter('triage-queue')).toBe('Triage');
    expect(queueDestinationToWhiteboardFilter('waiting-room')).toBe('Waiting');
    expect(queueDestinationToWhiteboardFilter('verification')).toBeNull();
  });

  it('adapts store slices through toArrivalControlStore', () => {
    const store = {
      patients: [buildPatient()],
      updatePatient: () => {},
      dispatchWebSocketEvent: () => {},
    };
    const adapted = toArrivalControlStore(store);
    expect(adapted.patients).toHaveLength(1);
    expect(typeof adapted.updatePatient).toBe('function');
  });
});
