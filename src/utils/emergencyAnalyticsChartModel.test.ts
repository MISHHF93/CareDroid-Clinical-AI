import { describe, expect, it } from 'vitest';
import {
  buildComplaintsChart,
  buildDailyVolumeChart,
  buildHourlyArrivalsChart,
  buildWaitTrendChart,
} from './emergencyAnalyticsChartModel';

describe('emergencyAnalyticsChartModel', () => {
  it('builds daily volume chart rows', () => {
    expect(buildDailyVolumeChart([{ date: 'Mon', count: 12 }])).toEqual([
      { name: 'Mon', value: 12 },
    ]);
  });

  it('builds hourly arrivals chart rows', () => {
    expect(buildHourlyArrivalsChart([{ hour: '08:00', count: 4 }])).toEqual([
      { name: '08:00', value: 4 },
    ]);
  });

  it('builds wait trend chart rows', () => {
    expect(buildWaitTrendChart([{ date: 'Tue', avgWaitMinutes: 42 }])).toEqual([
      { name: 'Tue', value: 42 },
    ]);
  });

  it('builds complaints chart rows', () => {
    expect(buildComplaintsChart([{ name: 'Chest pain', count: 7 }])).toEqual([
      { name: 'Chest pain', value: 7 },
    ]);
  });
});
