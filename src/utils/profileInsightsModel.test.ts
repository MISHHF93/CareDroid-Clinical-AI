import { describe, expect, it } from 'vitest';
import {
  buildActivityMixChart,
  buildActivityTypeChart,
  buildCompetencyBreakdownChart,
  buildToolUsageChart,
} from './profileInsightsModel';

describe('profileInsightsModel', () => {
  it('groups audit logs into readable chart buckets', () => {
    const mix = buildActivityMixChart([
      { action: 'LOGIN' },
      { action: 'PHI_ACCESS', phiAccessed: true },
      { action: 'AI_QUERY' },
    ]);

    expect(mix.find((item) => item.name === 'PHI access')?.value).toBe(1);
    expect(mix.find((item) => item.name === 'AI usage')?.value).toBe(1);
  });

  it('builds activity type bars with friendly labels', () => {
    const chart = buildActivityTypeChart([
      { action: 'AI_QUERY' },
      { action: 'AI_QUERY' },
      { action: 'LOGIN' },
    ]);

    expect(chart[0]?.name).toBe('AI query');
    expect(chart[0]?.value).toBe(2);
  });

  it('maps competency summary into chart rows', () => {
    const chart = buildCompetencyBreakdownChart({
      simulationCompletion: 80,
      skillCompletion: 70,
      overallReadiness: 75,
      activeCredentials: 2,
    });

    expect(chart).toHaveLength(4);
    expect(chart.find((row) => row.name === 'Readiness')?.value).toBe(75);
  });

  it('weights recent tools for engagement chart', () => {
    const chart = buildToolUsageChart([
      { id: 'a', label: 'Sepsis Calculator' },
      { id: 'b', label: 'Triage Assist' },
    ]);

    expect(chart[0]?.name).toBe('Sepsis Calculator');
    expect(chart[0]?.value).toBeGreaterThan(chart[1]?.value || 0);
  });
});