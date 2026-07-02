import { describe, expect, it } from 'vitest';
import {
  buildCostRouteChart,
  buildEvaluationQualityChart,
  buildKnowledgeGraphTypeChart,
  buildResearchSectionChart,
  riskLevelTone,
} from './clinicalInsightsChartModel';

describe('clinicalInsightsChartModel', () => {
  it('builds research and knowledge graph charts', () => {
    expect(buildResearchSectionChart().length).toBe(5);
    expect(buildKnowledgeGraphTypeChart({ calculator: 3, protocol: 2 })).toEqual([
      { name: 'calculator', value: 3 },
      { name: 'protocol', value: 2 },
    ]);
  });

  it('builds cost and evaluation charts', () => {
    expect(buildCostRouteChart().length).toBeGreaterThan(0);
    expect(buildEvaluationQualityChart()[0].value).toBeGreaterThan(0);
  });

  it('maps risk levels to tones', () => {
    expect(riskLevelTone('critical')).toBe('critical');
    expect(riskLevelTone('low')).toBe('good');
  });
});