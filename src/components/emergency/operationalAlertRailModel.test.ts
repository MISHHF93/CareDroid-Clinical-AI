import { describe, expect, it } from 'vitest';
import { CARE_DROID_SCREEN_MODES } from '../../config/careDroidScreenModes';
import {
  buildHeaderOperationalAlertMetrics,
  buildOperationalAlertMetrics,
} from './operationalAlertRailModel';
import type { CareDroidCentralNodeSnapshot } from '../../central-node/careDroidCentralNode';

function buildSnapshot(
  overrides: Partial<CareDroidCentralNodeSnapshot> = {},
): CareDroidCentralNodeSnapshot {
  return {
    node: 'care-droid-central-node',
    generatedAt: '2026-06-24T12:00:00.000Z',
    sync: {
      source: 'store',
      status: 'connected',
      mode: 'polling',
      lastSyncedAt: '2026-06-24T12:00:00.000Z',
      stale: false,
      message: '',
    },
    currentDepartmentStatus: {
      patientsToday: 12,
      activePatients: 8,
      waitingPatients: 3,
      longestWait: 42,
      averageWait: 18,
      capacityBand: 'Green',
      activeAlerts: 2,
    },
    activePatientFlow: { patients: [], criticalPatients: [] },
    queueHealth: [],
    emsPressure: { inbound: 1, criticalInbound: 0, status: 'elevated' },
    capacityStatus: { score: 72, band: 'Green', occupancy: 0.6 },
    boardingStatus: { boarders: 0, risk: 'stable' },
    reassessmentStatus: { due: 4, overdue: 1 },
    referralStatus: { pending: 0 },
    operationalSummary: {
      generatedAt: '2026-06-24T12:00:00.000Z',
      metrics: [
        { key: 'waiting', label: 'Waiting', value: 3, tone: 'warning', source: 'queue' },
        {
          key: 'triageBreached',
          label: 'Triage Breached',
          value: 2,
          tone: 'critical',
          source: 'triage',
        },
        {
          key: 'longestWait',
          label: 'Longest Wait',
          value: '42m',
          tone: 'warning',
          source: 'department',
        },
        { key: 'capacityScore', label: 'Capacity Score', value: '72 Green', tone: 'success' },
      ],
    },
    ...overrides,
  } as CareDroidCentralNodeSnapshot;
}

describe('operationalAlertRailModel', () => {
  it('builds legacy header operational metrics with sync and alert tones', () => {
    const metrics = buildOperationalAlertMetrics({
      centralSnapshot: buildSnapshot(),
      syncLabel: 'POLLING 12s',
      syncStale: false,
    });

    expect(metrics.map((metric) => metric.id)).toEqual([
      'capacity',
      'ems-inbound',
      'reassessment-due',
      'active-alerts',
      'sync-status',
    ]);
    expect(metrics.find((metric) => metric.id === 'active-alerts')?.tone).toBe('critical');
    expect(metrics.find((metric) => metric.id === 'reassessment-due')?.value).toBe('4');
    expect(metrics.find((metric) => metric.id === 'reassessment-due')?.label).toBe('Reassess');
    expect(metrics.find((metric) => metric.id === 'capacity')?.label).toBe('Capacity');
    expect(metrics.find((metric) => metric.id === 'capacity')?.value).toMatch(/72/);
  });

  it('appends operational intelligence metric when enabled', () => {
    const metrics = buildOperationalAlertMetrics({
      centralSnapshot: buildSnapshot(),
      syncLabel: 'POLLING stale',
      syncStale: true,
      intelligenceSnapshot: {
        enabled: true,
        mode: 'rule_based',
        dataFreshness: { visible: true, status: 'fresh', lastSyncedAt: '2026-06-24T12:00:00.000Z', ageMinutes: 0 },
        anomalies: [],
        disclaimers: { operational: 'Advisory only', clinical: '', externalData: '' },
      },
    });

    expect(metrics.at(-1)?.id).toBe('operational-intelligence');
    expect(metrics.at(-1)?.tone).toBe('success');
  });

  it('keeps the header strip to three readable primary metrics when sync is fresh', () => {
    const metrics = buildHeaderOperationalAlertMetrics({
      centralSnapshot: buildSnapshot(),
      syncLabel: 'POLLING now',
      syncStale: false,
      screenMode: null,
    });

    expect(metrics).toHaveLength(3);
    expect(metrics.map((metric) => metric.id)).toEqual([
      'capacity',
      'ems-inbound',
      'reassessment-due',
    ]);
    expect(metrics.every((metric) => metric.label.trim().length > 0)).toBe(true);
  });

  it('caps pilot header metrics to two station signals per screen mode', () => {
    const metrics = buildHeaderOperationalAlertMetrics({
      centralSnapshot: buildSnapshot(),
      syncLabel: 'POLLING 12s',
      syncStale: false,
      screenMode: CARE_DROID_SCREEN_MODES.chargeNurse,
    });

    expect(metrics.map((metric) => metric.id)).toEqual(['waiting', 'triageBreached']);
    expect(metrics.find((metric) => metric.id === 'waiting')).toMatchObject({
      label: 'Waiting',
      value: 3,
    });
    expect(metrics.find((metric) => metric.id === 'triageBreached')).toMatchObject({
      label: 'Breached',
      value: 2,
      tone: 'critical',
    });
  });

  it('appends sync chip during pilot only when sync is stale', () => {
    const staleMetrics = buildHeaderOperationalAlertMetrics({
      centralSnapshot: buildSnapshot(),
      syncLabel: 'POLLING stale',
      syncStale: true,
      screenMode: CARE_DROID_SCREEN_MODES.triage,
    });

    expect(staleMetrics.map((metric) => metric.id)).toEqual([
      'triageBreached',
      'longestWait',
      'sync-status',
    ]);

    const freshMetrics = buildHeaderOperationalAlertMetrics({
      centralSnapshot: buildSnapshot(),
      syncLabel: 'POLLING now',
      syncStale: false,
      screenMode: CARE_DROID_SCREEN_MODES.triage,
    });

    expect(freshMetrics.map((metric) => metric.id)).toEqual(['triageBreached', 'longestWait']);
  });
});