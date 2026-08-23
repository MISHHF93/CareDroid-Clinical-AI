import { describe, expect, it } from 'vitest';
import { PatientState, Priority, type Patient } from '../types/emergency';
import { registerNewArrival } from './arrivalControlLayer';
import { readIntakeEncounterChain } from './intakeEncounterChain';
import { completeReceptionHandoff, type IntakeHandoffStore } from './receptionHandoff';
import { buildReceptionQuickIntakePatient } from './receptionQuickIntakeService';
import { buildSelfCheckinPatient, createEmptySelfCheckinForm } from './selfCheckinService';
import { completeSelfCheckinWhiteboardHandoff } from './selfCheckinWhiteboardHandoff';
import { WHITEBOARD_QUEUE_FILTER } from './queueAssignment';

function buildHandoffStore(initialPatients: Patient[] = []) {
  const patients = [...initialPatients];
  const websocketEvents: Array<{ type?: string; payload?: Record<string, unknown> }> = [];
  let selectedPatientId: string | null = null;
  let queueFilter: string | null = null;

  const store = {
    patients,
    emergencySettings: {
      intakeSettings: { autoAssignTriageQueue: true, autoCreateEncounter: true },
    },
    addPatient: (patient: Patient) => {
      patients.push(patient);
    },
    updatePatient: (patientId: string, patch: Partial<Patient>) => {
      const index = patients.findIndex((entry) => entry.id === patientId);
      if (index >= 0) patients[index] = { ...patients[index], ...patch };
    },
    movePatientToState: (patientId: string, to: PatientState) => {
      const index = patients.findIndex((entry) => entry.id === patientId);
      if (index >= 0) patients[index] = { ...patients[index], state: to };
    },
    selectPatient: (patientId: string) => {
      selectedPatientId = patientId;
    },
    setQueueFilter: (filter: string | null) => {
      queueFilter = filter;
    },
    dispatchWebSocketEvent: (event: { type?: string; payload?: Record<string, unknown> }) => {
      websocketEvents.push(event);
    },
    recordWorkflowAction: () => ({ id: 'wf-handoff' }),
    updateCapacity: () => undefined,
    updateAlerts: () => undefined,
  };

  return { store, patients, websocketEvents, getSelectedPatientId: () => selectedPatientId, getQueueFilter: () => queueFilter };
}

describe('reception to whiteboard handoff chain', () => {
  it('connects patient search/create through queue assignment to operational surfaces', () => {
    const patient = buildReceptionQuickIntakePatient(
      {
        firstName: 'Jordan',
        lastName: 'Reed',
        dob: '1992-04-08',
        complaint: 'Abdominal pain',
        arrivalMode: 'walk-in',
      },
      { actorId: 'registration-clerk', now: '2026-06-20T14:00:00.000Z' },
    );

    const { store, patients, websocketEvents, getSelectedPatientId, getQueueFilter } =
      buildHandoffStore();

    patients.push(patient);

    registerNewArrival(store, patient.id, { source: 'reception-quick-intake' });

    const handoff = completeReceptionHandoff(store as unknown as IntakeHandoffStore, {
      patientId: patient.id,
      source: 'reception-quick-intake',
      actorName: 'Registration Clerk',
    });

    const updated = patients[0];
    const chain = readIntakeEncounterChain(updated, handoff.encounterId, handoff.queue);

    expect(updated.state).toBe(PatientState.Triage);
    expect(chain.connected).toBe(true);
    expect(chain.arrivalReason).toBe('Abdominal pain');
    expect(chain.queue).toBe(WHITEBOARD_QUEUE_FILTER.triage);
    expect(handoff.encounterId).toBeTruthy();
    expect(getSelectedPatientId()).toBe(patient.id);
    expect(getQueueFilter()).toBe(WHITEBOARD_QUEUE_FILTER.triage);

    expect(websocketEvents.some((event) => event.type === 'intake_handoff_complete')).toBe(true);
    expect(websocketEvents.some((event) => event.type === 'arrival_control_sync')).toBe(true);

    expect(handoff.whiteboardPath).toContain(`patient=${encodeURIComponent(patient.id)}`);
    expect(handoff.whiteboardPath).toContain('encounter=');
    expect(handoff.queuesPath).toContain('queue=pretriage');
  });

  it('connects self-check-in through arrival control to the whiteboard triage queue', async () => {
    const result = buildSelfCheckinPatient(
      {
        ...createEmptySelfCheckinForm(),
        firstName: 'Alex',
        lastName: 'Kim',
        complaint: 'Chest pain',
        noKnownAllergies: true,
      },
      { now: '2026-06-24T10:00:00.000Z', patientId: 'self-arrival-handoff-1' },
    );

    const { store, patients, websocketEvents, getSelectedPatientId, getQueueFilter } =
      buildHandoffStore();

    // completeSelfCheckinWhiteboardHandoff is async (it awaits a backend
    // sync) -- must be awaited to get the resolved { handoff, backendSynced }
    // result rather than the Promise itself. syncToBackend: false keeps this
    // test focused on the local handoff/store logic it actually exercises.
    const { handoff } = await completeSelfCheckinWhiteboardHandoff(store as never, result, {
      syncToBackend: false,
    });

    const updated = patients.find((entry) => entry.id === 'self-arrival-handoff-1');
    expect(updated).toBeTruthy();
    expect(updated?.state).toBe(PatientState.Triage);
    expect(updated?.arrival?.waitingRoomStatus).toBe('waiting-for-triage');
    expect(getSelectedPatientId()).toBe('self-arrival-handoff-1');
    expect(getQueueFilter()).toBe(WHITEBOARD_QUEUE_FILTER.triage);
    expect(handoff.whiteboardPath).toContain('patient=self-arrival-handoff-1');
    expect(websocketEvents.some((event) => event.type === 'intake_handoff_complete')).toBe(true);
    expect(websocketEvents.some((event) => event.type === 'arrival_control_sync')).toBe(true);
  });
});
