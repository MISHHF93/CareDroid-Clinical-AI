import { describe, expect, it, vi } from 'vitest';
import { PatientFlag, PatientState, Priority, type Patient } from '../types/emergency';
import {
  buildLiveQueueStateFromPatients,
  enterEmsRegistrationQueue,
  enterTriageQueue,
  getDefaultNextPatientState,
  isPatientInEmsRegistrationQueue,
  isPatientInVerificationQueue,
  matchesWhiteboardQueueFilter,
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
      { ...triagePatient, id: 'p-reg', state: PatientState.Registration },
    ]);
    expect(state['triage-queue'].count).toBe(1);
    expect(state['waiting-room'].count).toBe(2);
  });

  it('matches EMS whiteboard filter for EMS registration patients', () => {
    const emsPatient: Patient = {
      ...triagePatient,
      flags: [PatientFlag.EMSArrival],
      state: PatientState.Registration,
    };
    expect(matchesWhiteboardQueueFilter(emsPatient, 'EMS')).toBe(true);
    expect(matchesWhiteboardQueueFilter(triagePatient, 'EMS')).toBe(false);
  });

  it('rejects triage assignment from non-journey states', () => {
    const store = {
      patients: [{ ...triagePatient, state: PatientState.Assessment }],
      emergencySettings: {},
      movePatientToState: vi.fn(),
      updatePatient: vi.fn(),
      setQueueFilter: vi.fn(),
      selectPatient: vi.fn(),
      recordWorkflowAction: vi.fn(),
    };

    const result = enterTriageQueue(store, { patientId: triagePatient.id });
    expect(result).toEqual({ ok: false, reason: 'invalid_state' });
  });

  it('identifies verification queue membership', () => {
    expect(isPatientInVerificationQueue(triagePatient)).toBe(true);
    expect(
      isPatientInVerificationQueue({
        ...triagePatient,
        flags: [PatientFlag.EMSArrival],
      }),
    ).toBe(false);
  });

  it('splits referral and discharge disposition queues', () => {
    const referralIds = new Set(['p-ref']);
    const state = buildLiveQueueStateFromPatients(
      [
        { ...triagePatient, id: 'p-ref', state: PatientState.Disposition },
        { ...triagePatient, id: 'p-dc', state: PatientState.Disposition },
      ],
      referralIds,
    );
    expect(state['referral-queue'].count).toBe(1);
    expect(state['discharge-queue'].count).toBe(1);
  });

  it('picks journey-legal default next states instead of enum order', () => {
    expect(
      getDefaultNextPatientState({ ...triagePatient, state: PatientState.Admission }),
    ).toBe(PatientState.Discharge);
    expect(
      getDefaultNextPatientState({ ...triagePatient, state: PatientState.Disposition }),
    ).toBe(PatientState.Discharge);
    expect(
      getDefaultNextPatientState({
        ...triagePatient,
        state: PatientState.Disposition,
        flags: [PatientFlag.PendingAdmission],
      }),
    ).toBe(PatientState.Admission);
    expect(
      getDefaultNextPatientState({ ...triagePatient, state: PatientState.Results }),
    ).toBe(PatientState.Disposition);
  });
});
