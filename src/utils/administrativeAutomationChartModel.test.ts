import { describe, expect, it } from 'vitest';
import {
  buildAutomationCategoryChart,
  buildAutomationStatusChart,
} from './administrativeAutomationChartModel';

describe('administrativeAutomationChartModel', () => {
  it('charts queue status slices', () => {
    const chart = buildAutomationStatusChart({
      pendingReview: 3,
      executedToday: 5,
      overridden: 1,
    });

    expect(chart).toHaveLength(3);
    expect(chart.find((row) => row.name === 'Pending review')?.value).toBe(3);
  });

  it('charts non-zero automation categories', () => {
    const chart = buildAutomationCategoryChart({
      patient_routing: 2,
      escalation_workflow: 1,
      documentation_handoff: 0,
    });

    expect(chart).toHaveLength(2);
    expect(chart[0]?.name).toBe('Routing');
  });
});