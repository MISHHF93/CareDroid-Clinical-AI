import { describe, expect, it } from 'vitest';
import { PatientFlag, PatientState, Priority, type Patient } from '../types/emergency';
import {
  buildPatientCommunicationStatus,
  buildPatientCommunicationStatusBoard,
  formatCommunicationStatusTimestamp,
} from './patientCommunicationStatus';
import { createWaitingRoomCommunicationLogInput } from './waitingRoomCommunicationLog';

const NOW = new Date('2026-06-20T12:00:00.000Z');

function buildPatient(overrides: Partial<Patient> = {}): Patient {
  return {
    id: 'patient-1',
    mrn: 'ED-100',
    firstName: 'Ava',
    lastName: 'Stone',
    state: PatientState.Waiting,
    priority: Priority.P3,
    arrivalTime: '2026-06-20T10:00:00.000Z',
    triageTime: '2026-06-20T10:15:00.000Z',
    chiefComplaint: 'Abdominal pain',
    flags: [],
    vitals: [
      {
        id: 'v1',
        recordedAt: '2026-06-20T11:30:00.000Z',
        heartRate: 88,
        bloodPressureSystolic: 120,
        bloodPressureDiastolic: 78,
        respiratoryRate: 16,
        oxygenSaturation: 98,
        temperature: 37.1,
      },
    ],
    notes: [],
    timeline: [
      {
        id: 'evt-1',
        type: 'ReassessmentReminderCompleted',
        timestamp: '2026-06-20T11:45:00.000Z',
        summary: 'Waiting room reassessment completed',
      },
    ],
    ...overrides,
  } as unknown as Patient;
}

describe('patientCommunicationStatus', () => {
  it('formats checkpoint timestamps with clock and relative age', () => {
    expect(formatCommunicationStatusTimestamp('2026-06-20T11:30:00.000Z', NOW)).toContain(
      '30m ago',
    );
  });

  it('tracks last update, reassessment, vitals, checkpoint, and overdue flag', () => {
    const workflowLogs = [
      createWaitingRoomCommunicationLogInput({
        kind: 'patient-updated',
        patientId: 'patient-1',
        summary: 'Checked in with patient',
        timestamp: '2026-06-20T11:50:00.000Z',
      }),
    ] as any;

    const status = buildPatientCommunicationStatus(buildPatient(), {
      now: NOW,
      workflowLogs,
    });

    expect(status?.lastPatientUpdateAt).toBe('2026-06-20T11:50:00.000Z');
    expect(status?.lastReassessmentAt).toBe('2026-06-20T11:45:00.000Z');
    expect(status?.lastVitalsAt).toBe('2026-06-20T11:30:00.000Z');
    expect(status?.nextExpectedCheckpointLabel).toBeTruthy();
    expect(status?.communicationOverdue).toBe(false);
  });

  it('flags communication overdue when contact is stale', () => {
    const status = buildPatientCommunicationStatus(
      buildPatient({
        flags: [PatientFlag.ReassessmentDue],
        timeline: [],
        vitals: [],
      }),
      { now: NOW },
    );

    expect(status?.communicationOverdue).toBe(true);
    expect(status?.communicationOverdueLabel).toContain('No staff contact');
  });

  it('builds a board sorted with overdue patients first', () => {
    const board = buildPatientCommunicationStatusBoard(
      [
        buildPatient({ id: 'current', firstName: 'Calm', lastName: 'Patient' }),
        buildPatient({
          id: 'overdue',
          firstName: 'Stale',
          lastName: 'Patient',
          timeline: [],
          vitals: [],
        }),
      ],
      {
        now: NOW,
        workflowLogs: [
          createWaitingRoomCommunicationLogInput({
            kind: 'patient-updated',
            patientId: 'current',
            summary: 'Checked in',
            timestamp: '2026-06-20T11:55:00.000Z',
          }),
        ] as any,
      },
    );

    expect(board.rows).toHaveLength(2);
    expect(board.overdueCount).toBe(1);
    expect(board.rows[0]?.patientId).toBe('overdue');
    expect(board.summaryLine).toContain('need staff contact');
  });
});
