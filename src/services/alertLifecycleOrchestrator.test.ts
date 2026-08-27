import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const ingestPreparedAlert = vi.hoisted(() => vi.fn());
const acknowledgeClinicalAlertApi = vi.hoisted(() => vi.fn(async () => ({ ok: true })));

vi.mock('../store/emergencyStore', () => ({
  useEmergencyStore: {
    getState: () => ({
      alerts: [
        {
          id: 'alert-open',
          severity: 'Critical',
          title: 'Chest pain',
          message: 'Critical chest pain reported',
          createdAt: new Date(Date.now() - 4 * 60 * 1000).toISOString(),
          dismissed: false,
          source: 'vitals-alert-engine',
        },
      ],
      ingestPreparedAlert,
    }),
    setState: vi.fn((updater) => {
      if (typeof updater === 'function') {
        updater({ alerts: [], workflowLogs: [] });
      }
    }),
  },
}));

vi.mock('./clinicalAlertsApi', () => ({
  fetchClinicalAlerts: vi.fn(async () => ({
    ok: true,
    data: {
      alerts: [
        {
          id: 'clinical-1',
          severity: 'high',
          title: 'Abnormal Lab Values',
          description: 'Critical lab values detected',
          source: 'Lab Interpreter',
          status: 'unacknowledged',
          timestamp: new Date().toISOString(),
        },
      ],
    },
  })),
  acknowledgeClinicalAlertApi,
  dismissClinicalAlertApi: vi.fn(),
}));

vi.mock('../config/backendApiCapabilities', () => ({
  isBackendCapabilityEnabled: () => true,
}));

const postWaitingRoomEscalationNotify = vi.hoisted(() => vi.fn(async () => ({ ok: true })));

vi.mock('./emergencyOsApi', () => ({
  postWaitingRoomEscalationNotify: (...args: unknown[]) => postWaitingRoomEscalationNotify(...args),
}));

import {
  checkUnacknowledgedAlertEscalations,
  filterAlertsForRole,
  getActiveAlerts,
  ingestClinicalApiAlert,
  ingestRealtimeAlertPayload,
  mapAlertToClinicalDisplay,
  prepareOperationalDerivedAlerts,
  prepareUnifiedAlert,
  publishAlert,
  syncDerivedAlertsLifecycle,
  transitionAlertLifecycle,
} from './alertLifecycleOrchestrator';

