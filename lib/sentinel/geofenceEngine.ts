/**
 * Geofencing with ray-casting (PostGIS-free). Use PostGIS ST_Contains in prod when enabled.
 */

import type { SentinelCoordinates, SentinelPolygonRing } from './types';

/**
 * Point-in-polygon using ray casting (even-odd rule).
 * Ring should be closed or will be treated as closed.
 */
export function pointInPolygon(
  point: SentinelCoordinates,
  ring: SentinelPolygonRing,
): boolean {
  if (ring.length < 3) return false;

  const x = point.longitude;
  const y = point.latitude;
  let inside = false;

  for (let i = 0, j = ring.length - 1; i < ring.length; j = i, i += 1) {
    const xi = ring[i].longitude;
    const yi = ring[i].latitude;
    const xj = ring[j].longitude;
    const yj = ring[j].latitude;

    const intersect =
      yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi + Number.EPSILON) + xi;
    if (intersect) inside = !inside;
  }

  return inside;
}

export type GeofenceEvalInput = Readonly<{
  fenceId: string;
  ring: SentinelPolygonRing;
  point: SentinelCoordinates;
  previouslyInside: boolean;
}>;

export type GeofenceTransition = Readonly<{
  fenceId: string;
  transition: 'entered' | 'exited' | 'none';
  inside: boolean;
}>;

export function evaluateGeofenceTransition(input: GeofenceEvalInput): GeofenceTransition {
  const inside = pointInPolygon(input.point, input.ring);
  if (inside && !input.previouslyInside) {
    return Object.freeze({ fenceId: input.fenceId, transition: 'entered', inside: true });
  }
  if (!inside && input.previouslyInside) {
    return Object.freeze({ fenceId: input.fenceId, transition: 'exited', inside: false });
  }
  return Object.freeze({
    fenceId: input.fenceId,
    transition: 'none',
    inside,
  });
}

/** Build a simple axis-aligned approach box around a hospital coordinate (degrees). */
export function buildApproachBox(
  center: SentinelCoordinates,
  halfWidthKm: number,
): SentinelPolygonRing {
  // ~111 km per degree latitude; longitude scaled by cos(lat)
  const dLat = halfWidthKm / 111;
  const cosLat = Math.cos((center.latitude * Math.PI) / 180);
  const dLon = halfWidthKm / (111 * Math.max(0.2, Math.abs(cosLat)));

  return Object.freeze([
    Object.freeze({ latitude: center.latitude - dLat, longitude: center.longitude - dLon }),
    Object.freeze({ latitude: center.latitude - dLat, longitude: center.longitude + dLon }),
    Object.freeze({ latitude: center.latitude + dLat, longitude: center.longitude + dLon }),
    Object.freeze({ latitude: center.latitude + dLat, longitude: center.longitude - dLon }),
  ]);
}
