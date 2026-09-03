import { describe, expect, it } from 'vitest';
import {
  buildDeviceMarkers,
  buildRoomMarkers,
  buildUnitOccupancyChart,
  resolveRoomTone,
} from './hospitalMapChartModel';

describe('hospitalMapChartModel', () => {
  it('builds unit occupancy percentages', () => {
    expect(
      buildUnitOccupancyChart([
        { name: 'ICU', occupied: 14, total: 16 },
        { name: 'Emergency Department', occupied: 26, total: 32 },
      ]),
    ).toEqual([
      { name: 'ICU', value: 88 },
      { name: 'Emergency Depa…', value: 81 },
    ]);
  });

  it('resolves room tone from device and alert counts', () => {
    expect(resolveRoomTone(0, 0)).toBe('neutral');
    expect(resolveRoomTone(1, 0)).toBe('good');
    expect(resolveRoomTone(3, 0)).toBe('warning');
    expect(resolveRoomTone(1, 1)).toBe('critical');
  });

  it('builds room and device markers from snapshot rows', () => {
    expect(
      buildRoomMarkers([
        {
          id: 'icu-12',
          roomNumber: 'ICU-12',
          x: 84,
          y: 82,
          width: 210,
          height: 145,
          deviceCount: 2,
          activeAlertCount: 1,
        },
      ]),
    ).toEqual([
      {
        id: 'icu-12',
        label: 'ICU-12',
        x: 84,
        y: 82,
        width: 210,
        height: 145,
        deviceCount: 2,
        alertCount: 1,
        tone: 'critical',
      },
    ]);

    expect(
      buildDeviceMarkers([
        {
          id: 'vent-icu-12',
          name: 'ICU-12 Ventilator',
          x: 216,
          y: 145,
          status: 'online',
          roomId: 'icu-12',
        },
      ]),
    ).toEqual([
      {
        id: 'vent-icu-12',
        label: 'ICU-12 Ventilator',
        x: 216,
        y: 145,
        status: 'online',
        roomId: 'icu-12',
      },
    ]);
  });
});
