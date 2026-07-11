import { describe, expect, it } from 'vitest';
import {
  buildSentinelCommandMetrics,
  buildSentinelLiveRegionText,
  formatEtaRange,
} from './sentinelCommandModel';
import type { SentinelCommandSnapshot, SentinelUnitView } from '../../types/sentinel';

const unit: SentinelUnitView = {
  id: 'u1',
  externalId: 'Medic-12',
  label: 'Medic 12',
  status: 'transporting',
  freshness: 'fresh',
  coordinates: { latitude: 40.75, longitude: -73.99 },
  heading: 90,
  speedKmh: 40,
  lastSeenAt: new Date().toISOString(),
  eta: {
    etaPointMin: 8,
    etaLowMin: 6,
    etaHighMin: 11,
    confidence: 0.8,
    stale: false,
    method: 'haversine_speed',
  },
};

const snapshot: SentinelCommandSnapshot = {
  units: [unit],
  geofences: [],
  episodes: [],
  inboundPatients: [{ id: 'i1' }],
  openAlarms: [{ id: 'a1', severity: 'critical' }],
  aiRecommendations: [{ id: 'r1' }],
};

describe('sentinelCommandModel', () => {
  it('formats ETA ranges with confidence', () => {
    expect(formatEtaRange(unit)).toContain('6–11 min');
    expect(formatEtaRange(unit)).toContain('80%');
  });

  it('builds command metrics from snapshot', () => {
    const metrics = buildSentinelCommandMetrics(snapshot);
    expect(metrics.length).toBeGreaterThanOrEqual(4);
    expect(metrics.some((m) => m.label === 'Inbound EMS')).toBe(true);
    expect(metrics.some((m) => m.label === 'Sentinel alarms')).toBe(true);
  });

  it('builds accessible live region text', () => {
    const text = buildSentinelLiveRegionText(snapshot);
    expect(text).toMatch(/inbound patients/i);
    expect(text).toMatch(/human review/i);
  });
});
