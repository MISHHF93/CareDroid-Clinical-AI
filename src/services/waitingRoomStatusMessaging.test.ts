import { describe, expect, it } from 'vitest';
import { PatientState, Priority, type Patient } from '../types/emergency';
import {
  PUBLIC_WAITING_ESCALATION_MESSAGE,
  buildWaitingRoomStatusMessagingSnapshot,
  assertWaitingRoomMessagingIsPhiSafe,
  resolvePatientWaitingRoomMessage,
  resolveWaitingRoomStatusMessage,
} from './waitingRoomStatusMessaging';

function buildPatient(overrides: Partial<Patient> = {}): Patient {
  return {
    id: 'patient-1',
    mrn: 'MRN-SECRET',
    firstName: 'Alex',
    lastName: 'Lee',
    state: PatientState.Waiting,
    priority: Priority.P3,
    arrivalTime: '2026-06-20T08:00:00.000Z',
    chiefComplaint: 'Chest pain',
    flags: [],
    notes: [],
    timeline: [],
    ...overrides,
  };
}

describe('waitingRoomStatusMessaging', () => {
  it('exposes canonical PHI-safe patient messages', () => {
    expect(resolveWaitingRoomStatusMessage('registered')).toBe('You are registered');
    expect(resolveWaitingRoomStatusMessage('waiting-for-triage')).toBe('Waiting for triage');
    expect(resolveWaitingRoomStatusMessage('waiting-for-clinician')).toBe('Waiting for clinician');
    expect(resolveWaitingRoomStatusMessage('tests-in-progress')).toBe('Tests in progress');
    expect(resolveWaitingRoomStatusMessage('waiting-for-results')).toBe('Waiting for results');
    expect(resolveWaitingRoomStatusMessage('waiting-for-specialist-review')).toBe(
      'Waiting for specialist review',
    );
    expect(resolveWaitingRoomStatusMessage('preparing-discharge')).toBe('Preparing for discharge');
    expect(resolveWaitingRoomStatusMessage('awaiting-admission-bed')).toBe(
      'Awaiting admission bed',
    );
    expect(resolveWaitingRoomStatusMessage('longer-wait-advisory')).toBe(
      'We are experiencing longer than usual wait times',
    );
    expect(resolveWaitingRoomStatusMessage('symptom-escalation')).toBe(
      'If your symptoms worsen, notify staff immediately',
    );
    expect(PUBLIC_WAITING_ESCALATION_MESSAGE).toBe(
      'If your symptoms worsen, notify staff immediately',
    );
  });

  it('prefers stored arrival waiting room status when present', () => {
    const message = resolvePatientWaitingRoomMessage(
      buildPatient({
        state: PatientState.Waiting,
        arrival: {
          arrivalMode: 'self-check-in',
          arrivalTimestamp: '2026-06-20T08:00:00.000Z',
          chiefComplaint: 'Sore throat',
          triageAcuity: { code: 'P4', system: 'PRIORITY', level: 4, status: 'suggested' },
          waitingRoomStatus: 'waiting-for-triage',
          registrationStatus: 'complete',
          queueDestination: 'triage-queue',
          triagePending: true,
        },
      }),
      {},
      'patient',
    );

    expect(message).toBe('Waiting for triage');
  });

  it('maps individual patients to safe status messages without PHI', () => {
    const message = resolvePatientWaitingRoomMessage(
      buildPatient({ state: PatientState.Triage }),
      {},
      'patient',
    );
    expect(message).toBe('Waiting for triage');
    expect(message).not.toContain('Alex');
    expect(message).not.toContain('Chest pain');
  });

  it('builds aggregate status lines and advisories for public display', () => {
    const snapshot = buildWaitingRoomStatusMessagingSnapshot({
      patients: [
        buildPatient({ id: 'p1', state: PatientState.Registration }),
        buildPatient({ id: 'p2', state: PatientState.Triage }),
        buildPatient({ id: 'p3', state: PatientState.Waiting }),
        buildPatient({ id: 'p4', state: PatientState.Orders, timeline: [{ type: 'OrderPlaced' }] }),
      ],
      capacity: {
        score: 82,
        band: 'Orange',
        updatedAt: '2026-06-20T10:00:00.000Z',
        totalPatients: 4,
        occupiedRooms: 20,
        boardingCount: 0,
        reassessmentDue: 0,
        waitingCount: 1,
        averageWaitMinutes: 95,
        longestWaitMinutes: 140,
      },
    });

    expect(assertWaitingRoomMessagingIsPhiSafe(snapshot)).toBe(true);
    expect(snapshot.statusLines.map((line) => line.id)).toEqual([
      'registered',
      'waiting-for-triage',
      'waiting-for-clinician',
      'tests-in-progress',
    ]);
    expect(snapshot.advisories.map((line) => line.id)).toContain('longer-wait-advisory');
    expect(snapshot.advisories.map((line) => line.id)).toContain('symptom-escalation');
    expect(snapshot.longerWaitActive).toBe(true);
    expect(snapshot.escalationMessage).toBe(PUBLIC_WAITING_ESCALATION_MESSAGE);
  });

  it('maps disposition and admission patients to dedicated status lines', () => {
    const snapshot = buildWaitingRoomStatusMessagingSnapshot({
      patients: [
        buildPatient({ id: 'd', state: PatientState.Disposition }),
        buildPatient({ id: 'a', state: PatientState.Admission }),
      ],
      audience: 'staff',
    });

    expect(snapshot.statusLines.map((line) => line.id)).toEqual([
      'preparing-discharge',
      'awaiting-admission-bed',
    ]);
    expect(snapshot.statusLines[0]?.message).toBe(
      'Preparing discharge — final paperwork and instructions',
    );
  });

  it('provides staff-facing copy for front-desk visibility', () => {
    const snapshot = buildWaitingRoomStatusMessagingSnapshot({
      patients: [buildPatient({ state: PatientState.Results })],
      audience: 'staff',
    });

    expect(snapshot.statusLines[0]?.message).toBe('Waiting for test results review');
    expect(snapshot.advisories.some((line) => line.id === 'symptom-escalation')).toBe(true);
  });
});
