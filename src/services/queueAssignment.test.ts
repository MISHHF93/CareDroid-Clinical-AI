import { describe, expect, it, vi } from 'vitest';
import { PatientFlag, PatientState, Priority, type Patient } from '../types/emergency';
import {
  buildLiveQueueStateFromPatients,
  enterEmsRegistrationQueue,
  enterTriageQueue,
  isPatientInEmsRegistrationQueue,
} from './queueAssignment';

const triagePatient: Patient = {
  id: 'p-triage',
  mrn: 'ED-1',
  firstName: 'Ava',
  lastName: 'Stone',
  dob: '1990-01-01',
  age: 36,
  sex: 'F',
  arrivalTime: '2026-06-17T12:00:00.000Z',
  chiefComplaint: 'Chest pain',
  complaintCategory: 'Chest Pain',
  state: PatientState.Registration,
  priority: Priority.P3,
  vitals: [],
  flags: [],
  notes: [],
  timeline: [],
};

describe('queueAssignment', () => {
  it('assigns patients to the triage queue and syncs whiteboard filter', () => {
    const calls: string[] = [];
    const store = {
      patients: [triagePatient],
      emergencySettings: { intakeSettings: { autoAssignTriageQueue: true } },
      movePatientToState: (patientId: string, to: PatientState) =>
        calls.push(`move:${patientId}:${to}`),
      updatePatient: (patientId: string) => calls.push(`update:${patientId}`),
      setQueueFilter: (filter: string | null) => calls.push(`filter:${filter}`),
      selectPatient: () => undefined,
      recordWorkflowAction: () => {
        calls.push('workflow');
        return { id: 'wf-1' };
      },
    };

    const result = enterTriageQueue(store, {
      patientId: triagePatient.id,
      source: 'quick-intake',
    });

    expect(result.ok).toBe(true);
    expect(calls).toEqual([
      `move:${triagePatient.id}:Triage`,
      `update:${triagePatient.id}`,
      'filter:Triage',
      'workflow',
    ]);
  });

  it('detects EMS registration queue membership', () => {
    expect(
      isPatientInEmsRegistrationQueue({
        state: PatientState.Registration,
        flags: [PatientFlag.EMSArrival],
      }),
    ).toBe(true);
  });

  it('records EMS registration queue entry', () => {
    const selectPatient = vi.fn();
    const store = {
      patients: [
        {
          ...triagePatient,
          flags: [PatientFlag.EMSArrival],
        },
      ],
      emergencySettings: {},
      movePatientToState: vi.fn(),
      updatePatient: vi.fn(),
      setQueueFilter: vi.fn(),
      selectPatient,
      recordWorkflowAction: vi.fn(() => ({ id: 'wf-3' })),
    };

    const result = enterEmsRegistrationQueue(store, {
      patientId: triagePatient.id,
      emsArrivalId: 'ems-1',
    });

    expect(result).toEqual({ ok: true, queue: 'ems' });
    expect(selectPatient).toHaveBeenCalledWith(triagePatient.id);
  });

  it('builds live queue state from board patients', () => {
    const state = buildLiveQueueStateFromPatients([
      { ...triagePatient, state: PatientState.Triage },
      { ...triagePatient, id: 'p-wait', state: PatientState.Waiting },
    ]);
    expect(state['triage-queue'].count).toBe(1);
    expect(state['waiting-room'].count).toBe(1);
  });
});
