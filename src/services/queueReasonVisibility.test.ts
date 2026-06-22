import { describe, expect, it } from 'vitest';
import { PatientFlag, PatientState, Priority } from '../types/emergency';
import {
  QUEUE_REASON_DEFINITIONS,
  buildQueueReasonBoardSummary,
  resolveQueueReason,
  summarizeQueueReasonBoard,
} from './queueReasonVisibility';

function buildPatient(overrides = {}) {
  return {
    id: 'patient-1',
    firstName: 'Alex',
    lastName: 'Rivera',
    mrn: 'MRN-001',
    state: PatientState.Waiting,
    priority: Priority.P3,
    arrivalTime: '2026-06-20T10:00:00.000Z',
    triageTime: '2026-06-20T10:05:00.000Z',
    lastAssessedTime: '2026-06-20T10:30:00.000Z',
    flags: [],
    timeline: [],
    reassessmentReminders: [],
    ...overrides,
  };
}

const STABLE_NOW = new Date('2026-06-20T10:35:00.000Z');

describe('queueReasonVisibility', () => {
  it('exposes all queue reason definitions', () => {
    expect(QUEUE_REASON_DEFINITIONS.map((reason) => reason.id)).toEqual([
      'verification-incomplete',
      'registration-incomplete',
      'triage-pending',
      'reassessment-pending',
      'admission-bed-pending',
      'referral-pending',
      'result-pending',
      'room-pending',
      'provider-pending',
    ]);
  });

  it('flags verification incomplete for identity pending registration lane', () => {
    const snapshot = resolveQueueReason(
      buildPatient({
        state: PatientState.Registration,
        flags: [PatientFlag.IdentityPending],
        registrationStatus: 'provisional',
      }),
    );

    expect(snapshot?.primaryReason.id).toBe('verification-incomplete');
    expect(snapshot?.labels).toContain('Verification incomplete');
  });

  it('flags registration incomplete before triage', () => {
    const snapshot = resolveQueueReason(
      buildPatient({
        state: PatientState.Registration,
        registrationStatus: 'in-progress',
        queueDestination: 'triage-queue',
        triageTime: null,
        lastAssessedTime: null,
      }),
      { now: STABLE_NOW },
    );

    expect(snapshot?.reasons.map((reason) => reason.id)).toContain('registration-incomplete');
  });

  it('flags triage pending for triage queue patients', () => {
    const snapshot = resolveQueueReason(
      buildPatient({
        state: PatientState.Triage,
        triagePending: true,
      }),
    );

    expect(snapshot?.primaryReason.id).toBe('triage-pending');
  });

  it('flags provider pending for waiting patients without assignee', () => {
    const snapshot = resolveQueueReason(
      buildPatient({
        state: PatientState.Waiting,
        triageTime: '2026-06-20T10:30:00.000Z',
        lastAssessedTime: '2026-06-20T10:32:00.000Z',
        assignedStaffId: null,
      }),
      { now: STABLE_NOW },
    );

    expect(snapshot?.primaryReason.id).toBe('provider-pending');
  });

  it('does not flag room pending for routine waiting-room patients without treatment room', () => {
    const snapshot = resolveQueueReason(
      buildPatient({
        state: PatientState.Waiting,
        triageTime: '2026-06-20T10:05:00.000Z',
        assignedStaffId: 'staff-1',
        lastAssessedTime: '2026-06-20T10:10:00.000Z',
        roomId: null,
      }),
      { staff: [{ id: 'staff-1', displayName: 'Dr. Lee' }] },
    );

    expect(snapshot?.reasons.map((reason) => reason.id)).not.toContain('room-pending');
  });

  it('flags room pending when immediate room is required or assessment lacks room', () => {
    const immediateRoomSnapshot = resolveQueueReason(
      buildPatient({
        state: PatientState.Waiting,
        triageTime: '2026-06-20T10:30:00.000Z',
        lastAssessedTime: '2026-06-20T10:32:00.000Z',
        assignedStaffId: 'staff-1',
        fitToWaitClassification: {
          id: 'immediate-room-needed',
          label: 'Immediate room needed',
          classifiedAt: '2026-06-20T10:06:00.000Z',
          staffConfirmed: true,
        },
      }),
      { now: STABLE_NOW },
    );
    const assessmentSnapshot = resolveQueueReason(
      buildPatient({
        state: PatientState.Assessment,
        triageTime: '2026-06-20T10:30:00.000Z',
        lastAssessedTime: '2026-06-20T10:32:00.000Z',
        assignedStaffId: 'staff-1',
        roomId: null,
      }),
      { now: STABLE_NOW },
    );

    expect(immediateRoomSnapshot?.reasons.map((reason) => reason.id)).toContain('room-pending');
    expect(assessmentSnapshot?.primaryReason.id).toBe('room-pending');
  });

  it('flags result pending for results state and outstanding orders', () => {
    const reviewSnapshot = resolveQueueReason(
      buildPatient({
        state: PatientState.Results,
      }),
      { now: STABLE_NOW },
    );
    const ordersSnapshot = resolveQueueReason(
      buildPatient({
        state: PatientState.Orders,
        timeline: [{ type: 'OrderPlaced' }, { type: 'OrderPlaced' }],
      }),
      { now: STABLE_NOW },
    );

    expect(reviewSnapshot?.primaryReason.id).toBe('result-pending');
    expect(ordersSnapshot?.primaryReason.id).toBe('result-pending');
  });

  it('flags referral and admission bed pending from existing referral and flag data', () => {
    const referralSnapshot = resolveQueueReason(buildPatient(), {
      referrals: [
        {
          id: 'ref-1',
          patientId: 'patient-1',
          status: 'Pending',
          service: 'Cardiology',
        },
      ],
      now: STABLE_NOW,
    });
    const admissionSnapshot = resolveQueueReason(
      buildPatient({
        state: PatientState.Admission,
        flags: [PatientFlag.PendingAdmission],
      }),
      { now: STABLE_NOW },
    );

    expect(referralSnapshot?.reasons.map((reason) => reason.id)).toContain('referral-pending');
    expect(admissionSnapshot?.primaryReason.id).toBe('admission-bed-pending');
  });

  it('summarizes primary queue reasons across patients', () => {
    const summary = summarizeQueueReasonBoard(
      [
        buildPatient({ state: PatientState.Triage, triagePending: true, triageTime: null, lastAssessedTime: null }),
        buildPatient({
          id: 'patient-2',
          state: PatientState.Registration,
          registrationStatus: 'in-progress',
          queueDestination: 'triage-queue',
          triageTime: null,
          lastAssessedTime: null,
        }),
      ],
      { now: STABLE_NOW },
    );

    expect(summary['triage-pending']).toBe(1);
    expect(summary['registration-incomplete']).toBe(1);
  });

  it('flags reassessment pending from due reminders and overdue timers', () => {
    const snapshot = resolveQueueReason(
      buildPatient({
        state: PatientState.Waiting,
        flags: [PatientFlag.ReassessmentDue],
        triageTime: '2026-06-20T10:05:00.000Z',
        assignedStaffId: 'staff-1',
        lastAssessedTime: '2026-06-20T10:10:00.000Z',
      }),
      { now: STABLE_NOW },
    );

    expect(snapshot?.reasons.map((reason) => reason.id)).toContain('reassessment-pending');
  });

  it('builds board summary lines for active queue reasons', () => {
    const summary = buildQueueReasonBoardSummary([
      buildPatient({ state: PatientState.Triage, triagePending: true, triageTime: null, lastAssessedTime: null }),
      buildPatient({
        id: 'patient-2',
        state: PatientState.Waiting,
        triageTime: '2026-06-20T10:30:00.000Z',
        lastAssessedTime: '2026-06-20T10:32:00.000Z',
        assignedStaffId: null,
      }),
    ], { now: STABLE_NOW });

    expect(summary.activeCount).toBe(2);
    expect(summary.statusLines.map((line) => line.id)).toEqual(['triage-pending', 'provider-pending']);
  });
});
