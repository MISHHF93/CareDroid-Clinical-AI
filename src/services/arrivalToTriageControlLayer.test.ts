import { describe, expect, it } from 'vitest';
import { PatientFlag, PatientState, Priority, type Patient } from '../types/emergency';
import {
  buildArrivalControlSnapshot,
  queueDestinationToWhiteboardFilter,
  registerArrivalControl,
} from './arrivalControlLayer';
import { buildReceptionQuickIntakePatient } from './receptionQuickIntakeService';
import { completeReceptionHandoff, type IntakeHandoffStore } from './receptionHandoff';
import { buildPublicWaitingDisplaySnapshot } from '../components/whiteboard/publicWaitingDisplayModel';
import { WHITEBOARD_QUEUE_FILTER } from './queueAssignment';

function buildHandoffStore(initialPatients: Patient[] = []) {
  const patients = [...initialPatients];
  const websocketEvents: Array<{ type?: string; payload?: Record<string, unknown> }> = [];

  const store = {
    patients,
    referrals: [],
    emergencySettings: {
      intakeSettings: { autoAssignTriageQueue: true, autoCreateEncounter: true },
    },
    updatePatient: (patientId: string, patch: Partial<Patient>) => {
      const index = patients.findIndex((entry) => entry.id === patientId);
      if (index >= 0) patients[index] = { ...patients[index], ...patch };
    },
    movePatientToState: (patientId: string, to: PatientState) => {
      const index = patients.findIndex((entry) => entry.id === patientId);
      if (index >= 0) patients[index] = { ...patients[index], state: to };
    },
    selectPatient: () => {},
    setQueueFilter: () => {},
    dispatchWebSocketEvent: (event: { type?: string; payload?: Record<string, unknown> }) => {
      websocketEvents.push(event);
    },
    recordWorkflowAction: () => ({ id: 'wf-arrival-control' }),
    updateCapacity: () => {},
    updateAlerts: () => {},
    refreshAdministrativeAutomationsAsync: async () => ({} as any),
  };

  return { store, patients, websocketEvents };
}

describe('arrival-to-triage control layer', () => {
  it('captures full arrival control snapshot for police walk-in with safety flags', () => {
    const patient = buildReceptionQuickIntakePatient(
      {
        firstName: 'Alex',
        lastName: 'Morgan',
        complaint: 'Police escort — minor laceration',
        arrivalMode: 'police',
        quickSafetyFlags: [PatientFlag.PsychAlert, PatientFlag.HighRisk],
      },
      { now: '2026-06-20T12:00:00.000Z' },
    );

    const snapshot = buildArrivalControlSnapshot(patient);

    expect(snapshot).toMatchObject({
      arrivalMode: 'police',
      presentingComplaint: 'Police escort — minor laceration',
      registrationStatus: 'in-progress',
      queueDestination: 'verification',
      quickSafetyFlags: expect.arrayContaining([PatientFlag.PsychAlert, PatientFlag.HighRisk]),
    });
    expect(snapshot.arrivalTimestamp).toBe('2026-06-20T12:00:00.000Z');
  });

  it('routes new arrivals into triage queue, whiteboard, and operational snapshot surfaces', () => {
    const patient = buildReceptionQuickIntakePatient(
      {
        firstName: 'Jordan',
        lastName: 'Reed',
        complaint: 'Abdominal pain',
        arrivalMode: 'walk-in',
      },
      { now: '2026-06-20T14:00:00.000Z' },
    );

    const { store, patients, websocketEvents } = buildHandoffStore();
    patients.push(patient);

    const registered = registerArrivalControl(store, patient.id, {
      source: 'reception-quick-intake',
    });
    expect(registered?.queueDestination).toBe('verification');

    const handoff = completeReceptionHandoff(store as unknown as IntakeHandoffStore, {
      patientId: patient.id,
      source: 'reception-quick-intake',
    });

    const updated = patients[0];
    const control = buildArrivalControlSnapshot(updated);

    expect(updated.state).toBe(PatientState.Triage);
    expect(control.triagePending).toBe(true);
    expect(control.registrationStatus).toBe('complete');
    expect(control.queueDestination).toBe('triage-queue');
    expect(queueDestinationToWhiteboardFilter(control.queueDestination)).toBe(
      WHITEBOARD_QUEUE_FILTER.triage,
    );

    const syncEvents = websocketEvents.filter((event) => event.type === 'arrival_control_sync');
    expect(syncEvents.length).toBeGreaterThanOrEqual(1);
    expect(
      syncEvents.some((event) =>
        Array.isArray(event.payload?.surfaces) &&
        (event.payload?.surfaces as string[]).includes('operational-snapshot'),
      ),
    ).toBe(true);

    expect(handoff.queue).toBe(WHITEBOARD_QUEUE_FILTER.triage);

    const publicSnapshot = buildPublicWaitingDisplaySnapshot({
      patients,
      referrals: [],
      capacity: {
        score: 40,
        band: 'Green',
        occupiedBeds: 10,
        totalBeds: 20,
        waitingCount: 1,
        boardingCount: 0,
        totalPatients: 10,
        occupiedRooms: 10,
        reassessmentDue: 0,
        updatedAt: '2026-06-20T14:00:00.000Z',
      } as import('../types/emergency').CapacitySnapshot,
    });

    expect(publicSnapshot.statusMessaging).toBeTruthy();
    expect(publicSnapshot.crowdLevel).toBeTruthy();
  });

  it('routes high-risk complaint arrivals to rapid review triage queue', () => {
    const patient = buildReceptionQuickIntakePatient(
      {
        firstName: 'Casey',
        lastName: 'Ng',
        complaint: 'Chest pain',
        arrivalMode: 'EMS',
      },
      { now: '2026-06-20T15:00:00.000Z' },
    );

    const { store, patients } = buildHandoffStore();
    patients.push({ ...patient, priority: Priority.P2 });

    const snapshot = registerArrivalControl(store, patient.id, {
      source: 'ems-convert',
      route: true,
    });

    expect(snapshot?.queueDestination).toBe('rapid-review');
    expect(snapshot?.triagePending).toBe(true);
    expect(snapshot?.arrivalMode).toBe('EMS');
  });
});
