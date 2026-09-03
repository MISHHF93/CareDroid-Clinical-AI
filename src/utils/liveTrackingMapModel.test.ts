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
    ).toEqual([expect.objectContaining({ id: 'fleet-VH-1', layer: 'fleet', x: 10, y: 20 })]);

    expect(
      buildIotTrackingMarkers([
        { id: 'dev-1', name: 'Monitor', status: 'online', location: { x: 30, y: 40 } },
      ]),
    ).toEqual([expect.objectContaining({ id: 'iot-dev-1', layer: 'iot', x: 30, y: 40 })]);
  });

  it('filters markers by layer and status', () => {
    const markers = [
      ...buildFleetTrackingMarkers([{ id: 'A', label: 'A', status: 'active' }]),
      ...buildIotTrackingMarkers([{ id: 'B', name: 'B', status: 'warning' }]),
    ];
    expect(filterTrackingMarkers(markers, 'fleet')).toHaveLength(1);
    expect(filterTrackingMarkers(markers, 'all', 'warning')).toHaveLength(1);
  });

  // Regression guard (Cycle 209): buildFleetTrackingMarkers used to build its
  // subtitle with `FLEET_STATUS_TONE[vehicle.status] ? vehicle.status :
  // vehicle.status` — both ternary branches were identical, so it always
  // unconditionally put the vehicle's status first. The marker-list UI
  // already renders `{marker.status}` in a sibling <span> immediately before
  // the <small>{marker.subtitle}</small> — so every fleet card visibly
  // doubled its status word (e.g. "occupied · occupied").
  it('fleet subtitle does not repeat the status the UI already renders separately', () => {
    const [marker] = buildFleetTrackingMarkers([
      {
        id: 'VH-1',
        label: 'Van 101',
        status: 'occupied',
        destination: 'CareDroid North Clinic',
        etaMinutes: 18,
      },
    ]);
    expect(marker.subtitle).toBe('CareDroid North Clinic · ETA 18m');
    expect(marker.subtitle.startsWith(marker.status)).toBe(false);
  });

  it('fleet subtitle omits destination/ETA cleanly when absent, without a leading separator', () => {
    const [marker] = buildFleetTrackingMarkers([
      { id: 'VH-2', label: 'Truck 204', status: 'available', destination: 'Depot' },
    ]);
    expect(marker.subtitle).toBe('Depot');
  });
});
