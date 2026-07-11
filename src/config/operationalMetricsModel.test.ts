import { describe, expect, it } from 'vitest';
import { CANONICAL_ROUTES } from './routes.config';
import {
  OPERATIONAL_METRIC_KEYS,
  OPERATIONAL_METRIC_REGISTRY,
  buildOperationalAlertTypeRoutes,
  filterOperationalMetrics,
  getOperationalMetricRoute,
  getWhiteboardMetricHandler,
  groupOperationalAlertsByMetric,
  resolveOperationalAlertRoute,
} from './operationalMetricsModel';

describe('operationalMetricsModel', () => {
  const sampleMetrics = OPERATIONAL_METRIC_KEYS.map((key, index) => ({
    key,
    label: key,
    value: index,
    source: 'test',
  }));

  it('registers all operational metrics once', () => {
    expect(OPERATIONAL_METRIC_REGISTRY).toHaveLength(OPERATIONAL_METRIC_KEYS.length);
    expect(OPERATIONAL_METRIC_REGISTRY.map((entry) => entry.key)).toEqual([
      ...OPERATIONAL_METRIC_KEYS,
    ]);
  });

  it('filters metrics consistently per surface', () => {
    const whiteboardKeys = filterOperationalMetrics(sampleMetrics, 'whiteboard').map(
      (metric) => metric.key,
    );
    const analyticsKeys = filterOperationalMetrics(sampleMetrics, 'analytics').map(
      (metric) => metric.key,
    );

    expect(whiteboardKeys).not.toContain('waiting');
    expect(whiteboardKeys).not.toContain('longestWait');
    expect(analyticsKeys).toEqual([...OPERATIONAL_METRIC_KEYS]);
  });

  it('maps alert types to metric routes without duplicating route tables', () => {
    const routes = buildOperationalAlertTypeRoutes();
    expect((routes as any).reassessment).toBe(CANONICAL_ROUTES.emergencyReassessment);
    expect(resolveOperationalAlertRoute({ type: 'EMS', title: 'Inbound EMS' })).toBe(
      CANONICAL_ROUTES.emergencyEms,
    );
    expect(getOperationalMetricRoute('capacityScore')).toBe(CANONICAL_ROUTES.emergencyCapacity);
  });

  it('assigns whiteboard handlers for awareness metrics', () => {
    expect(getWhiteboardMetricHandler('reassessmentsDue')).toBe('reassessment-board');
    expect(getWhiteboardMetricHandler('emsInbound')).toBe('ems-awareness');
    expect(getWhiteboardMetricHandler('referralsPending')).toBe('referral-awareness');
  });

  it('groups active alerts under operational metric keys', () => {
    const grouped = groupOperationalAlertsByMetric([
      { id: '1', type: 'Reassessment', title: 'Reassessment due' },
      { id: '2', type: 'EMS', title: 'Critical inbound' },
    ]);
    expect(grouped.byMetric.reassessmentsDue).toHaveLength(1);
    expect(grouped.byMetric.emsInbound).toHaveLength(1);
  });
});
