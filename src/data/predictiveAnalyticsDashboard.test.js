import { describe, expect, it } from 'vitest';
import {
  buildPredictiveAnalyticsAiPrompt,
  buildPredictiveAnalyticsSummary,
  DEMO_PREDICTIVE_ANALYTICS_MODELS,
  PREDICTIVE_ANALYTICS_MODEL_TYPES,
  resolvePredictiveRiskBand,
  searchPredictiveModels,
} from './predictiveAnalyticsDashboard';

describe('predictiveAnalyticsDashboard', () => {
  it('covers all requested predictive model types', () => {
    expect(PREDICTIVE_ANALYTICS_MODEL_TYPES).toEqual([
      'deterioration-risk',
      'readmission-risk',
      'sepsis-risk',
      'icu-transfer-risk',
      'device-failure-risk',
      'fleet-maintenance-risk',
    ]);
    expect(DEMO_PREDICTIVE_ANALYTICS_MODELS.map((model) => model.id)).toEqual(
      expect.arrayContaining(PREDICTIVE_ANALYTICS_MODEL_TYPES)
    );
  });

  it('builds demo summary and risk bands', () => {
    const summary = buildPredictiveAnalyticsSummary();

    expect(summary.sourceStatus).toBe('demo-models');
    expect(summary.predictionLabel).toMatch(/Demo predictions/i);
    expect(summary.highestRisk.id).toBe('sepsis-risk');
    expect(resolvePredictiveRiskBand(76)).toBe('critical');
    expect(resolvePredictiveRiskBand(61)).toBe('moderate');
  });

  it('searches models and creates assistant prompts with prediction labels', () => {
    const deviceResults = searchPredictiveModels('battery');
    const prompt = buildPredictiveAnalyticsAiPrompt(
      DEMO_PREDICTIVE_ANALYTICS_MODELS.find((model) => model.id === 'device-failure-risk')
    );

    expect(deviceResults.map((model) => model.id)).toContain('device-failure-risk');
    expect(prompt).toMatch(/device failure risk/i);
    expect(prompt).toMatch(/demo predictions/i);
    expect(prompt).toMatch(/decision support only/i);
  });
});
