import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('./liveTrackingApi', () => ({
  fetchLiveTrackingCapability: vi.fn(),
}));

import { fetchLiveTrackingCapability } from './liveTrackingApi';
import { buildDemoMedicalIotSnapshot, fetchMedicalIotSnapshot } from './medicalIotService';

function capabilityResult(demo: boolean) {
  return {
    ok: true,
    payload: {
      devices: [{ id: 'spo2-bed-12', status: 'online' }],
      vitals: [{ label: 'SpO2', value: 91 }],
      alerts: [{ id: 'alert-1', severity: 'high' }],
      trends: [],
      connectivityTimeline: [],
    },
    demo,
    sourceLabel: '',
    message: '',
  };
}

describe('medicalIotService', () => {
  it('builds fallback telemetry with required Medical IoT vitals and trends', () => {
    const snapshot = buildDemoMedicalIotSnapshot(new Date('2026-05-24T05:00:00.000Z'));

    expect(snapshot.devices).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          name: 'Bed 12 Pulse Oximeter',
          status: 'online',
          battery: 82,
          signalStrength: 91,
          connectivity: 'Wi-Fi',
          assignedRoom: 'ICU-12',
          activeAlerts: ['Low oxygen saturation'],
        }),
      ])
    );
    expect(snapshot.vitals.map((vital) => vital.label)).toEqual(
      expect.arrayContaining(['HR', 'SpO2', 'BP', 'RR', 'Temperature', 'Glucose', 'ECG'])
    );
    expect(snapshot.trends.map((trend) => trend.parameter)).toEqual(
      expect.arrayContaining(['hr', 'spo2', 'bp', 'respiratory-rate', 'temperature', 'glucose', 'ecg'])
    );
  });
});

describe('medicalIotService demo honesty', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('reports demo state from the backend flag, not from the request succeeding', async () => {
    vi.mocked(fetchLiveTrackingCapability).mockResolvedValue(capabilityResult(true) as never);

    const result = await fetchMedicalIotSnapshot();

    // The request reached the server, so `unsupported` is false. That must not be
    // mistaken for a live feed while the payload is still seeded demo telemetry.
    expect(result.unsupported).toBe(false);
    expect(result.demo).toBe(true);
    expect(result.snapshot.source).toBe('backend-demo-telemetry');
    expect(result.message).toMatch(/do not treat it as live patient monitoring/i);
  });

  it('reports a live feed only when the backend stops flagging telemetry as demo', async () => {
    vi.mocked(fetchLiveTrackingCapability).mockResolvedValue(capabilityResult(false) as never);

    const result = await fetchMedicalIotSnapshot();

    expect(result.demo).toBe(false);
    expect(result.snapshot.source).toBe('backend-telemetry');
  });

  it('falls back to clearly flagged local demo telemetry when the backend is unreachable', async () => {
    vi.mocked(fetchLiveTrackingCapability).mockResolvedValue({ ok: false, unsupported: true } as never);

    const result = await fetchMedicalIotSnapshot();

    expect(result.unsupported).toBe(true);
    expect(result.demo).toBe(true);
  });
});
