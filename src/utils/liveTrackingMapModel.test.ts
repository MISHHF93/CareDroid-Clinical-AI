import { describe, expect, it } from 'vitest';
import {
  buildFleetTrackingMarkers,
  buildIotTrackingMarkers,
  filterTrackingMarkers,
} from './liveTrackingMapModel';

describe('liveTrackingMapModel', () => {
  it('builds fleet and IoT markers', () => {
    expect(
      buildFleetTrackingMarkers([
        { id: 'VH-1', label: 'Van 1', status: 'active', mapPosition: { x: 10, y: 20 } },
      ]),
    ).toEqual([
      expect.objectContaining({ id: 'fleet-VH-1', layer: 'fleet', x: 10, y: 20 }),
    ]);

    expect(
      buildIotTrackingMarkers([
        { id: 'dev-1', name: 'Monitor', status: 'online', location: { x: 30, y: 40 } },
      ]),
    ).toEqual([
      expect.objectContaining({ id: 'iot-dev-1', layer: 'iot', x: 30, y: 40 }),
    ]);
  });

  it('filters markers by layer and status', () => {
    const markers = [
      ...buildFleetTrackingMarkers([{ id: 'A', label: 'A', status: 'active' }]),
      ...buildIotTrackingMarkers([{ id: 'B', name: 'B', status: 'warning' }]),
    ];
    expect(filterTrackingMarkers(markers, 'fleet')).toHaveLength(1);
    expect(filterTrackingMarkers(markers, 'all', 'warning')).toHaveLength(1);
  });
});