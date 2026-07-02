import { describe, expect, it } from 'vitest';
import { CANONICAL_ROUTES } from './routes.config';
import { HOSPITAL_COMMAND_ACTIONABLE_METRICS } from './hospitalCommandCenterRolePolicy';
import { OPERATIONAL_METRIC_KEYS } from './operationalMetricsModel';
import {
  COMMAND_CENTER_METRIC_ROUTES,
  UNIFIED_OPERATIONAL_METRICS,
  listUnifiedMetricsForSurface,
  resolveUnifiedMetricRoute,
} from './unifiedOperationalIntelligence.registry';

describe('unifiedOperationalIntelligence.registry', () => {
  it('covers every command-center actionable metric with a drill-down route', () => {
    for (const id of HOSPITAL_COMMAND_ACTIONABLE_METRICS) {
      expect(COMMAND_CENTER_METRIC_ROUTES[id]).toBeTruthy();
      expect(resolveUnifiedMetricRoute(id)).toBeTruthy();
    }
  });

  it('merges header metrics without dropping operational keys', () => {
    const headerIds = UNIFIED_OPERATIONAL_METRICS.filter((m) => m.source === 'header').map(
      (m) => m.id,
    );
    expect(headerIds).toEqual(expect.arrayContaining([...OPERATIONAL_METRIC_KEYS]));
  });

  it('routes three-minute compliance and unresolved alerts to command surfaces', () => {
    expect(COMMAND_CENTER_METRIC_ROUTES['three-minute-compliance']).toBe(
      CANONICAL_ROUTES.emergencyCommandCenter,
    );
    expect(COMMAND_CENTER_METRIC_ROUTES['unresolved-alerts']).toBe(
      CANONICAL_ROUTES.emergencyAlerts,
    );
    expect(COMMAND_CENTER_METRIC_ROUTES['ai-recommendations']).toBe(
      CANONICAL_ROUTES.emergencyCopilot,
    );
  });

  it('lists command-center surface metrics including command-only signals', () => {
    const commandMetrics = listUnifiedMetricsForSurface('command-center');
    expect(commandMetrics.length).toBeGreaterThan(OPERATIONAL_METRIC_KEYS.length);
    expect(commandMetrics.some((m) => m.id === 'three-minute-compliance')).toBe(true);
  });
});