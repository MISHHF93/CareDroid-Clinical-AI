import { describe, expect, it } from 'vitest';
import { buildOperationalAlertMetrics } from './operationalAlertRailModel';
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
      metrics: [],
    },
    ...overrides,
  } as CareDroidCentralNodeSnapshot;
}

describe('operationalAlertRailModel', () => {
  it('builds header operational metrics with sync and alert tones', () => {
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
    expect(metrics.find((metric) => metric.id === 'reassessment-due')?.value).toBe('REA 4');
  });

  it('appends operational intelligence metric when enabled', () => {
    const metrics = buildOperationalAlertMetrics({
      centralSnapshot: buildSnapshot(),
      syncLabel: 'POLLING stale',
      syncStale: true,
      intelligenceSnapshot: {
        enabled: true,
        mode: 'advisory_only',
        dataFreshness: { visible: true, status: 'fresh' },
        anomalies: [],
        disclaimers: { operational: 'Advisory only' },
      },
    });

    expect(metrics.at(-1)?.id).toBe('operational-intelligence');
    expect(metrics.at(-1)?.tone).toBe('success');
  });
});