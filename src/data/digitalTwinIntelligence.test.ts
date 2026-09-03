import { describe, expect, it } from 'vitest';
import { buildDigitalTwinIntelligence } from './digitalTwinIntelligence';

function buildStressedTwin() {
  return buildDigitalTwinIntelligence({
    digitalTwinSnapshot: {
      sourceLabel: 'Test twin',
      occupancy: { totalBeds: 20, occupiedBeds: 19, criticalBeds: 4 },
      floors: [{ id: 'icu', label: 'ICU', occupancy: 0.96, alerts: 4, devices: 12 }],
      rooms: [
        { id: 'icu-12', label: 'ICU 12', telemetry: 'stale SpO2', patientState: 'high acuity' },
      ],
      fleet: [{ id: 'amb-a12', label: 'Ambulance A-12' }],
    },
    hospitalMapSnapshot: {
      snapshot: {
        rooms: [{ id: 'icu-12', roomNumber: 'ICU 12', activeAlertCount: 2, deviceCount: 2 }],
        beds: [
          { id: 'bed-1', status: 'occupied' },
          { id: 'bed-2', status: 'occupied' },
          { id: 'bed-3', status: 'cleaning' },
        ],
        devices: [
          {
            id: 'monitor-1',
            name: 'ICU Monitor',
            status: 'offline',
            freshness: 'stale',
            battery: 12,
            maintenanceStatus: 'overdue',
            calibrationStatus: 'overdue',
            telemetry: [{ id: 'spo2', label: 'SpO2', status: 'stale', value: '88%' }],
          },
        ],
        alerts: [{ id: 'alert-1', title: 'Monitor offline', status: 'active', severity: 'high' }],
      },
    },
    medicalIotSnapshot: {
      snapshot: {
        devices: [{ id: 'iot-1', name: 'Pulse Ox', status: 'warning', battery: 18 }],
        vitals: [{ id: 'hr', label: 'HR', status: 'abnormal', value: '128' }],
        trends: [{ id: 'trend-1', label: 'Connectivity', status: 'warning' }],
        alerts: [{ id: 'alert-2', title: 'IoT warning', status: 'active', severity: 'medium' }],
      },
    },
    fleetSnapshot: {
      summary: { averageUtilizationPercent: 92 },
      vehicles: [
        {
          id: 'VH-1',
          label: 'Vehicle 1',
          status: 'maintenance',
          maintenanceStatus: 'warning',
          energyPercent: 20,
          utilizationPercent: 92,
          freshness: 'stale',
        },
      ],
      routes: [{ id: 'route-1', status: 'delayed' }],
      alerts: [{ id: 'fleet-alert', title: 'Fleet delayed', status: 'active', severity: 'medium' }],
    },
  });
}

describe('digitalTwinIntelligence', () => {
  it('generates health, risk, and readiness scores with explainable factors', () => {
    const model = buildStressedTwin();

    expect(model.scores.healthScore.value).toBeLessThan(90);
    expect(model.scores.riskScore.value).toBeGreaterThan(25);
    expect(model.scores.readinessScore.value).toBeLessThan(90);
    expect(model.scores.healthScore.factors.length).toBeGreaterThan(0);
    expect(model.scores.riskScore.factors.map((factor) => factor.label).join(' ')).toMatch(
      /occupancy|telemetry|maintenance/i,
    );
  });

  it('aggregates rooms, devices, telemetry, alerts, occupancy, and maintenance domains', () => {
    const model = buildStressedTwin();

    expect(model.domains.rooms.count).toBe(1);
    expect(model.domains.devices.count).toBe(2);
    expect(model.domains.telemetry.riskCount).toBeGreaterThan(0);
    expect(model.domains.alerts.riskCount).toBe(3);
    expect(model.domains.occupancy.riskCount).toBe(1);
    expect(model.domains.maintenance.riskCount).toBeGreaterThan(0);
    expect(model.insights.map((insight) => insight.id)).toEqual(
      expect.arrayContaining(['occupancy-pressure', 'device-connectivity', 'alert-concentration']),
    );
  });
});
