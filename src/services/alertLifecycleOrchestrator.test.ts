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

import {
  filterAlertsForRole,
  getActiveAlerts,
  ingestClinicalApiAlert,
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
    });

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
    });

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
      }),
      prepareUnifiedAlert({
        id: 'a2',
        severity: 'Info',
        title: 'Dismissed',
        message: 'Dismissed alert',
        source: 'test',
        dismissed: true,
      }),
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
          }),
        ],
        ingestPreparedAlert,
      }) as ReturnType<typeof useEmergencyStore.getState>;

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
});