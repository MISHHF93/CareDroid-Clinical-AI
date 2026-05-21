import toolRegistry from '../data/toolRegistry';
import advancedRecommendationService from '../services/advancedRecommendationService';

/**
 * UPGRADED: Now uses NLU-based intent classification for smarter recommendations
 * Falls back to keyword-based matching if NLU service is unavailable
 */

// Fallback keyword rules (used when NLU service is offline)
const FALLBACK_RULES = [
  {
    toolId: 'drug-check',
    keywords: ['drug', 'medication', 'interaction', 'contraindication', 'dose', 'dosing', 'warfarin', 'antibiotic']
  },
  {
    toolId: 'lab-interp',
    keywords: ['lab', 'labs', 'cbc', 'bmp', 'cmp', 'creatinine', 'troponin', 'lactate', 'abnormal', 'reference range']
  },
  {
    toolId: 'sofa-score',
    keywords: ['sofa', 'qsofa', 'organ failure', 'sequential organ', 'sepsis score icu']
  },
  {
    toolId: 'calc-gfr',
    keywords: ['gfr', 'egfr', 'ckd-epi', 'glomerular', 'creatinine clearance', 'kidney function']
  },
  {
    toolId: 'calc-bmi',
    keywords: ['bmi', 'body mass index', 'obesity class', 'underweight', 'overweight']
  },
  {
    toolId: 'calc-chads2vasc',
    keywords: ['chads', 'cha2ds2', 'stroke risk afib', 'anticoagulation score', 'atrial fibrillation stroke']
  },
  {
    toolId: 'calculators',
    keywords: ['calculator', 'risk score', 'heart score', 'wells', 'curb']
  },
  {
    toolId: 'protocols',
    keywords: ['protocol', 'guideline', 'pathway', 'acls', 'atls', 'sepsis bundle', 'stroke']
  },
  {
    toolId: 'diagnosis',
    keywords: ['differential', 'diagnosis', 'etiology', 'workup', 'ddx', 'rule out']
  },
  {
    toolId: 'procedures',
    keywords: ['procedure', 'intubation', 'central line', 'thoracentesis', 'steps', 'consent']
  }
];

/**
 * Get tool recommendations using advanced NLU (async)
 * @param {string} text - User message
 * @param {Object} context - Additional context (user preferences, recent tools)
 * @param {number} limit - Maximum recommendations to return
 * @returns {Promise<Array>} Array of tool objects with confidence
 */
export const getToolRecommendationsNLU = async (text = '', context = {}, limit = 3) => {
  if (!text || !text.trim()) return [];

  try {
    // Use advanced NLU service
    const recommendations = await advancedRecommendationService.getRecommendations(text, context);
    
    // Convert to tool objects
    const tools = recommendations
      .slice(0, limit)
      .map(rec => {
        const tool = toolRegistry.find(t => t.id === rec.toolId);
        if (!tool) return null;
        
        return {
          ...tool,
          confidence: rec.confidence,
          recommendationReason: rec.reason,
          urgent: rec.urgent || false
        };
      })
      .filter(Boolean);

    return tools;
  } catch (error) {
    console.error('NLU recommendations failed, using fallback:', error);
    return getToolRecommendations(text, limit);
  }
};

/**
 * Get tool recommendations (synchronous, keyword-based fallback)
 * This is the legacy function, kept for backwards compatibility
 * @param {string} text - User message
 * @param {number} limit - Maximum recommendations to return
 * @returns {Array} Array of tool objects
 */
export const getToolRecommendations = (text = '', limit = 3) => {
  const normalized = text.toLowerCase();
  if (!normalized.trim()) return [];

  const matches = FALLBACK_RULES.map((rule) => {
    const hits = rule.keywords.filter((keyword) => normalized.includes(keyword)).length;
    return { 
      toolId: rule.toolId, 
      score: hits,
      confidence: Math.min(hits * 0.2, 0.9) // Convert score to confidence
    };
  })
    .filter((match) => match.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, limit)
    .map((match) => {
      const tool = toolRegistry.find((t) => t.id === match.toolId);
      if (!tool) return null;
      return {
        ...tool,
        confidence: match.confidence,
        recommendationReason: 'Keyword match'
      };
    })
    .filter(Boolean);

  return matches;
};

/**
 * Record user feedback on recommendation accuracy
 * @param {string} toolId - Tool that was recommended
 * @param {boolean} accepted - Whether user clicked/used the tool
 */
export const recordRecommendationFeedback = (toolId, accepted) => {
  try {
    advancedRecommendationService.recordFeedback(toolId, accepted);
  } catch (error) {
    console.error('Failed to record feedback:', error);
  }
};

/**
 * Clear recommendation cache (useful after user preference changes)
 */
export const clearRecommendationCache = () => {
  try {
    advancedRecommendationService.clearCache();
  } catch (error) {
    console.error('Failed to clear cache:', error);
  }
};

// Export async version as default (preferred)
export default getToolRecommendationsNLU;
