import { describe, expect, it } from 'vitest';
import { PatientState, Priority } from '../types/emergency';
import {
  buildProviderWaitBreachAttentionSnapshot,
  isAwaitingProvider,
  qualifiesHighRiskProviderWaitException,
  resolvePatientProviderWaitTargetMinutes,
  resolveProviderWaitBreachSettings,
  resolveProviderWaitBreachTimer,
  resolveTriageToProviderElapsedMinutes,
  shouldSurfaceProviderWaitBreach,
  summarizeProviderWaitBreachBoard,
  syncProviderWaitBreachOperationalSurfaces,
  PROVIDER_WAIT_BREACH_SURFACES,
} from './providerWaitBreachTimer';

const STABLE_NOW = new Date('2026-06-20T10:45:00.000Z');

function buildPatient(overrides: any = {}) {
  return {
    id: 'patient-1',
    firstName: 'Alex',
    lastName: 'Kim',
    mrn: 'MRN-300',
    state: PatientState.Waiting,
    priority: Priority.P3,
    arrivalTime: '2026-06-20T10:00:00.000Z',
    triageTime: '2026-06-20T10:05:00.000Z',
    ...overrides,
  };
}

describe('providerWaitBreachTimer', () => {
  it('reads provider wait thresholds from site settings with CTAS defaults', () => {
    expect(
      resolveProviderWaitBreachSettings({
        thresholds: {
          providerTargetMinutes: 35,
          providerWarningMinutes: 28,
          highRiskWaitExceptionsEnabled: true,
          highRiskProviderWaitMinutes: 12,
          ctasTargets: { P3: 30, P2: 15 },
        },
      }),
    ).toMatchObject({
      defaultTargetMinutes: 35,
      warningMinutes: 28,
      highRiskWaitExceptionsEnabled: true,
      highRiskProviderWaitMinutes: 12,
      ctasTargets: { P3: 30, P2: 15 },
    });
  });

  it('tracks triage-to-provider elapsed time and breached patients', () => {
    const breached = resolveProviderWaitBreachTimer(buildPatient(), {
      now: STABLE_NOW,
    });
    const onTrack = resolveProviderWaitBreachTimer(
      buildPatient({ triageTime: '2026-06-20T10:35:00.000Z' }),
      { now: STABLE_NOW },
    );

    expect(resolveTriageToProviderElapsedMinutes(buildPatient(), STABLE_NOW)).toBe(40);
    expect(breached?.elapsedMinutes).toBe(40);
    expect(breached?.phase).toBe('breached');
    expect(onTrack?.phase).toBe('on-track');
    expect(shouldSurfaceProviderWaitBreach(breached)).toBe(true);
  });

  it('flags patients approaching threshold before breach', () => {
    const snapshot = resolveProviderWaitBreachTimer(
      buildPatient({ triageTime: '2026-06-20T10:18:00.000Z' }),
      { now: STABLE_NOW },
    );

    expect(snapshot?.phase).toBe('approaching-threshold');
    expect(snapshot?.remainingMinutes).toBe(3);
  });

  it('applies high-risk wait exceptions when configured', () => {
    const settings = resolveProviderWaitBreachSettings({
      thresholds: {
        highRiskWaitExceptionsEnabled: true,
        highRiskProviderWaitMinutes: 12,
        ctasTargets: { P3: 30, P2: 15 },
      },
    });
    const patient = buildPatient({
      highRiskComplaintFlags: [{ id: 'chest-pain', label: 'Chest pain' }],
    });

    expect(qualifiesHighRiskProviderWaitException(patient, settings)).toBe(true);
    expect(resolvePatientProviderWaitTargetMinutes(patient, settings)).toMatchObject({
      targetMinutes: 12,
      highRiskException: true,
    });

    const snapshot = resolveProviderWaitBreachTimer(
      buildPatient({
        triageTime: '2026-06-20T10:33:00.000Z',
        highRiskComplaintFlags: [{ id: 'chest-pain', label: 'Chest pain' }],
      }),
      { now: STABLE_NOW, settings: { thresholds: settings } },
    );

    expect(snapshot?.targetMinutes).toBe(12);
    expect(snapshot?.phase).toBe('breached');
    expect(snapshot?.highRiskException).toBe(true);
  });

  it('summarizes approaching and breached counts for operational boards', () => {
    const summary = summarizeProviderWaitBreachBoard(
      [
        buildPatient(),
        buildPatient({ id: 'patient-2', triageTime: '2026-06-20T10:18:00.000Z' }),
        buildPatient({
          id: 'patient-3',
          triageTime: '2026-06-20T10:35:00.000Z',
          lastAssessedTime: '2026-06-20T10:40:00.000Z',
        }),
      ],
      { now: STABLE_NOW },
    );

    expect(summary.awaitingProviderCount).toBe(2);
    expect(summary.breachedCount).toBe(1);
    expect(summary.approachingThresholdCount).toBe(1);
    expect(summary.onTrackCount).toBe(0);
  });

  it('excludes patients already seen by provider', () => {
    expect(
      isAwaitingProvider(
        buildPatient({
          lastAssessedTime: '2026-06-20T10:20:00.000Z',
        }),
      ),
    ).toBe(false);
  });

  it('builds attention snapshot and syncs operational surfaces', () => {
    const events: Array<{ type: string; payload: Record<string, unknown> }> = [];
    const snapshot = buildProviderWaitBreachAttentionSnapshot([buildPatient()], {
      now: STABLE_NOW,
    });

    expect(snapshot.summary.breachedCount).toBe(1);
    expect(snapshot.previewRows[0]?.phase).toBe('breached');

    syncProviderWaitBreachOperationalSurfaces(
      {
        patients: [buildPatient()],
        dispatchWebSocketEvent: (event) => events.push(event),
      },
      { patientId: 'patient-1', source: 'test' },
    );

    expect(events).toHaveLength(1);
    expect(events[0]?.type).toBe('provider_wait_breach_sync');
    expect(events[0]?.payload.surfaces).toEqual([...PROVIDER_WAIT_BREACH_SURFACES]);
  });
});
