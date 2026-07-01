import { describe, expect, it } from 'vitest';
import { PatientState, Priority } from '../types/emergency';
import {
  isAwaitingTriage,
  buildTriageBreachAttentionSnapshot,
  buildTriageBreachAlerts,
  resolveTriageBreachSettings,
  resolveTriageBreachTimer,
  shouldSurfaceTriageBreach,
  summarizeTriageBreachAnalytics,
  summarizeTriageBreachBoard,
  syncTriageBreachOperationalSurfaces,
  TRIAGE_BREACH_SURFACES,
} from './triageBreachTimer';

const STABLE_NOW = new Date('2026-06-20T10:12:00.000Z');

function buildPatient(overrides: any = {}) {
  return {
    id: 'patient-1',
    firstName: 'Alex',
    lastName: 'Kim',
    mrn: 'MRN-300',
    state: PatientState.Triage,
    priority: Priority.P3,
    arrivalTime: '2026-06-20T10:00:00.000Z',
    triagePending: true,
    ...overrides,
  };
}

describe('triageBreachTimer', () => {
  it('reads triage thresholds from site settings with defaults', () => {
    expect(
      resolveTriageBreachSettings({
        thresholds: { triageTargetMinutes: 12, triageWarningMinutes: 9 },
      }),
    ).toEqual({
      targetMinutes: 12,
      warningMinutes: 9,
      warningRatio: 0.8,
    });
  });

  it('tracks arrival-to-triage elapsed time and breached patients', () => {
    const breached = resolveTriageBreachTimer(buildPatient(), {
      now: STABLE_NOW,
      targetMinutes: 10,
      warningMinutes: 8,
    });
    const onTrack = resolveTriageBreachTimer(
      buildPatient({ arrivalTime: '2026-06-20T10:05:00.000Z' }),
      { now: STABLE_NOW, targetMinutes: 10, warningMinutes: 8 },
    );

    expect(breached?.elapsedMinutes).toBe(12);
    expect(breached?.phase).toBe('breached');
    expect(onTrack?.phase).toBe('on-track');
    expect(shouldSurfaceTriageBreach(breached)).toBe(true);
  });

  it('flags breach risk before the configured target', () => {
    const snapshot = resolveTriageBreachTimer(buildPatient(), {
      now: new Date('2026-06-20T10:08:00.000Z'),
      targetMinutes: 10,
      warningMinutes: 8,
    });

    expect(snapshot?.phase).toBe('breach-risk');
    expect(snapshot?.remainingMinutes).toBe(2);
  });

  it('summarizes breached patient counts for operational boards', () => {
    const summary = summarizeTriageBreachBoard(
      [
        buildPatient(),
        buildPatient({ id: 'patient-2', arrivalTime: '2026-06-20T10:06:00.000Z' }),
        buildPatient({
          id: 'patient-3',
          triageTime: '2026-06-20T10:05:00.000Z',
          state: PatientState.Waiting,
        }),
      ],
      { now: STABLE_NOW, targetMinutes: 10, warningMinutes: 8 },
    );

    expect(summary.awaitingTriageCount).toBe(2);
    expect(summary.breachedCount).toBe(1);
    expect(summary.breachRiskCount).toBe(0);
    expect(summary.onTrackCount).toBe(1);
  });

  it('excludes triaged patients from awaiting-triage tracking', () => {
    expect(
      isAwaitingTriage(
        buildPatient({
          triageTime: '2026-06-20T10:05:00.000Z',
          state: PatientState.Waiting,
        }),
      ),
    ).toBe(false);
  });

  it('supports analytics completed vs active breach counts', () => {
    const analytics = summarizeTriageBreachAnalytics(
      [
        buildPatient(),
        buildPatient({
          id: 'patient-2',
          arrivalTime: '2026-06-20T09:50:00.000Z',
          triageTime: '2026-06-20T10:05:00.000Z',
          state: PatientState.Waiting,
        }),
      ],
      { now: STABLE_NOW, targetMinutes: 10, warningMinutes: 8 },
    );

    expect(analytics.summary.breachedCount).toBe(1);
    expect(analytics.completedBreachedCount).toBe(1);
    expect(analytics.completedWithinTargetCount).toBe(0);
  });

  it('builds attention snapshot and syncs operational surfaces', () => {
    const events: Array<{ type: string; payload: Record<string, unknown> }> = [];
    const snapshot = buildTriageBreachAttentionSnapshot([buildPatient()], {
      now: STABLE_NOW,
      targetMinutes: 10,
      warningMinutes: 8,
    });

    expect(snapshot.summary.breachedCount).toBe(1);
    expect(snapshot.previewRows[0]?.phase).toBe('breached');

    syncTriageBreachOperationalSurfaces(
      {
        patients: [buildPatient()],
        dispatchWebSocketEvent: (event) => events.push(event),
      },
      { patientId: 'patient-1', source: 'test' },
    );

    expect(events).toHaveLength(1);
    expect(events[0]?.type).toBe('triage_breach_sync');
    expect(events[0]?.payload.surfaces).toEqual([...TRIAGE_BREACH_SURFACES]);
  });

  it('emits triage breach alerts for breached boards', () => {
    const alerts = buildTriageBreachAlerts(
      [
        buildPatient({ id: 'p1', arrivalTime: '2026-06-20T09:00:00.000Z' }),
        buildPatient({ id: 'p2', arrivalTime: '2026-06-20T09:05:00.000Z' }),
        buildPatient({ id: 'p3', arrivalTime: '2026-06-20T09:10:00.000Z' }),
      ],
      { now: STABLE_NOW, targetMinutes: 10, warningMinutes: 8 },
    );

    expect(alerts.some((alert) => alert.id === 'triage-breach-board')).toBe(true);
    expect(alerts[0]?.severity).toBe('Critical');
  });
});
