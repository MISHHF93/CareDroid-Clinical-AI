import { describe, expect, it } from 'vitest';
import {
  PatientFlag,
  PatientState,
  Priority,
  type Patient,
  type TriageAcuity,
} from '../types/emergency';
import {
  buildPatientArrivalRecord,
  deriveWaitingRoomStatus,
  normalizePatientArrival,
  priorityToTriageAcuity,
  stampPatientArrivalAtHandoff,
  syncPatientFromArrival,
  triageAcuityToPriority,
} from './patientArrivalModel';

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

describe('patientArrivalModel', () => {
  it('maps priority to triage acuity and back', () => {
    const acuity = priorityToTriageAcuity(Priority.P2, {
      status: 'suggested',
      suggestionSource: 'rules',
    });

    expect(acuity).toMatchObject({
      code: Priority.P2,
      system: 'PRIORITY',
      level: 2,
      status: 'suggested',
      suggestionSource: 'rules',
    });
    expect(triageAcuityToPriority(acuity)).toBe(Priority.P2);
  });

  it('normalizes legacy patient fields into a full arrival record', () => {
    const arrival = normalizePatientArrival(
      buildPatient({
        source: 'Self-arrival',
        state: PatientState.Triage,
        triagePending: true,
        triageAssist: {
          suggestedPriority: Priority.P3,
          suggestedQueue: 'triage',
          rationale: ['Self-arrival complaint parsed.'],
          confidence: 'medium',
          ruleTriggered: 'self-arrival-triage',
          disclaimers: ['Human review required.'],
          requiresHumanReview: true,
          generatedAt: '2026-06-20T10:01:00.000Z',
          source: 'rules',
        },
      }),
    );

    expect(arrival).toMatchObject({
      arrivalMode: 'self-check-in',
      arrivalTimestamp: '2026-06-20T10:00:00.000Z',
      chiefComplaint: 'Chest pain',
      waitingRoomStatus: 'waiting-for-triage',
      registrationStatus: 'complete',
      queueDestination: 'triage-queue',
      triagePending: true,
      triageAcuity: {
        code: Priority.P3,
        level: 3,
        status: 'suggested',
        suggestionSource: 'self-arrival',
      },
    });
  });

  it('normalizes arrival when chiefComplaint is missing on the arrival block', () => {
    const arrival = normalizePatientArrival(
      buildPatient({
        chiefComplaint: 'Chest pain',
        arrival: {
          arrivalMode: 'walk-in',
          arrivalTimestamp: '2026-06-20T09:00:00.000Z',
          triageAcuity: { code: Priority.P3, status: 'unassigned' } as unknown as TriageAcuity,
          waitingRoomStatus: 'waiting-for-clinician',
        } as unknown as Patient['arrival'],
      }),
    );

    expect(arrival.chiefComplaint).toBe('Chest pain');
  });

  it('prefers stored arrival block when present', () => {
    const arrival = normalizePatientArrival(
      buildPatient({
        arrival: buildPatientArrivalRecord({
          arrivalMode: 'referral',
          arrivalTimestamp: '2026-06-20T09:00:00.000Z',
          chiefComplaint: 'Specialist referral chest pain',
          triageAcuity: { code: Priority.P2, status: 'confirmed' },
          waitingRoomStatus: 'waiting-for-triage',
        }),
      }),
    );

    expect(arrival.arrivalMode).toBe('referral');
    expect(arrival.chiefComplaint).toBe('Specialist referral chest pain');
    expect(arrival.triageAcuity.status).toBe('confirmed');
  });

  it('builds a canonical arrival record for reception intake', () => {
    const arrival = buildPatientArrivalRecord({
      arrivalMode: 'walk-in',
      arrivalTimestamp: '2026-06-20T12:00:00.000Z',
      chiefComplaint: 'Abdominal pain',
      state: PatientState.Registration,
    });

    expect(arrival).toMatchObject({
      arrivalMode: 'walk-in',
      chiefComplaint: 'Abdominal pain',
      registrationStatus: 'in-progress',
      queueDestination: 'verification',
      waitingRoomStatus: 'registered',
      triageAcuity: {
        code: Priority.P3,
        status: 'unassigned',
      },
    });
  });

  it('dual-writes legacy patient fields from arrival record', () => {
    const arrival = buildPatientArrivalRecord({
      arrivalMode: 'self-check-in',
      chiefComplaint: 'Sore throat',
      state: PatientState.Triage,
      triagePending: true,
      waitingRoomStatus: 'waiting-for-triage',
    });

    const synced = syncPatientFromArrival({ id: 'patient-2', mrn: 'SA-1' }, arrival);

    expect(synced).toMatchObject({
      arrival,
      arrivalTime: arrival.arrivalTimestamp,
      arrivalMode: 'self-check-in',
      chiefComplaint: 'Sore throat',
      complaint: 'Sore throat',
      source: 'Self-arrival',
      triagePending: true,
      queueDestination: 'triage-queue',
    });
  });

  it('stamps handoff arrival state for triage queue routing', () => {
    const stamped = stampPatientArrivalAtHandoff(
      buildPatient({ state: PatientState.Registration }),
    );

    expect(stamped.arrival).toMatchObject({
      waitingRoomStatus: 'waiting-for-triage',
      queueDestination: 'triage-queue',
      triagePending: true,
      registrationStatus: 'complete',
    });
    expect(stamped.state).toBe(PatientState.Triage);
  });

  it('derives waiting room status from journey state', () => {
    expect(deriveWaitingRoomStatus(buildPatient({ state: PatientState.Waiting }))).toBe(
      'waiting-for-clinician',
    );
    expect(
      deriveWaitingRoomStatus(buildPatient({ state: PatientState.Triage, triagePending: true })),
    ).toBe('waiting-for-triage');
    expect(
      deriveWaitingRoomStatus(
        buildPatient({
          state: PatientState.Admission,
          flags: [PatientFlag.PendingAdmission],
        }),
      ),
    ).toBe('awaiting-admission-bed');
  });
});
