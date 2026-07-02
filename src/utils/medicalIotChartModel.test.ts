import { describe, expect, it } from 'vitest';
import {
  buildConnectivityChart,
  buildDeviceCategoryChart,
  buildDeviceStatusChart,
  buildIotMapMarkers,
  categoryLabel,
  resolveDeviceCategory,
} from './medicalIotChartModel';

describe('medicalIotChartModel', () => {
  it('resolves device categories from type strings', () => {
    expect(resolveDeviceCategory('Pulse oximeter')).toBe('monitor');
    expect(resolveDeviceCategory('Infusion pump')).toBe('infusion');
    expect(resolveDeviceCategory('Continuous glucose monitor')).toBe('wearable');
    expect(categoryLabel('infusion')).toBe('Infusion');
  });

  it('builds status and category charts', () => {
    const devices = [
      { status: 'online', category: 'monitor' },
      { status: 'online', category: 'monitor' },
      { status: 'critical', category: 'infusion' },
    ];
    expect(buildDeviceStatusChart(devices)).toEqual([
      { name: 'online', value: 2 },
      { name: 'critical', value: 1 },
    ]);
    expect(buildDeviceCategoryChart(devices)).toEqual([
      { name: 'Monitors', value: 2 },
      { name: 'Infusion', value: 1 },
    ]);
  });

  it('builds connectivity and map markers', () => {
    expect(
      buildConnectivityChart([
        { label: '00:30', online: 3, warning: 1, offline: 1 },
        { label: 'Now', online: 1, warning: 1, offline: 1 },
      ]),
    ).toEqual([
      { name: 'Online', value: 1 },
      { name: 'Warning', value: 1 },
      { name: 'Offline', value: 1 },
    ]);

    expect(
      buildIotMapMarkers([
        {
          id: 'dev-1',
          name: 'Bed monitor',
          status: 'online',
          category: 'monitor',
          room: 'ICU-12',
          x: 24,
          y: 34,
        },
      ]),
    ).toEqual([
      {
        id: 'dev-1',
        label: 'Bed monitor',
        status: 'online',
        category: 'monitor',
        room: 'ICU-12',
        alarms: 0,
        x: 24,
        y: 34,
      },
    ]);
  });
});