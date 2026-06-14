import { describe, expect, it } from 'vitest';
import {
  selectEmergencyOperationalSummary,
  useEmergencyStore,
} from './emergencyStore';

describe('Emergency operational summary selector', () => {
  it('projects the normalized global command metrics from store state', () => {
    const summary = selectEmergencyOperationalSummary(useEmergencyStore.getState());

    expect(summary.metrics.map((metric) => metric.label)).toEqual([
      'Patients Today',
      'Waiting',
      'Longest Wait',
      'Average Wait',
      'EMS Inbound',
      'Reassessments Due',
      'Capacity Score',
      'Boarders',
      'Referrals Pending',
    ]);
    expect(summary.metrics.every((metric) => metric.source.length > 0)).toBe(true);
  });
});