describe('alertLifecycleOrchestrator', () => {
  beforeEach(() => {
    vi.spyOn(console, 'info').mockImplementation(() => undefined);
    ingestPreparedAlert.mockReset();
    acknowledgeClinicalAlertApi.mockReset();
    postWaitingRoomEscalationNotify.mockClear();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('prepares unified alerts with lifecycle ownership and routing metadata', () => {
    const alert = prepareUnifiedAlert({
      severity: 'Critical',
      title: 'Stroke alert',
      message: 'Facial droop and slurred speech',
      source: 'alert-engine',
    } as any);

    expect(alert.lifecycleStatus).toBe('open');
    expect(alert.ownerRole).toBeTruthy();
    expect(alert.metadata?.classificationTier).toBe('critical');
    expect(alert.metadata?.orchestratorVersion).toBeTruthy();
  });

  it('publishes alerts through the canonical store ingest path', () => {
    const alertId = publishAlert({
      severity: 'Warning',
      title: 'Queue breach',
      message: 'Triage queue threshold breached',
      source: 'queue-intelligence',
    } as any);

    expect(ingestPreparedAlert).toHaveBeenCalledWith(
      expect.objectContaining({
        id: alertId,
        lifecycleStatus: 'open',
        metadata: expect.objectContaining({ orchestratorVersion: expect.any(String) }),
      }),
    );
    expect(console.info).toHaveBeenCalledWith('[ALERT_LIFECYCLE]', expect.any(Object));
  });

  it('maps clinical API alerts into unified store records', () => {
    const alert = ingestClinicalApiAlert({
      id: 'clinical-1',
      severity: 'critical',
      title: 'Sepsis alert',
      description: 'Possible sepsis',
      source: 'SOFA Calculator',
      status: 'unacknowledged',
      findings: ['SOFA 12'],
      timestamp: new Date().toISOString(),
    });

    expect(alert.id).toBe('clinical-1');
    expect(alert.severity).toBe('Critical');
    expect(alert.metadata?.clinicalApiStatus).toBe('unacknowledged');
  });

  it('filters active alerts and role-visible alerts', () => {
    const alerts = [
      prepareUnifiedAlert({
        id: 'a1',
        severity: 'Critical',
        title: 'Open',
        message: 'Open alert',
        source: 'test',
      } as any),
      prepareUnifiedAlert({
        id: 'a2',
        severity: 'Info',
        title: 'Dismissed',
        message: 'Dismissed alert',
        source: 'test',
        dismissed: true,
      } as any),
    ];

    expect(getActiveAlerts(alerts)).toHaveLength(1);
    expect(filterAlertsForRole(alerts, 'charge_nurse').length).toBeGreaterThanOrEqual(0);
  });

  it('transitions acknowledgement through lifecycle audit and backend sync', async () => {
    const { useEmergencyStore } = await import('../store/emergencyStore');
    useEmergencyStore.getState = () =>
      ({
        alerts: [
          prepareUnifiedAlert({
            id: 'alert-ack',
            severity: 'Warning',
            title: 'Lab critical',
            message: 'Review critical lab',
            source: 'clinical-alerts-api',
          } as any),
        ],
        ingestPreparedAlert,
      }) as unknown as ReturnType<typeof useEmergencyStore.getState>;

    await transitionAlertLifecycle('alert-ack', 'acknowledge', {
      actorId: 'nurse-1',
      actorRole: 'triage_nurse',
      sourceScreen: 'test',
    });

    expect(acknowledgeClinicalAlertApi).toHaveBeenCalledWith(
      'alert-ack',
      expect.objectContaining({ acknowledgedBy: 'nurse-1' }),
    );
    expect(useEmergencyStore.setState).toHaveBeenCalled();
  });

  // Regression coverage for the 2026-08-27 fix: actor.actorId/actorRole were
  // already passed into every acknowledge/dismiss call but silently dropped
  // before patching the alert -- a real alert's card could only ever show a
  // shared checkmark, never who actually acted, across all ~15 roles with
  // ALERT_ACKNOWLEDGE permission.
  it('records who actually acknowledged the alert, not just a boolean', async () => {
    const { useEmergencyStore } = await import('../store/emergencyStore');
    const alertBefore = {
      id: 'alert-ack-attribution',
      severity: 'Warning' as const,
      title: 'Lab critical',
      message: 'Review critical lab',
      source: 'clinical-alerts-api',
      dismissed: false,
      createdAt: new Date().toISOString(),
    };
    useEmergencyStore.getState = () =>
      ({
        alerts: [alertBefore],
        ingestPreparedAlert,
      }) as unknown as ReturnType<typeof useEmergencyStore.getState>;

    await transitionAlertLifecycle('alert-ack-attribution', 'acknowledge', {
      actorId: 'dr-rivera',
      actorRole: 'physician',
      sourceScreen: 'test',
    });

    const latestUpdater = (useEmergencyStore.setState as unknown as { mock: { calls: unknown[][] } })
      .mock.calls.at(-1)?.[0] as (state: { alerts: unknown[]; workflowLogs: unknown[] }) => {
      alerts: Array<{ id: string; acknowledgedByStaffId?: string; acknowledgedByRole?: string }>;
    };
    const result = latestUpdater({ alerts: [alertBefore], workflowLogs: [] });
    const updated = result.alerts.find((alert) => alert.id === 'alert-ack-attribution');

    expect(updated?.acknowledgedByStaffId).toBe('dr-rivera');
    expect(updated?.acknowledgedByRole).toBe('physician');
  });

  // Regression coverage for the 2026-08-27 fix: dispatchOperationalAlert's
  // realtime broadcast (emergency-os.services.ts, type 'alert_created')
  // carries the raw alert -- ownerRole included -- straight over the wire,
  // but ingestRealtimeAlertPayload never read it, so prepareUnifiedAlert
  // always fell through to a keyword-guessed role instead of the real,
  // deliberately-set one. ownerRole doesn't gate any production visibility
  // filter today (filterAlertsForRole below has zero real callers --
  // ClinicalAlertsPage.tsx uses the scenario-keyword-based
  // filterAlertsForProfile instead, which ignores ownerRole entirely) -- the
  // concrete bug is data consistency: the same escalation alert's
  // "Owner: physician" finding (mapAlertToClinicalDisplay, already wired
  // into ClinicalAlertsPage.tsx) showed correctly when fetched via REST
  // (already fixed, normalizeOperationalAlert, commit 7f7ae82d) but was
  // blank the instant it arrived live -- flickering between two different
  // values for the identical alert depending purely on which path delivered
  // it first.
  it('preserves ownerRole from a realtime alert_created payload, matching what the already-fixed REST path shows', () => {
    const escalationAlert = ingestRealtimeAlertPayload({
      id: 'alert-escalation-realtime-test',
      title: 'ESCALATION — Test Patient',
      message: 'Room 4 · Chest pain · Escalated by Priya Nair',
      severity: 'Critical',
      source: 'emergency-patient-service',
      ownerRole: 'physician',
    });

    expect(escalationAlert?.ownerRole).toBe('physician');
    expect(mapAlertToClinicalDisplay(escalationAlert!).findings).toContain('Owner: physician');
  });

  it('leaves ownerRole undefined (not a stale guess) for a realtime alert with no ownerRole in the payload', () => {
    const genericAlert = ingestRealtimeAlertPayload({
      id: 'alert-generic-realtime-test',
      title: 'Capacity pressure rising',
      message: 'ED capacity score dropped to 62.',
      severity: 'Warning',
      source: 'capacity-intelligence',
    });

    expect(genericAlert?.ownerRole).toBeUndefined();
  });

  it('prepares derived alerts and records lifecycle sync for new and expired ids', () => {
    const prepared = prepareOperationalDerivedAlerts([
      {
        id: 'derived-wait-1',
        type: 'Operational',
        severity: 'Warning',
        title: 'Long wait',
        message: 'Patient waiting beyond threshold',
        createdAt: new Date().toISOString(),
        dismissed: false,
        source: 'derive-alerts',
      },
    ]);

    expect(prepared[0].metadata?.orchestratorVersion).toBeTruthy();
    expect(() =>
      syncDerivedAlertsLifecycle([], prepared, 'test-sync'),
    ).not.toThrow();
    expect(() =>
      syncDerivedAlertsLifecycle(prepared, [], 'test-sync'),
    ).not.toThrow();
  });

  it('sends a real out-of-band notification when auto-escalating an unacknowledged critical alert (2026-08-08)', async () => {
    const { useEmergencyStore } = await import('../store/emergencyStore');
    useEmergencyStore.getState = () =>
      ({
        alerts: [
          {
            id: 'alert-escalate-me',
            severity: 'Critical',
            title: 'Chest pain',
            message: 'Critical chest pain reported',
            createdAt: new Date(Date.now() - 4 * 60 * 1000).toISOString(),
            dismissed: false,
            acknowledged: false,
            source: 'vitals-alert-engine',
          },
        ],
        ingestPreparedAlert,
      }) as unknown as ReturnType<typeof useEmergencyStore.getState>;

    // The seeded alert is Critical, not dismissed/acknowledged, and 4 minutes old --
    // past the 3-minute escalation deadline.
    const escalatedIds = checkUnacknowledgedAlertEscalations();

    expect(escalatedIds).toContain('alert-escalate-me');
    expect(postWaitingRoomEscalationNotify).toHaveBeenCalledWith(
      expect.objectContaining({ alertId: 'alert-escalate-me' }),
    );
  });
});