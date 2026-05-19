/**
 * Route optimizer result widgets — ops warning helper.
 */

import { describe, it, expect } from 'vitest';
import { getRouteOpsWarningItems, shouldShowRouteOpsWarning } from './RouteOptimizerWidgets';
import { optimizeRoute } from '../../services/routeOptimizationService';

describe('shouldShowRouteOpsWarning', () => {
  it('returns false when result is null', () => {
    expect(shouldShowRouteOpsWarning(null)).toBe(false);
  });

  it('returns true when a stop is late for its window', () => {
    const result = optimizeRoute({
      routeStart: '08:00',
      destinations: [
        {
          label: 'Late stop',
          priority: 'urgent',
          distanceKm: 100,
          serviceMinutes: 60,
          windowEnd: '09:00',
        },
      ],
      trafficConstraints: { level: 'heavy' },
    });
    expect(shouldShowRouteOpsWarning(result)).toBe(true);
  });

  it('returns false for simple on-time route', () => {
    const result = optimizeRoute({
      destinations: [{ label: 'Nearby', priority: 'medium', distanceKm: 2 }],
    });
    expect(shouldShowRouteOpsWarning(result)).toBe(false);
  });
});

describe('getRouteOpsWarningItems', () => {
  it('names late stops in warning items', () => {
    const result = optimizeRoute({
      routeStart: '08:00',
      destinations: [
        {
          label: 'Late stop',
          priority: 'urgent',
          distanceKm: 100,
          serviceMinutes: 60,
          windowEnd: '09:00',
        },
      ],
      trafficConstraints: { level: 'heavy' },
    });
    const items = getRouteOpsWarningItems(result);
    expect(items.some((item) => /Late stop/i.test(item))).toBe(true);
  });
});
