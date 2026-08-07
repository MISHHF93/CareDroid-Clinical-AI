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

describe('calculatorRecommendationService — canonical recognizeComplaint() fallback (2026-08-08)', () => {
  // A 4th, previously-undiscovered independent complaint-keyword registry, found while
  // extending the terminology-recognition round to workflow-launcher surfaces. Its
  // RECOMMENDATION_RULES keyword lists use plain substring matching with no
  // word-boundary or synonym handling. Verified empirically before fixing: neither
  // "sob" nor "pain in chest" matched any rule despite both being recognized
  // elsewhere in the app.

  it('recommends dyspnea/PE tools for "sob" (no direct keyword — the rule list only has "shortness of breath"/"dyspnea")', () => {
    const result = recommendCalculators({ chiefComplaint: 'sob' });
    expect(result.status).toBe('matched');
    expect(result.recommendations.map((tool) => tool.id)).toEqual(
      expect.arrayContaining(['wells-pe', 'perc']),
    );
  });

  it('recommends chest-pain tools for "pain in chest" (reversed word order the rule list never had)', () => {
    const result = recommendCalculators({ chiefComplaint: 'pain in chest' });
    expect(result.status).toBe('matched');
    expect(result.recommendations.map((tool) => tool.id)).toEqual(
      expect.arrayContaining(['heart-score']),
    );
  });

  it('does not duplicate a rule the direct keyword match already found', () => {
    const result = recommendCalculators({ chiefComplaint: 'chest pain' });
    const chestPainMatches = result.matchedContexts.filter((context) => context.id === 'chest-pain');
    expect(chestPainMatches).toHaveLength(1);
  });

  it('still returns needs_more_context for genuinely unrelated text even though the fallback now runs on every input', () => {
    const result = recommendCalculators({ chiefComplaint: 'medication refill request' });
    expect(result.status).toBe('needs_more_context');
  });
});
