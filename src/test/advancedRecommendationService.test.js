import { describe, it, expect, beforeEach, vi } from 'vitest';
import advancedRecommendationService from '../services/advancedRecommendationService';

describe('AdvancedRecommendationService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    advancedRecommendationService.clearCache();
    global.fetch = vi.fn();
  });

  describe('getRecommendations', () => {
    it('should return recommendations from NLU intent classifier', async () => {
      // Mock successful API response
      global.fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          intent: 'drug_interaction',
          confidence: 0.92,
          entities: [],
          emergencyScore: 0
        })
      });

      const recommendations = await advancedRecommendationService.getRecommendations(
        'Check if warfarin interacts with aspirin'
      );

      expect(recommendations).toBeInstanceOf(Array);
      expect(recommendations.length).toBeGreaterThan(0);
      expect(recommendations[0]).toHaveProperty('toolId');
      expect(recommendations[0]).toHaveProperty('confidence');
      expect(recommendations[0]).toHaveProperty('reason');
    });

    it('should return drug-checker for medication queries', async () => {
      global.fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          intent: 'drug_interaction',
          confidence: 0.95,
          entities: [
            { type: 'medication', value: 'warfarin' },
            { type: 'medication', value: 'aspirin' }
          ],
          emergencyScore: 0
        })
      });

      const recommendations = await advancedRecommendationService.getRecommendations(
        'warfarin and aspirin interaction'
      );

      expect(recommendations.length).toBeGreaterThan(0);
      expect(recommendations[0].toolId).toBe('drug-check');
    });

    it('should return lab-interpreter for lab queries', async () => {
      global.fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          intent: 'lab_interpretation',
          confidence: 0.93,
          entities: [{ type: 'lab_test', value: 'troponin' }],
          emergencyScore: 0.3
        })
      });

      const recommendations = await advancedRecommendationService.getRecommendations(
        'interpret elevated troponin levels'
      );

      expect(recommendations[0].toolId).toBe('lab-interp');
    });

    it('should boost emergency tools for high emergency score', async () => {
      const recommendations = await advancedRecommendationService.generateRecommendations(
        {
          primaryIntent: 'emergency_assessment',
          confidence: 0.9,
          entities: [],
          emergencyScore: 0.85,
        },
        'patient unresponsive and not breathing',
        {}
      );

      const emergencyRec = recommendations.find((r) => r.toolId === 'sofa' && r.urgent);
      expect(emergencyRec).toBeDefined();
      expect(emergencyRec.urgent).toBe(true);
      expect(emergencyRec.confidence).toBeGreaterThan(0.9);
    });

    it('should fall back to keyword matching when NLU fails', async () => {
      const recommendations = advancedRecommendationService.fallbackRecommendations(
        'drug interaction check',
      );

      // Should still return recommendations (via fallback)
      expect(recommendations).toBeInstanceOf(Array);
      expect(recommendations.length).toBeGreaterThan(0);
    });

    it('should return empty array for empty input', async () => {
      const recommendations = await advancedRecommendationService.getRecommendations('');
      expect(recommendations).toEqual([]);
    });

    it('should cache results for same query', async () => {
      global.fetch.mockResolvedValue({
        ok: true,
        json: async () => ({
          intent: 'drug_interaction',
          confidence: 0.90,
          entities: [],
          emergencyScore: 0
        })
      });

      const query = 'warfarin interaction';
      
      await advancedRecommendationService.getRecommendations(query);
      await advancedRecommendationService.getRecommendations(query);

      // Should only call API once (second is cached)
      expect(global.fetch).toHaveBeenCalledTimes(1);
    });
  });

  describe('classifyIntent', () => {
    it('should call backend intent classification API', async () => {
      global.fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          intent: 'diagnosis',
          confidence: 0.88,
          entities: [],
          emergencyScore: 0.1
        })
      });

      const result = await advancedRecommendationService.classifyIntent(
        'differential diagnosis for chest pain'
      );

      expect(global.fetch).toHaveBeenCalledWith(
        '/api/chat/intent-classify',
        expect.objectContaining({
          method: 'POST',
          body: JSON.stringify({ message: 'differential diagnosis for chest pain' })
        })
      );

      expect(result.primaryIntent).toBe('diagnosis');
      expect(result.confidence).toBe(0.88);
    });

    it('should handle API errors gracefully', async () => {
      const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      global.fetch.mockRejectedValueOnce(new Error('Network error'));

      const result = await advancedRecommendationService.classifyIntent('test query');

      expect(result.primaryIntent).toBe('unknown');
      expect(result.confidence).toBeLessThan(0.5);
      expect(consoleErrorSpy).toHaveBeenCalledWith(
        'Intent classification error:',
        expect.any(Error)
      );
      consoleErrorSpy.mockRestore();
    });
  });

  describe('entity-based recommendations', () => {
    it('should detect medication entities and recommend drug-checker', async () => {
      global.fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          intent: 'medication_dosing',
          confidence: 0.85,
          entities: [
            { type: 'medication', value: 'metformin' }
          ],
          emergencyScore: 0
        })
      });

      const recommendations = await advancedRecommendationService.getRecommendations(
        'metformin dosing for type 2 diabetes'
      );

      const drugChecker = recommendations.find(r => r.toolId === 'drug-check');
      expect(drugChecker).toBeDefined();
      expect(drugChecker.reason).toContain('medication');
    });

    it('should detect lab test entities and recommend lab-interpreter', async () => {
      global.fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          intent: 'lab_interpretation',
          confidence: 0.90,
          entities: [
            { type: 'lab_test', value: 'creatinine' }
          ],
          emergencyScore: 0
        })
      });

      const recommendations = await advancedRecommendationService.getRecommendations(
        'creatinine 2.5 mg/dL'
      );

      const labInterpreter = recommendations.find(r => r.toolId === 'lab-interp');
      expect(labInterpreter).toBeDefined();
    });
  });

  describe('personalization', () => {
    it('should boost favorited tools in recommendations', async () => {
      global.fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          intent: 'drug_interaction',
          confidence: 0.85,
          entities: [],
          emergencyScore: 0
        })
      });

      const context = {
        userPreferences: {
          favoritedTools: ['drug-check']
        },
        recentTools: []
      };

      const recommendations = await advancedRecommendationService.getRecommendations(
        'check drug interaction',
        context
      );

      const drugChecker = recommendations.find(r => r.toolId === 'drug-check');
      expect(drugChecker).toBeDefined();
      // Confidence should be boosted for favorited tool
      expect(drugChecker.confidence).toBeGreaterThan(0.79);
    });

    it('should slightly boost recently used tools', async () => {
      global.fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          intent: 'lab_interpretation',
          confidence: 0.80,
          entities: [],
          emergencyScore: 0
        })
      });

      const context = {
        userPreferences: {},
        recentTools: ['lab-interp', 'calculators']
      };

      const recommendations = await advancedRecommendationService.getRecommendations(
        'interpret lab results',
        context
      );

      const labInterpreter = recommendations.find(r => r.toolId === 'lab-interp');
      expect(labInterpreter).toBeDefined();
    });
  });

  describe('feedback learning', () => {
    it('should record user feedback on recommendations', () => {
      advancedRecommendationService.recordFeedback('drug-checker', true);
      advancedRecommendationService.recordFeedback('drug-checker', true);
      advancedRecommendationService.recordFeedback('drug-checker', false);

      const feedback = advancedRecommendationService.getUserFeedback('drug-checker');

      expect(feedback.totalFeedback).toBe(3);
      expect(feedback.accepted).toBe(2);
      expect(feedback.rejected).toBe(1);
      expect(feedback.successRate).toBeCloseTo(0.67, 1);
    });

    it('should return null for tools without feedback', () => {
      const feedback = advancedRecommendationService.getUserFeedback('unknown-tool');
      expect(feedback).toBeNull();
    });

    it('should limit feedback history to 100 items', () => {
      // Record 150 feedback items
      for (let i = 0; i < 150; i++) {
        advancedRecommendationService.recordFeedback('tool-' + i, true);
      }

      // Should only keep last 100
      expect(advancedRecommendationService.userFeedback.length).toBe(100);
    });
  });

  describe('cache management', () => {
    it('should cache recommendation results', async () => {
      global.fetch.mockResolvedValue({
        ok: true,
        json: async () => ({
          intent: 'drug_interaction',
          confidence: 0.90,
          entities: [],
          emergencyScore: 0
        })
      });

      const query = 'test query';
      
      await advancedRecommendationService.getRecommendations(query);
      const cachedResult = advancedRecommendationService.getFromCache(
        advancedRecommendationService.getCacheKey(query, {})
      );

      expect(cachedResult).toBeTruthy();
    });

    it('should clear cache on demand', async () => {
      global.fetch.mockResolvedValue({
        ok: true,
        json: async () => ({
          intent: 'drug_interaction',
          confidence: 0.90,
          entities: [],
          emergencyScore: 0
        })
      });

      await advancedRecommendationService.getRecommendations('test');
      
      advancedRecommendationService.clearCache();
      
      const cachedResult = advancedRecommendationService.getFromCache('test_anon');
      expect(cachedResult).toBeNull();
    });

    it('should expire cache after 5 minutes', () => {
      const key = 'test_key';
      const data = [{ toolId: 'test', confidence: 0.9 }];
      
      advancedRecommendationService.setCache(key, data);
      
      // Artificially age the cache entry
      const cacheEntry = advancedRecommendationService.cache.get(key);
      cacheEntry.timestamp = Date.now() - (6 * 60 * 1000); // 6 minutes ago
      
      const result = advancedRecommendationService.getFromCache(key);
      expect(result).toBeNull(); // Should have expired
    });
  });

  describe('fallback recommendations', () => {
    it('should provide keyword-based fallback', () => {
      const recommendations = advancedRecommendationService.fallbackRecommendations(
        'drug interaction warfarin aspirin',
      );

      expect(recommendations).toBeInstanceOf(Array);
      expect(recommendations.length).toBeGreaterThan(0);
      expect(recommendations[0].source).toBe('fallback');
    });

    it('should match keywords for common medical queries', () => {
      const drugQuery = advancedRecommendationService.fallbackRecommendations('drug interaction');
      expect(drugQuery[0].toolId).toBe('drug-check');

      const labQuery = advancedRecommendationService.fallbackRecommendations('lab results abnormal');
      expect(labQuery[0].toolId).toBe('lab-interp');

      const calcQuery = advancedRecommendationService.fallbackRecommendations('calculate GFR');
      expect(calcQuery[0].toolId).toBe('calculators');
    });
  });
});
