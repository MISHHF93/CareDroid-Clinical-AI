/**
 * Route optimization — ordering, edge cases, savings math.
 */

import { describe, it, expect } from 'vitest';
import {
  hasMinimumRouteInput,
  normalizeRouteOptimizationInput,
  optimizeRoute,
  optimizeRouteBySort,
  ROUTE_ENGINE_GRAPH,
} from './routeOptimizationService';

describe('routeOptimizationService', () => {
  it('returns empty-friendly result for no labeled destinations', () => {
    const normalized = normalizeRouteOptimizationInput({
      destinations: [{ label: '' }, { label: '  ' }],
    });
    expect(hasMinimumRouteInput(normalized)).toBe(false);

    const result = optimizeRouteBySort(normalized);
    expect(result.optimizedSequence).toHaveLength(0);
    expect(result.travelEstimates.optimizedMinutes).toBe(0);
    expect(result.routeSavings.minutesSaved).toBe(0);
  });

  it('orders stops by priority then time window', () => {
    const result = optimizeRoute({
      depotLabel: 'Hub A',
      destinations: [
        { id: 'c', label: 'Clinic C', priority: 'low', windowStart: '14:00' },
        { id: 'a', label: 'Clinic A', priority: 'urgent', windowStart: '10:00' },
        { id: 'b', label: 'Clinic B', priority: 'high', windowStart: '09:00' },
        { id: 'd', label: 'Clinic D', priority: 'high', windowStart: '11:00' },
      ],
      trafficConstraints: { level: 'low' },
    });

    const labels = result.optimizedSequence.map((s) => s.destination.label);
    expect(labels[0]).toBe('Clinic A');
    expect(labels[1]).toBe('Clinic B');
    expect(labels[2]).toBe('Clinic D');
    expect(labels[3]).toBe('Clinic C');
  });

  it('uses nearer distance as tie-breaker within same priority', () => {
    const result = optimizeRoute({
      destinations: [
        { id: '1', label: 'Far', priority: 'medium', distanceKm: 20 },
        { id: '2', label: 'Near', priority: 'medium', distanceKm: 3 },
      ],
    });

    expect(result.optimizedSequence[0].destination.label).toBe('Near');
  });

  it('applies traffic multiplier to travel estimates', () => {
    const low = optimizeRoute({
      destinations: [{ label: 'Stop 1', distanceKm: 40 }],
      trafficConstraints: { level: 'low' },
    });
    const heavy = optimizeRoute({
      destinations: [{ label: 'Stop 1', distanceKm: 40 }],
      trafficConstraints: { level: 'heavy' },
    });

    expect(heavy.optimizedSequence[0].travelMinutes).toBeGreaterThan(
      low.optimizedSequence[0].travelMinutes,
    );
  });

  it('warns when max stops exceeded', () => {
    const result = optimizeRoute({
      destinations: [
        { label: 'A', priority: 'urgent' },
        { label: 'B', priority: 'high' },
        { label: 'C', priority: 'medium' },
      ],
      vehicleLimitations: { maxStops: 2 },
    });

    expect(result.optimizedSequence).toHaveLength(2);
    expect(result.warnings.some((w) => /max stops/i.test(w))).toBe(true);
  });

  it('handles single destination without savings', () => {
    const result = optimizeRoute({
      destinations: [{ label: 'Only Stop', priority: 'medium', distanceKm: 10 }],
    });

    expect(result.optimizedSequence).toHaveLength(1);
    expect(result.routeSavings.minutesSaved).toBe(0);
    expect(result.optimizedSequence[0].stopNumber).toBe(1);
  });

  it('normalizes invalid priority and time formats', () => {
    const normalized = normalizeRouteOptimizationInput({
      destinations: [
        {
          label: '  Site X ',
          priority: 'unknown',
          windowStart: 'bad',
          distanceKm: -5,
        },
      ],
    });

    expect(normalized.destinations[0].label).toBe('Site X');
    expect(normalized.destinations[0].priority).toBe('medium');
    expect(normalized.destinations[0].windowStartMinutes).toBeNull();
    expect(normalized.destinations[0].distanceKm).toBeNull();
  });

  it('falls back to sort when graph engine has no provider', () => {
    const result = optimizeRoute(
      { destinations: [{ label: 'A', priority: 'high' }] },
      { engine: ROUTE_ENGINE_GRAPH },
    );

    expect(result.engine).toBe(ROUTE_ENGINE_GRAPH);
    expect(result.graphPending).toBe(true);
    expect(result.optimizedSequence).toHaveLength(1);
    expect(result.note).toMatch(/sort-based/i);
  });

  it('flags late window when arrival exceeds clock window end', () => {
    const result = optimizeRoute({
      routeStart: '08:00',
      destinations: [
        {
          label: 'Tight Window',
          priority: 'urgent',
          distanceKm: 80,
          serviceMinutes: 30,
          windowEnd: '08:30',
        },
      ],
      trafficConstraints: { level: 'heavy' },
    });

    expect(result.optimizedSequence[0].windowStatus).toBe('late');
    expect(result.warnings.some((w) => /time window/i.test(w))).toBe(true);
  });

  it('warns when estimated distance exceeds vehicle range', () => {
    const result = optimizeRoute({
      destinations: [
        { label: 'Far A', priority: 'high', distanceKm: 200 },
        { label: 'Far B', priority: 'medium', distanceKm: 200 },
        { label: 'Far C', priority: 'low', distanceKm: 200 },
      ],
      vehicleLimitations: { maxStops: 12, maxDistanceKm: 100 },
    });

    expect(result.warnings.some((w) => /exceeds vehicle range/i.test(w))).toBe(true);
  });

  it('is deterministic for identical inputs', () => {
    const input = {
      destinations: [
        { label: 'B', priority: 'medium', distanceKm: 10 },
        { label: 'A', priority: 'urgent', distanceKm: 5 },
      ],
    };
    const a = optimizeRoute(input);
    const b = optimizeRoute(input);
    expect(a.optimizedSequence.map((s) => s.destination.label)).toEqual(
      b.optimizedSequence.map((s) => s.destination.label),
    );
    expect(a.routeSavings).toEqual(b.routeSavings);
  });

  it('delegates to graphProvider when configured', () => {
    const result = optimizeRoute(
      { destinations: [{ label: 'A' }] },
      {
        engine: ROUTE_ENGINE_GRAPH,
        graphProvider: () => ({
          engine: ROUTE_ENGINE_GRAPH,
          optimizedSequence: [{ stopNumber: 1, destination: { label: 'Graph Stop' } }],
          travelEstimates: {},
          routeSavings: { minutesSaved: 99 },
        }),
      },
    );

    expect(result.routeSavings.minutesSaved).toBe(99);
    expect(result.optimizedSequence[0].destination.label).toBe('Graph Stop');
  });
});
