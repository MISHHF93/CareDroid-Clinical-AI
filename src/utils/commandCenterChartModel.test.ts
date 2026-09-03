import { describe, expect, it } from 'vitest';
import {
  buildComplianceChart,
  buildHourlyArrivalsChart,
  buildMetricSignalChart,
} from './commandCenterChartModel';

describe('commandCenterChartModel', () => {
  it('maps hourly arrivals into chart rows', () => {
    const chart = buildHourlyArrivalsChart([
      { hour: '08:00', count: 4 },
      { hour: '09:00', count: 7 },
    ]);

    expect(chart).toEqual([
      { name: '08:00', value: 4 },
      { name: '09:00', value: 7 },
    ]);
  });

  it('parses metric values for signal bars', () => {
    const chart = buildMetricSignalChart([
      {
        id: 'waiting-count',
        label: 'Waiting patients',
        value: '12',
        detail: 'detail',
        tone: 'warning',
      },
    ] as any);

    expect(chart[0]?.value).toBe(12);
  });

  it('builds compliance donut slices', () => {
    const chart = buildComplianceChart({ breaches: 2, activeTraces: 10 });
    expect(chart.find((row) => row.name === 'Breaches')?.value).toBe(2);
    expect(chart.find((row) => row.name === 'Compliant')?.value).toBe(8);
  });
});
