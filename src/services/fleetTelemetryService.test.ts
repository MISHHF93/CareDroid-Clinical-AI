import { describe, it, expect } from 'vitest';
import { fetchFleetCommandSnapshot } from './fleetTelemetryService';

describe('fleetTelemetryService', () => {
  it('returns summary metrics and vehicles from mock snapshot', async () => {
    const data = await fetchFleetCommandSnapshot({ delayMs: 0 });
    expect(data.vehicles.length).toBeGreaterThan(0);
    expect(data.summary.totalVehicles).toBe(data.vehicles.length);
    expect(data.summary.averageUtilizationPercent).toBeGreaterThanOrEqual(0);
    expect(data.summary.source).toBe('mock-telemetry');
  });

  it('returns empty fleet when emptyFleet option is set', async () => {
    const data = await fetchFleetCommandSnapshot({ delayMs: 0, emptyFleet: true });
    expect(data.vehicles).toHaveLength(0);
    expect(data.summary.totalVehicles).toBe(0);
  });
});
