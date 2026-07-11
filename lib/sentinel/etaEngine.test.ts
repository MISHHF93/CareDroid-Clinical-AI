import { describe, expect, it } from 'vitest';
import { calculateEta, haversineKm, holdStaleEta } from './etaEngine';

describe('sentinel etaEngine', () => {
  const hospital = { latitude: 40.758, longitude: -73.9855 };
  const midtown = { latitude: 40.75, longitude: -73.99 };

  it('computes positive haversine distance', () => {
    const km = haversineKm(midtown, hospital);
    expect(km).toBeGreaterThan(0.5);
    expect(km).toBeLessThan(5);
  });

  it('returns confidence interval around point ETA', () => {
    const eta = calculateEta({
      origin: midtown,
      destination: hospital,
      speedKmh: 30,
      traffic: 'moderate',
      lastSeenAt: new Date().toISOString(),
    });
    expect(eta.etaPointMin).toBeGreaterThanOrEqual(0);
    expect(eta.etaLowMin).toBeLessThanOrEqual(eta.etaPointMin);
    expect(eta.etaHighMin).toBeGreaterThanOrEqual(eta.etaPointMin);
    expect(eta.confidence).toBeGreaterThan(0.4);
    expect(eta.confidence).toBeLessThanOrEqual(0.95);
    expect(eta.stale).toBe(false);
    expect(eta.inputsHash).toMatch(/^eta-/);
  });

  it('marks stale when lastSeen is old', () => {
    const eta = calculateEta({
      origin: midtown,
      destination: hospital,
      lastSeenAt: new Date(Date.now() - 20 * 60 * 1000).toISOString(),
    });
    expect(eta.stale).toBe(true);
    expect(eta.method).toBe('stale_hold');
  });

  it('holdStaleEta reduces confidence', () => {
    const base = calculateEta({
      origin: midtown,
      destination: hospital,
      speedKmh: 40,
      traffic: 'low',
      lastSeenAt: new Date().toISOString(),
    });
    const held = holdStaleEta(base, new Date(Date.now() - 30 * 60 * 1000).toISOString());
    expect(held.stale).toBe(true);
    expect(held.confidence).toBeLessThan(base.confidence);
  });
});
