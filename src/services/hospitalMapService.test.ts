import { describe, expect, it } from 'vitest';
import {
  normalizeHospitalMapBackendSnapshot,
  summarizeHospitalMapSnapshot,
} from './hospitalMapService';

describe('hospitalMapService', () => {
  it('normalizes backend demo floor and device payloads for HospitalMapDashboard', () => {
    const snapshot = normalizeHospitalMapBackendSnapshot({
      generatedAt: '2026-05-24T12:00:00.000Z',
      floorPayload: {
        floors: [{ id: 'floor-2', name: 'ICU' }],
        units: [{ id: 'icu', floorId: 'floor-2', name: 'ICU' }],
        rooms: [{ id: 'icu-12', floorId: 'floor-2', unitId: 'icu', name: 'ICU 12' }],
        beds: [{ id: 'bed-12a', roomId: 'icu-12', label: 'Bed 12A' }],
      },
      devicePayload: {
        devices: [
          {
            id: 'pump-icu-12',
            name: 'ICU 12 Infusion Pump',
            type: 'Infusion pump',
            status: 'warning',
            freshness: 'stale',
            floorId: 'floor-2',
            unitId: 'icu',
            roomId: 'icu-12',
            bedId: 'bed-12a',
            battery: 18,
            maintenanceStatus: 'due-soon',
            calibrationStatus: 'ok',
            lastSeenAt: '2026-05-24T11:40:00.000Z',
            location: {
              x: 420,
              y: 180,
              source: 'Backend demo floor coordinate',
            },
            telemetry: { infusionPumpState: 'Running' },
          },
        ],
        alerts: [
          {
            id: 'pump-low-battery',
            deviceId: 'pump-icu-12',
            severity: 'medium',
            status: 'active',
            title: 'Low battery',
            detail: 'Battery below threshold.',
            timestamp: '2026-05-24T11:40:00.000Z',
          },
        ],
      },
    });

    expect(snapshot).toMatchObject({
      source: 'backend-demo-hospital-map',
      generatedAt: '2026-05-24T12:00:00.000Z',
      rooms: [{ roomNumber: 'ICU 12', deviceCount: 1, activeAlertCount: 1 }],
      devices: [
        {
          id: 'pump-icu-12',
          x: 420,
          y: 180,
          locationSource: 'Backend demo floor coordinate',
          activeAlerts: [{ id: 'pump-low-battery', triggeredAt: '2026-05-24T11:40:00.000Z' }],
          telemetry: [{ parameter: 'infusion-pump-state', value: 'Running' }],
        },
      ],
      alerts: [
        {
          id: 'pump-low-battery',
          deviceName: 'ICU 12 Infusion Pump',
          triggeredAt: '2026-05-24T11:40:00.000Z',
          roomId: 'icu-12',
        },
      ],
    });
    expect(summarizeHospitalMapSnapshot(snapshot)).toMatchObject({
      rooms: 1,
      devices: 1,
      stale: 1,
      lowBattery: 1,
      activeAlerts: 1,
      maintenanceDue: 1,
    });
  });
});
