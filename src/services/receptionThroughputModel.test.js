import { describe, expect, it } from 'vitest';
import {
  RECEPTION_DAILY_MIX,
  buildReceptionDayCohort,
  compareReceptionProfiles,
  simulateReceptionDay,
} from './receptionThroughputModel';

describe('receptionThroughputModel', () => {
  it('builds a 100-patient cohort from the daily mix', () => {
    const cohort = buildReceptionDayCohort(100);
    expect(cohort).toHaveLength(100);
    const expressCount = cohort.filter((key) => key === 'expressRegister').length;
    expect(expressCount).toBeGreaterThanOrEqual(60);
    expect(expressCount).toBeLessThanOrEqual(64);
  });

  it('daily mix ratios sum to 1', () => {
    const total = Object.values(RECEPTION_DAILY_MIX).reduce((sum, ratio) => sum + ratio, 0);
    expect(total).toBeCloseTo(1, 5);
  });

  it('measures clicks, screens, and timing for harmonized express path', () => {
    const day = simulateReceptionDay({ profile: 'harmonized', patientCount: 1, mix: { expressRegister: 1 } });
    expect(day.averages.clicksPerRegistration).toBe(3);
    expect(day.averages.screensVisited).toBe(2);
    expect(day.averages.timeToCreateEncounterMs).toBeGreaterThan(0);
    expect(day.averages.timeToAssignQueueMs).toBeGreaterThan(0);
  });

  it('harmonized profile reduces clicks and time versus baseline at 100 patients/day', () => {
    const comparison = compareReceptionProfiles(100);
    expect(comparison.delta.clicksPerRegistration).toBeGreaterThan(0);
    expect(comparison.delta.screensVisited).toBeGreaterThan(0);
    expect(comparison.delta.dayClicksSaved).toBeGreaterThan(50);
    expect(comparison.delta.dayMinutesSaved).toBeGreaterThan(5);
    expect(comparison.harmonized.clicksPerRegistration).toBeLessThan(
      comparison.baseline.clicksPerRegistration,
    );
  });

  it('reports per-workflow breakdown for a full day', () => {
    const day = simulateReceptionDay({ profile: 'harmonized', patientCount: 100 });
    expect(day.byWorkflow.expressRegister.count).toBeGreaterThan(0);
    expect(day.dayTotals.clicks).toBeGreaterThan(200);
    const comparison = compareReceptionProfiles(100);
    expect(comparison.optimizations.length).toBeGreaterThan(0);
  });
});
