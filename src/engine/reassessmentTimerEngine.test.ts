import { describe, expect, it } from 'vitest';
import { PatientFlag, PatientState, Priority, type Patient } from '../types/emergency';
import {
  buildReassessmentNotificationCenterSnapshot,
  buildReassessmentTimerAlerts,
  buildReassessmentTimerSnapshot,
  buildWaitingPatientReassessmentTimers,
  deriveLastNurseContactTime,
  deriveLastReassessmentTime,
  deriveLastVitalsTime,
  deriveReassessmentSchedule,
  evaluateReassessmentDueFlag,
  resolveReassessmentTimerThresholds,
  REASSESSMENT_TIMER_SURFACES,
} from './reassessmentTimerEngine';

function buildPatient(overrides: Partial<Patient> = {}): Patient {
  return {
    id: 'patient-1',
    mrn: 'ED-123456',
    firstName: 'Sam',
    lastName: 'Lee',
    dob: '1990-01-01',
    age: 35,
    sex: 'F',
    arrivalTime: '2026-06-20T08:00:00.000Z',
    triageTime: '2026-06-20T08:20:00.000Z',
    lastAssessedTime: '2026-06-20T08:45:00.000Z',
    chiefComplaint: 'Abdominal pain',
    complaintCategory: 'Other',
    state: PatientState.Waiting,
    priority: Priority.P3,
    vitals: [{ recordedAt: '2026-06-20T08:40:00.000Z', hr: 90 }],
    vitalsUpdatedAt: '2026-06-20T08:40:00.000Z',
    flags: [],
    notes: [
      {
        id: 'note-1',
        type: 'Nursing',
        body: 'Initial nursing contact',
        createdAt: '2026-06-20T08:42:00.000Z',
      },
    ],
    timeline: [
      {
        id: 'evt-triage',
        type: 'Triage',
        timestamp: '2026-06-20T08:20:00.000Z',
        to: PatientState.Waiting,
      },
    ],
    reassessmentReminders: [
      {
        id: 'rem-1',
        patientId: 'patient-1',
        scheduledBy: 'rn-1',
        dueAt: '2026-06-20T09:10:00.000Z',
        status: 'pending',
      },
    ],
    ...overrides,
  };
}

describe('reassessmentTimerEngine', () => {
  const now = new Date('2026-06-20T10:00:00.000Z');

  it('derives last nurse contact, vitals, and reassessment timestamps', () => {
    const patient = buildPatient();
    expect(deriveLastVitalsTime(patient)).toBe('2026-06-20T08:40:00.000Z');
    expect(deriveLastNurseContactTime(patient)).toBe('2026-06-20T08:42:00.000Z');
    expect(deriveLastReassessmentTime(patient)).toBe('2026-06-20T08:45:00.000Z');
  });

  it('builds reassessment schedule from active reminder due time', () => {
    const schedule = deriveReassessmentSchedule(buildPatient(), now);
    expect(schedule.source).toBe('scheduled-reminder');
    expect(schedule.dueAt).toBe('2026-06-20T09:10:00.000Z');
    expect(schedule.overdueAt).toBeTruthy();
  });

  it('builds a complete timer snapshot for waiting patients', () => {
    const snapshot = buildReassessmentTimerSnapshot(buildPatient(), { now });
    expect(snapshot).toMatchObject({
      patientId: 'patient-1',
      arrivalTime: '2026-06-20T08:00:00.000Z',
      triageTime: '2026-06-20T08:20:00.000Z',
      lastNurseContactTime: '2026-06-20T08:42:00.000Z',
      lastVitalsTime: '2026-06-20T08:40:00.000Z',
      lastReassessmentTime: '2026-06-20T08:45:00.000Z',
      reassessmentDueTime: '2026-06-20T09:10:00.000Z',
    });
    expect(snapshot.stage).toBe('overdue');
    expect(snapshot.isOverdue).toBe(true);
    expect(snapshot.dueInLabel).toContain('Overdue');
  });

  it('returns waiting patient timers sorted by overdue severity', () => {
    const timers = buildWaitingPatientReassessmentTimers(
      [
        buildPatient({ id: 'a' }),
        buildPatient({ id: 'b', state: PatientState.Assessment }),
        buildPatient({
          id: 'c',
          reassessmentReminders: [],
          flags: [PatientFlag.ReassessmentDue],
        }),
      ],
      { now },
    );

    // Both waiting patients are overdue. 'a' ranks first: its explicit scheduled
    // reminder was due 09:10 (50m overdue) while 'c' is interval-due at 09:15
    // (45m overdue) — the wait-threshold anchors on the 08:45 recheck, not on
    // arrival, so time already spent with staff doesn't inflate overdue rank.
    expect(timers.map((timer) => timer.patientId)).toEqual(['a', 'c']);
    expect(timers.every((timer) => timer.isOverdue)).toBe(true);
  });

  it('creates notification center alerts for due and overdue timers', () => {
    const alerts = buildReassessmentTimerAlerts(
      [buildReassessmentTimerSnapshot(buildPatient(), { now })],
      now,
    );
    expect(alerts).toHaveLength(1);
    expect(alerts[0].severity).toBe('Critical');
    expect(alerts[0].source).toBe('reassessment-timer-engine');
  });

  it('exposes canonical timer surfaces', () => {
    expect(REASSESSMENT_TIMER_SURFACES).toContain('notification-center');
    expect(REASSESSMENT_TIMER_SURFACES).toContain('waiting-room-safety-board');
    expect(REASSESSMENT_TIMER_SURFACES).toContain('patient-detail');
  });

  it('resolves thresholds from emergency settings', () => {
    const thresholds = resolveReassessmentTimerThresholds({
      thresholds: { reassessP2Min: 20, waitTimeWarningMin: 50 },
    });
    expect(thresholds.reassessP2Min).toBe(20);
    expect(thresholds.waitTimeWarningMin).toBe(50);
  });

  it('evaluates reassessment due flags from timer snapshots', () => {
    const evaluation = evaluateReassessmentDueFlag(buildPatient(), { now });
    expect(evaluation.timer.patientId).toBe('patient-1');
    expect(evaluation.shouldFlag).toBe(true);
  });

  it('builds notification center snapshot for waiting patients', () => {
    const snapshot = buildReassessmentNotificationCenterSnapshot([buildPatient()], { now });
    expect(snapshot.waitingCount).toBe(1);
    expect(snapshot.overdueCount).toBe(1);
    expect(snapshot.alerts).toHaveLength(1);
    expect(snapshot.summaryLine).toMatch(/overdue/i);
    expect(snapshot.timers[0].overdueTime).toBeTruthy();
  });
});
