import { describe, expect, it } from 'vitest';
import {
  buildCompetencyCoverageChart,
  buildCompetencyStatusChart,
  buildOutcomesTrendChart,
  buildScenarioCategoryChart,
  buildScenarioDifficultyChart,
  buildSafetyTrendChart,
} from './simulationChartModel';

describe('simulationChartModel', () => {
  it('builds scenario distribution charts', () => {
    expect(buildScenarioCategoryChart().length).toBeGreaterThan(0);
    expect(buildScenarioDifficultyChart()).toEqual(
      expect.arrayContaining([
        { name: 'Beginner', value: expect.any(Number) },
        { name: 'Intermediate', value: expect.any(Number) },
        { name: 'Advanced', value: expect.any(Number) },
      ]),
    );
  });

  it('builds outcomes trend charts', () => {
    expect(buildOutcomesTrendChart()).toHaveLength(4);
    expect(buildSafetyTrendChart()[3]).toEqual({ name: 'Week 4', value: 88 });
  });

  it('builds competency coverage and status charts', () => {
    expect(buildCompetencyCoverageChart()).toHaveLength(5);
    expect(buildCompetencyStatusChart().some((row) => row.name === 'completed')).toBe(true);
  });
});