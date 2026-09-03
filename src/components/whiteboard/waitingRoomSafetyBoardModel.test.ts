import { describe, expect, it } from 'vitest';
import { PatientFlag, PatientState, Priority, type Patient } from '../../types/emergency';
import {
  buildWaitingRoomSafetyBoard,
  buildWaitingRoomSafetyRow,
  deriveHighRiskComplaintFlags,
  deriveTestWaitingStatus,
  deriveTriageLevelLabel,
  formatDurationLabel,
} from './waitingRoomSafetyBoardModel';
import { deriveProviderWaitingStatus } from '../../services/providerWaitingStatus';

function buildPatient(overrides: Partial<Patient> = {}): Patient {
  return {
    id: 'patient-1',
    mrn: 'ED-123456',
    firstName: 'Alex',
    lastName: 'River',
    dob: '1988-04-02',
    age: 37,
    sex: 'M',
    arrivalTime: '2026-06-20T08:00:00.000Z',
    triageTime: '2026-06-20T08:20:00.000Z',
    lastAssessedTime: '2026-06-20T08:45:00.000Z',
    chiefComplaint: 'Chest pain',
    complaintCategory: 'Chest pain',
    state: PatientState.Waiting,
    priority: Priority.P2,
    vitals: [{ recordedAt: '2026-06-20T08:40:00.000Z', hr: 88 }],
    vitalsUpdatedAt: '2026-06-20T08:40:00.000Z',
    flags: [PatientFlag.HighRisk],
    notes: [],
    timeline: [
      {
        id: 'evt-1',
        type: 'OrderPlaced',
        timestamp: '2026-06-20T08:50:00.000Z',
        to: PatientState.Waiting,
      },
    ],
    ...overrides,
  };
}

describe('waitingRoomSafetyBoardModel', () => {
  it('formats duration labels for board display', () => {
    expect(formatDurationLabel(0)).toBe('<1m');
    expect(formatDurationLabel(42)).toBe('42m');
    expect(formatDurationLabel(95)).toBe('1h 35m');
  });

  it('derives triage level only when triage timestamp exists', () => {
    expect(deriveTriageLevelLabel(buildPatient())).toBe('P2 · Emergent');
    expect(deriveTriageLevelLabel(buildPatient({ triageTime: undefined }))).toBeNull();
  });

  it('derives high-risk complaint flags from patient flags and category', () => {
    const flags = deriveHighRiskComplaintFlags(buildPatient());
    expect(flags).toContain('High risk');
    expect(flags).toContain('Chest pain');
  });

  it('derives provider waiting status from assignment and assessment timestamps', () => {
    expect(deriveProviderWaitingStatus(buildPatient({ assignedStaffId: null })).label).toBe(
      'Awaiting provider',
    );
    expect(
      deriveProviderWaitingStatus(
        buildPatient({ assignedStaffId: 'md-1', lastAssessedTime: undefined }),
        [{ id: 'md-1', name: 'Dr. Singh', role: 'MD', active: true }],
      ).label,
    ).toBe('Assigned · Dr. Singh');
  });

  it('derives test waiting status from timeline order/result events', () => {
    expect(deriveTestWaitingStatus(buildPatient()).label).toBe('1 test pending');
    expect(
      deriveTestWaitingStatus(
        buildPatient({
          timeline: [
            {
              id: 'evt-1',
              type: 'OrderPlaced',
              timestamp: '2026-06-20T08:50:00.000Z',
              to: PatientState.Waiting,
            },
            {
              id: 'evt-2',
              type: 'ResultReceived',
              timestamp: '2026-06-20T09:00:00.000Z',
              to: PatientState.Waiting,
            },
          ],
        }),
      ).label,
    ).toBe('Results complete');
  });

  it('builds a waiting room safety row with required board fields', () => {
    const now = new Date('2026-06-20T10:00:00.000Z');
    const row = buildWaitingRoomSafetyRow(buildPatient(), { now });

    expect(row).toMatchObject({
      patientId: 'patient-1',
      triageLevel: 'P2 · Emergent',
      presentingComplaint: 'Chest pain',
      providerWaitingStatus: 'Awaiting provider',
      testWaitingStatus: '1 test pending',
      reassessmentOverdue: true,
    });
    expect(row.waitingDurationLabel).toMatch(/\d+m|\d+h/);
    expect(row.vitalsAgeLabel).toMatch(/\d+m|\d+h|<1m/);
  });

  it('summarizes waiting room safety metrics across waiting patients', () => {
    const board = buildWaitingRoomSafetyBoard(
      [
        buildPatient({ id: 'a', flags: [PatientFlag.ReassessmentDue] }),
        buildPatient({ id: 'b', state: PatientState.Assessment }),
        buildPatient({
          id: 'c',
          assignedStaffId: null,
          vitalsUpdatedAt: '2026-06-20T06:00:00.000Z',
        }),
      ],
      { now: new Date('2026-06-20T10:00:00.000Z') },
    );

    expect(board.summary.patientCount).toBe(2);
    expect(board.summary.overdueReassessment).toBeGreaterThanOrEqual(1);
    expect(board.summary.awaitingProvider).toBeGreaterThanOrEqual(1);
  });

  it('includes fit-to-wait seating review counts on the waiting room board', () => {
    const board = buildWaitingRoomSafetyBoard(
      [
        buildPatient({ id: 'a' }),
        buildPatient({
          id: 'b',
          fitToWaitClassification: {
            id: 'immediate-room-needed',
            label: 'Immediate room needed',
            classifiedAt: '2026-06-20T09:00:00.000Z',
            staffConfirmed: true,
          },
        }),
      ],
      { now: new Date('2026-06-20T10:00:00.000Z') },
    );

    expect(board.summary.fitToWaitUnclassified).toBe(1);
    expect(board.summary.fitToWaitImmediateRoom).toBe(1);
    expect(board.rows.some((row) => row.fitToWaitNeedsReview)).toBe(true);
  });

  it('includes what happens next guidance on waiting room rows', () => {
    const row = buildWaitingRoomSafetyRow(
      buildPatient({ state: PatientState.Triage, triagePending: true }),
      { now: new Date('2026-06-20T10:00:00.000Z') },
    );

    expect(row.nextStepLabel).toBe('Triage needed');
    expect(row.nextStepGuidance).toMatch(/triage/i);
  });
});
