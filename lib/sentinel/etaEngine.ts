/**
 * Deterministic route-based ETA with confidence intervals.
 * Pure functions — no I/O. Suitable for offline fallback.
 */

import type { SentinelCoordinates, SentinelEtaResult } from './types';

const EARTH_RADIUS_KM = 6371;
const DEFAULT_AVG_SPEED_KMH = 48;
const STALE_POSITION_MS = 5 * 60 * 1000;

export const TRAFFIC_MULTIPLIER = Object.freeze({
  low: 1,
  moderate: 1.25,
  heavy: 1.6,
  unknown: 1.2,
} as const);

export type TrafficLevel = keyof typeof TRAFFIC_MULTIPLIER;

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

function toRad(deg: number): number {
  return (deg * Math.PI) / 180;
}

/** Great-circle distance in kilometers (Haversine). */
export function haversineKm(a: SentinelCoordinates, b: SentinelCoordinates): number {
  const dLat = toRad(b.latitude - a.latitude);
  const dLon = toRad(b.longitude - a.longitude);
  const lat1 = toRad(a.latitude);
  const lat2 = toRad(b.latitude);
  const h =
    Math.sin(dLat / 2) ** 2 + Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLon / 2) ** 2;
  return 2 * EARTH_RADIUS_KM * Math.asin(Math.min(1, Math.sqrt(h)));
}

/** Stable non-crypto hash for ETA input fingerprinting. */
export function hashEtaInputs(parts: readonly (string | number | boolean | null | undefined)[]): string {
  const raw = parts.map((p) => String(p ?? '')).join('|');
  let h = 2166136261;
  for (let i = 0; i < raw.length; i += 1) {
    h ^= raw.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return `eta-${(h >>> 0).toString(16)}`;
}

export type CalculateEtaInput = Readonly<{
  origin: SentinelCoordinates;
  destination: SentinelCoordinates;
  /** Ground speed km/h if known; otherwise model average is used. */
  speedKmh?: number | null;
  traffic?: TrafficLevel;
  /** Optional precomputed route distance (km). */
  routeDistanceKm?: number | null;
  lastSeenAt?: string | null;
  nowMs?: number;
}>;

/**
 * Compute ETA point estimate and confidence band.
 * Confidence drops when position is stale, speed unknown, or traffic unknown.
 */
export function calculateEta(input: CalculateEtaInput): SentinelEtaResult {
  const nowMs = input.nowMs ?? Date.now();
  const traffic = input.traffic ?? 'unknown';
  const trafficMul = TRAFFIC_MULTIPLIER[traffic];

  let distanceKm: number;
  let method: SentinelEtaResult['method'];

  if (
    input.routeDistanceKm != null &&
    Number.isFinite(input.routeDistanceKm) &&
    input.routeDistanceKm >= 0
  ) {
    distanceKm = input.routeDistanceKm;
    method = 'route_distance';
  } else {
    distanceKm = haversineKm(input.origin, input.destination);
    method = 'haversine_speed';
  }

  const speedKnown =
    input.speedKmh != null && Number.isFinite(input.speedKmh) && input.speedKmh > 2;
  const speedKmh = speedKnown ? Number(input.speedKmh) : DEFAULT_AVG_SPEED_KMH;

  const travelHours = distanceKm / Math.max(5, speedKmh);
  const etaPointMin = Math.max(0, Math.round(travelHours * 60 * trafficMul));

  let confidence = 0.82;
  if (!speedKnown) confidence -= 0.12;
  if (traffic === 'unknown') confidence -= 0.08;
  if (method === 'haversine_speed') confidence -= 0.05;

  let stale = false;
  if (input.lastSeenAt) {
    const age = nowMs - Date.parse(input.lastSeenAt);
    if (Number.isFinite(age) && age > STALE_POSITION_MS) {
      stale = true;
      confidence -= 0.2;
      method = 'stale_hold';
    }
  }

  confidence = clamp(confidence, 0.15, 0.95);

  // Wider band when less confident
  const halfWidth = Math.max(1, Math.ceil(etaPointMin * (1 - confidence) * 0.55 + 1));
  const etaLowMin = Math.max(0, etaPointMin - halfWidth);
  const etaHighMin = etaPointMin + halfWidth;

  const calculatedAt = new Date(nowMs).toISOString();
  const inputsHash = hashEtaInputs([
    input.origin.latitude.toFixed(5),
    input.origin.longitude.toFixed(5),
    input.destination.latitude.toFixed(5),
    input.destination.longitude.toFixed(5),
    distanceKm.toFixed(3),
    speedKmh,
    traffic,
    method,
  ]);

  return Object.freeze({
    etaPointMin,
    etaLowMin,
    etaHighMin,
    confidence,
    method,
    inputsHash,
    calculatedAt,
    distanceKm: Math.round(distanceKm * 1000) / 1000,
    stale,
  });
}

/** Hold previous ETA when GPS is too stale to recompute safely. */
export function holdStaleEta(
  previous: SentinelEtaResult,
  lastSeenAt: string | null | undefined,
  nowMs = Date.now(),
): SentinelEtaResult {
  const age = lastSeenAt ? nowMs - Date.parse(lastSeenAt) : Number.POSITIVE_INFINITY;
  if (!Number.isFinite(age) || age <= STALE_POSITION_MS) {
    return previous;
  }
  return Object.freeze({
    ...previous,
    method: 'stale_hold' as const,
    confidence: clamp(previous.confidence * 0.7, 0.1, 0.6),
    stale: true,
    calculatedAt: new Date(nowMs).toISOString(),
  });
}
