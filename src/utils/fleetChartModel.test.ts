import { describe, expect, it } from 'vitest';
import {
  buildFleetEtaChart,
  buildFleetMaintenanceChart,
  buildFleetStatusChart,
  buildFleetUtilizationChart,
} from './fleetChartModel';

describe('fleetChartModel', () => {
  it('filters zero-value fleet status rows', () => {
    expect(
      buildFleetStatusChart([
        { name: 'active', value: 2 },
        { name: 'maintenance', value: 0 },
      ]),
    ).toEqual([{ name: 'active', value: 2 }]);
  });

  it('limits utilization chart rows', () => {
    const rows = Array.from({ length: 10 }, (_, index) => ({
      label: `VH-${index}`,
      value: index + 1,
    }));
    expect(buildFleetUtilizationChart(rows)).toHaveLength(8);
  });

  it('builds maintenance and eta charts', () => {
    expect(buildFleetMaintenanceChart([{ name: 'VH-1', value: 72 }])).toEqual([
      { name: 'VH-1', value: 72 },
    ]);
    expect(buildFleetEtaChart([{ label: 'VH-2', value: 18 }])).toEqual([
      { name: 'VH-2', value: 18 },
    ]);
  });
});
