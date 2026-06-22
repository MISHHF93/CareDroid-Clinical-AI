import { describe, expect, it } from 'vitest';
import { PatientState, Priority, type Patient } from '../types/emergency';
import { registerNewArrival } from './arrivalControlLayer';
import { readIntakeEncounterChain } from './intakeEncounterChain';
import { completeReceptionHandoff } from './receptionHandoff';
import { buildReceptionQuickIntakePatient } from './receptionQuickIntakeService';
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

    const handoff = completeReceptionHandoff(store, {
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
});
