import { describe, expect, it } from 'vitest';
import { getUserFacingToolInventory } from '../data/toolInventory';
import {
  buildCalculatorRecommendationChatMessage,
  getCalculatorRecommendationRules,
  recommendCalculators,
} from './calculatorRecommendationService';

describe('calculatorRecommendationService', () => {
  it('recommends chest pain tools and resolves every suggestion to a real user-facing tool', () => {
    const result = recommendCalculators({
      chiefComplaint: 'Chest pain',
      symptoms: 'Substernal pressure with diaphoresis and elevated troponin',
      clinicalKeywords: 'ACS NSTEMI cardiac risk',
    });

    expect(result.status).toBe('matched');
    expect(result.recommendations.map((tool) => tool.id)).toEqual([
      'heart-score',
      'timi-ua-nstemi',
      'grace-acs',
      'ascvd-risk',
    ]);

    const realToolIds = new Set(getUserFacingToolInventory().map((record) => record.id));
    for (const recommendation of result.recommendations) {
      expect(realToolIds.has(recommendation.id), recommendation.id).toBe(true);
      expect(recommendation.route || recommendation.navigationPath, recommendation.id).toBeTruthy();
    }
  });

  it('keeps every rule target mapped to a shipped tool', () => {
    const realToolIds = new Set(getUserFacingToolInventory().map((record) => record.id));
    const allRuleToolIds = getCalculatorRecommendationRules().flatMap((rule) => rule.toolIds);

    expect(allRuleToolIds.length).toBeGreaterThan(0);
    for (const toolId of allRuleToolIds) {
      expect(realToolIds.has(toolId), toolId).toBe(true);
    }
  });

  it('builds the chat workflow message from scenario fields', () => {
    const message = buildCalculatorRecommendationChatMessage({
      chiefComplaint: 'Dyspnea',
      symptoms: 'Pleuritic pain and leg swelling',
      clinicalKeywords: 'PE DVT',
    });

    expect(message).toContain('Chief complaint: Dyspnea');
    expect(message).toContain('Symptoms: Pleuritic pain and leg swelling');
    expect(message).toContain('Clinical keywords: PE DVT');
  });
});
