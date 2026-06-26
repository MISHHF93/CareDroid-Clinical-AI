import { describe, expect, it } from 'vitest';
import {
  EMS_WORKFLOW_ARTIFACTS,
  buildEmsAttentionStripMetrics,
  getArrivalOffloadMinutes,
  isHighRiskEmsArrival,
  summarizeEmsAwareness,
} from './emsAwarenessModel';

describe('emsAwarenessModel', () => {
  it('catalogs existing EMS workflow artifacts', () => {
    const ids = EMS_WORKFLOW_ARTIFACTS.map((entry) => entry.id);
    expect(ids).toContain('pre-arrival-panel');
    expect(ids).toContain('pressure-score');
  });

  it('summarizes ETA, risk, and offload from EMS arrivals', () => {
    const now = Date.parse('2026-06-17T12:00:00.000Z');
    const summary = summarizeEmsAwareness(
      [
        {
          id: 'a1',
          status: 'Inbound',
          severity: 'Critical',
          priority: 'P1',
          estimatedArrivalTime: '2026-06-17T12:08:00.000Z',
          chiefComplaint: 'Chest pain',
        },
        {
          id: 'a2',
          status: 'Arrived',
          severity: 'Moderate',
          priority: 'P3',
          patientId: 'p1',
          estimatedArrivalTime: '2026-06-17T11:40:00.000Z',
          arrivedAt: '2026-06-17T11:40:00.000Z',
        },
        {
          id: 'a3',
          status: 'Arrived',
          severity: 'Moderate',
          priority: 'P3',
          estimatedArrivalTime: '2026-06-17T11:40:00.000Z',
          arrivedAt: '2026-06-17T11:40:00.000Z',
        },
      ],
      now,
    );

    expect(summary.inboundCount).toBe(2);
    expect(summary.soonestEtaMinutes).toBe(0);
    expect(summary.riskCount).toBe(1);
    expect(getArrivalOffloadMinutes(summary.awaitingOffload[0], now)).toBe(20);
    expect(isHighRiskEmsArrival({ severity: 'High', priority: 'P3' })).toBe(true);
  });

  it('builds ETA, risk, and offload strip metrics', () => {
    const summary = summarizeEmsAwareness([
      {
        id: 'a1',
        status: 'Inbound',
        severity: 'Critical',
        priority: 'P1',
        eta: 5,
        estimatedArrivalTime: '2026-06-17T12:05:00.000Z',
      },
      {
        id: 'a2',
        status: 'Arrived',
        severity: 'Moderate',
        priority: 'P3',
        estimatedArrivalTime: '2026-06-17T11:30:00.000Z',
        arrivedAt: '2026-06-17T11:30:00.000Z',
      },
    ]);
    const labels = buildEmsAttentionStripMetrics(summary).map((metric) => metric.label);
    expect(labels).toEqual(expect.arrayContaining(['Inbound ETA', 'High risk', 'Offload']));
  });
});
