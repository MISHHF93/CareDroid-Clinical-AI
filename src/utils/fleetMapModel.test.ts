import { describe, expect, it } from 'vitest';
import {
  alertSeverityTone,
  buildRoutePolyline,
  routeStatusColor,
  vehicleMarkerTone,
} from './fleetMapModel';

describe('fleetMapModel', () => {
  it('builds route polylines', () => {
    expect(
      buildRoutePolyline([
        { x: 1, y: 2 },
        { x: 4, y: 5 },
      ]),
    ).toBe('1,2 4,5');
  });

  it('resolves marker and alert tones', () => {
    expect(vehicleMarkerTone('available')).toBe('good');
    expect(vehicleMarkerTone('occupied', 'stale')).toBe('warning');
    expect(alertSeverityTone('high')).toBe('critical');
    expect(routeStatusColor('delayed')).toBe('var(--app-chart-5)');
  });
});
