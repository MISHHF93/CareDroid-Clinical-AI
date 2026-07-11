import { describe, expect, it } from 'vitest';
import {
  buildApproachBox,
  evaluateGeofenceTransition,
  pointInPolygon,
} from './geofenceEngine';

describe('sentinel geofenceEngine', () => {
  const square = [
    { latitude: 0, longitude: 0 },
    { latitude: 0, longitude: 1 },
    { latitude: 1, longitude: 1 },
    { latitude: 1, longitude: 0 },
  ];

  it('detects points inside and outside', () => {
    expect(pointInPolygon({ latitude: 0.5, longitude: 0.5 }, square)).toBe(true);
    expect(pointInPolygon({ latitude: 2, longitude: 2 }, square)).toBe(false);
  });

  it('emits enter and exit transitions', () => {
    const enter = evaluateGeofenceTransition({
      fenceId: 'f1',
      ring: square,
      point: { latitude: 0.5, longitude: 0.5 },
      previouslyInside: false,
    });
    expect(enter.transition).toBe('entered');

    const exit = evaluateGeofenceTransition({
      fenceId: 'f1',
      ring: square,
      point: { latitude: 2, longitude: 2 },
      previouslyInside: true,
    });
    expect(exit.transition).toBe('exited');
  });

  it('builds approach box containing center', () => {
    const center = { latitude: 40.75, longitude: -73.98 };
    const ring = buildApproachBox(center, 2);
    expect(pointInPolygon(center, ring)).toBe(true);
  });
});
