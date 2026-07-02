import { describe, expect, it } from 'vitest';
import {
  applyLiveMetricsToSurfaces,
  buildLiveSurfaceMetrics,
} from './operationsHubLiveMetrics';

describe('operationsHubLiveMetrics', () => {
  it('builds hospital map metrics from capacity and map snapshot', () => {
    expect(
      buildLiveSurfaceMetrics('hospital-map', {
        capacity: {
          units: [{ status: 'red' }, { status: 'green' }],
          availableBeds: 12,
          boardingPatients: 3,
        },
        hospitalMap: {
          snapshot: {
            devices: [{}],
            alerts: [{ status: 'active' }, { status: 'resolved' }],
            rooms: [{}, {}],
          },
        },
      }),
    ).toEqual([
      { label: 'Units visible', value: '2' },
      { label: 'Available beds', value: '12' },
      { label: 'Active alerts', value: '1' },
      { label: 'Boarding patients', value: '3' },
    ]);
  });

  it('builds fleet and health metrics', () => {
    expect(
      buildLiveSurfaceMetrics('fleet', {
        fleet: {
          summary: { availableVehicles: 4, maintenanceCount: 2 },
          alerts: [{}, {}],
        },
      }),
    ).toEqual([
      { label: 'Available vehicles', value: '4' },
      { label: 'Maintenance watch', value: '2' },
      { label: 'Fleet alerts', value: '2' },
    ]);

    expect(
      buildLiveSurfaceMetrics('system-health', {
        platformHealth: { saas: { data: { summary: { healthy: 3, total: 4, warning: 1 } } } },
      }),
    ).toEqual([
      { label: 'Healthy probes', value: '3' },
      { label: 'Total probes', value: '4' },
      { label: 'Warnings', value: '1' },
    ]);
  });

  it('overlays live metrics onto configured surfaces', () => {
    const surfaces = applyLiveMetricsToSurfaces(
      [
        {
          id: 'fleet',
          status: 'demo-fleet-ops',
          metrics: [{ label: 'Available vehicles', value: '18' }],
        },
      ],
      {
        fleet: { summary: { availableVehicles: 5, maintenanceCount: 1 }, alerts: [] },
      },
    );

    expect(surfaces[0].metrics[0]).toEqual({ label: 'Available vehicles', value: '5' });
    expect(surfaces[0].status).toContain('live scan');
  });
});