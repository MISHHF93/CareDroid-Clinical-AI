import { apiFetch } from './apiClient';
import { recordAutomationFailure } from './automationAuditLogger';
import toolRegistry from '../data/toolRegistry';
import { NLU_TO_REGISTRY_ID } from '../data/clinicalCatalogWiring';

/**
 * Advanced Tool Recommendation Service using NLU (Natural Language Understanding)
 * This is an upgrade from the keyword-based recommendation system
 */

class AdvancedRecommendationService {
  cache: Map<any, any> = new Map();
  cacheExpiry: number = 0;
  userFeedback: any[] = [];
  recommendationHistory: any[] = [];

  constructor() {
    this.cache = new Map();
    this.cacheExpiry = 5 * 60 * 1000; // 5 minutes
    this.userFeedback = [] as any[];
    this.recommendationHistory = [] as any[];
  }

  /**
   * Map legacy / NLU tool ids to sidebar toolRegistry ids.
   */
  normalizeRecommendationToolIds(recommendations) {
    return recommendations
      .map((rec) => ({
        ...rec,
        toolId: NLU_TO_REGISTRY_ID[rec.toolId] || rec.toolId,
      }))
      .filter((rec) => toolRegistry.some((t) => t.id === rec.toolId));
  }

  /**
   * Get tool recommendations using backend NLU intent classifier
   * @param {string} userMessage - User's input message
   * @param {Object} context - Additional context (conversation history, user preferences)
   * @returns {Promise<Array>} Array of recommended tools with confidence scores
   */
  async getRecommendations(userMessage, context: any = {}) {
    if (!userMessage || userMessage.trim().length === 0) {
      return [];
    }

    // Check cache first
    const cacheKey = this.getCacheKey(userMessage, context);
    const cached = this.getFromCache(cacheKey);
   if (cached) {
      return cached;
    }

    try {
      // Call backend intent classifier
      const intentData = await this.classifyIntent(userMessage);
      
      // Generate recommendations based on intent
      const recommendations = await this.generateRecommendations(
        intentData,
        userMessage,
        context
      );

      const personalizedRecs = this.normalizeRecommendationToolIds(
        this.applyPersonalization(recommendations, context),
      );

      // Cache results
      this.setCache(cacheKey, personalizedRecs);

      // Track recommendation
      this.trackRecommendation(userMessage, personalizedRecs);

      return personalizedRecs;
    } catch (error: any) {
      console.error('Advanced recommendation failed, falling back to keyword-based:', error);
      // Fallback to keyword-based recommendations
      return this.fallbackRecommendations(userMessage);
    }
  }

  /**
   * Classify user intent using backend NLU service
   * @param {string} message - User message
   * @returns {Promise<Object>} Intent classification result
   */
  async classifyIntent(message) {
    try {
      const response = await apiFetch('/api/chat/intent-classify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message })
      });

      if (!response.ok) {
        throw new Error('Intent classification failed');
      }

      const data = await response.json();
      return {
        primaryIntent: data.intent || 'unknown',
        confidence: data.confidence || 0.5,
        entities: data.entities || [],
        emergencyScore: data.emergencyScore || 0,
        context: data.context || {}
      };
    } catch (error: any) {
      console.error('Intent classification error:', error);
      await recordAutomationFailure({
        triggerFired: 'Advanced tool recommendation intent classification failed',
        actionSelected: 'Generate AI-assisted tool recommendations',
        toolCalled: 'advanced-recommendation-service',
        backendEndpoint: '/api/chat/intent-classify',
        error,
        aiInvolvement: {
          involved: true,
          summary: 'AI/NLU recommendation path fell back to keyword recommendations.',
        },
      });
      return {
        primaryIntent: 'unknown',
        confidence: 0.3,
        entities: [],
        emergencyScore: 0,
        context: {}
      };
    }
  }

  /**
   * Generate tool recommendations based on classified intent
   * @param {Object} intentData - Intent classification result
   * @param {string} originalMessage - Original user message
   * @param {Object} context - Additional context
   * @returns {Array} Tool recommendations
   */
  async generateRecommendations(intentData, _originalMessage, _context) {
    const { primaryIntent, confidence, entities, emergencyScore } = intentData;

    // Intent to tool mapping (more sophisticated than keyword matching)
    const intentToolMap = {
      'drug_interaction': [
        { toolId: 'drug-checker', confidence: 0.95, reason: 'Detected drug interaction query' },
        { toolId: 'antibiotic-scripts', confidence: 0.70, reason: 'May need antibiotic guidance' }
      ],
      'medication_dosing': [
        { toolId: 'drug-checker', confidence: 0.90, reason: 'Medication dosing question' },
        { toolId: 'calculator', confidence: 0.75, reason: 'May need dose calculation' }
      ],
      'lab_interpretation': [
        { toolId: 'lab-interpreter', confidence: 0.95, reason: 'Lab result interpretation needed' },
        { toolId: 'diagnosis-assistant', confidence: 0.70, reason: 'May help with differential diagnosis' }
      ],
      'risk_assessment': [
        { toolId: 'calculator', confidence: 0.90, reason: 'Risk score calculation' },
        { toolId: 'trauma-score', confidence: 0.80, reason: 'Trauma risk assessment' },
        { toolId: 'bleeding-risk', confidence: 0.75, reason: 'Bleeding risk evaluation' }
      ],
      'diagnosis': [
        { toolId: 'diagnosis-assistant', confidence: 0.95, reason: 'Diagnostic assistance' },
        { toolId: 'lab-interpreter', confidence: 0.70, reason: 'Lab data may support diagnosis' },
        { toolId: 'protocol-lookup', confidence: 0.65, reason: 'Clinical protocol guidance' }
      ],
      'protocol_lookup': [
        { toolId: 'protocol-lookup', confidence: 0.95, reason: 'Clinical protocol guidance' },
        { toolId: 'procedure-guide', confidence: 0.75, reason: 'Procedure instructions' }
      ],
      'emergency_assessment': [
        { toolId: 'abc-assessment', confidence: 0.95, reason: 'Emergency ABC assessment' },
        { toolId: 'trauma-score', confidence: 0.90, reason: 'Trauma severity scoring' },
        { toolId: 'sofa', confidence: 0.85, reason: 'Organ failure assessment' }
      ],
      'vitals_monitoring': [
        { toolId: 'vitals-monitor', confidence: 0.95, reason: 'Vital signs monitoring' },
        { toolId: 'sofa', confidence: 0.70, reason: 'Organ function assessment' }
      ],
      'oncology': [
        { toolId: 'cancer-calculator', confidence: 0.90, reason: 'Cancer risk/staging calculation' },
        { toolId: 'tumor-staging', confidence: 0.85, reason: 'Tumor staging guidance' },
        { toolId: 'chemo-calculator', confidence: 0.80, reason: 'Chemotherapy dosing' }
      ]
    };

    // Get base recommendations from intent
    let recommendations = intentToolMap[primaryIntent] || [];

    // Adjust confidence based on NLU confidence
    recommendations = recommendations.map(rec => ({
      ...rec,
      confidence: rec.confidence * confidence,
      source: 'nlu'
    }));

    // Add entity-based recommendations
    const entityRecs = this.getEntityBasedRecommendations(entities);
    recommendations = [...recommendations, ...entityRecs];

    // Boost emergency tools if high emergency score
    if (emergencyScore > 0.7) {
      recommendations = this.boostEmergencyTools(recommendations, emergencyScore);
    }

    // Remove duplicates and sort by confidence
    const unique = this.deduplicateRecommendations(recommendations);
    return unique.sort((a, b) => b.confidence - a.confidence).slice(0, 3);
  }

  /**
   * Get recommendations based on detected entities (drugs, procedures, etc.)
   * @param {Array} entities - Detected entities from NLU
   * @returns {Array} Entity-based recommendations
   */
  getEntityBasedRecommendations(entities) {
    const recommendations = [] as any[];

    entities.forEach(entity => {
      switch (entity.type) {
        case 'medication':
        case 'drug':
          recommendations.push({
            toolId: 'drug-checker',
            confidence: 0.85,
            reason: `Detected medication: ${entity.value}`,
            source: 'entity'
          });
          break;
        case 'lab_test':
        case 'lab_value':
          recommendations.push({
            toolId: 'lab-interpreter',
            confidence: 0.85,
            reason: `Detected lab test: ${entity.value}`,
            source: 'entity'
          });
          break;
        case 'vital_sign':
          recommendations.push({
            toolId: 'vitals-monitor',
            confidence: 0.85,
            reason: `Detected vital sign: ${entity.value}`,
            source: 'entity'
          });
          break;
        case 'procedure':
          recommendations.push({
            toolId: 'procedure-guide',
            confidence: 0.85,
            reason: `Detected procedure: ${entity.value}`,
            source: 'entity'
          });
          break;
      }
    });

    return recommendations;
  }

  /**
   * Boost confidence for emergency tools based on emergency score
   * @param {Array} recommendations - Current recommendations
   * @param {number} emergencyScore - Emergency score from NLU
   * @returns {Array} Updated recommendations
   */
  boostEmergencyTools(recommendations, emergencyScore) {
    const emergencyTools = ['abc-assessment', 'trauma-score', 'sofa', 'vitals-monitor'];
    
    return recommendations.map(rec => {
      if (emergencyTools.includes(rec.toolId)) {
        return {
          ...rec,
          confidence: Math.min(rec.confidence * (1 + emergencyScore * 0.3), 0.99),
          reason: `${rec.reason} (URGENT)`,
          urgent: true
        };
      }
      return rec;
    });
  }

  /**
   * Apply user feedback and personalization to recommendations
   * @param {Array} recommendations - Base recommendations
   * @param {Object} context - User context
   * @returns {Array} Personalized recommendations
   */
  applyPersonalization(recommendations, context) {
    const { userPreferences, recentTools } = context;

    return recommendations.map(rec => {
      let adjustedConfidence = rec.confidence;

      // Boost tools user frequently uses
      if (userPreferences?.favoritedTools?.includes(rec.toolId)) {
        adjustedConfidence *= 1.1;
      }

      // Slightly boost recently used tools (workflow continuation)
      if (recentTools?.slice(0, 3).includes(rec.toolId)) {
        adjustedConfidence *= 1.05;
      }

      // Apply user feedback learning
      const feedback = this.getUserFeedback(rec.toolId);
      if (feedback) {
        adjustedConfidence *= (1 + feedback.successRate * 0.2);
      }

      return {
        ...rec,
        confidence: Math.min(adjustedConfidence, 0.99)
      };
    });
  }

  /**
   * Fallback to keyword-based recommendations if NLU fails
   * @param {string} message - User message
   * @returns {Array} Keyword-based recommendations
   */
  fallbackRecommendations(message) {
    const lowerMessage = message.toLowerCase();
    const fallbackRules = [
      {
        keywords: ['drug', 'medication', 'interaction', 'contraindication'],
        tool: 'drug-checker',
        confidence: 0.85
      },
      {
        keywords: ['lab', 'test', 'result', 'value', 'abnormal'],
        tool: 'lab-interpreter',
        confidence: 0.85
      },
      {
        keywords: ['calculate', 'risk score', 'heart score', 'wells score', 'curb-65'],
        tool: 'calculator',
        confidence: 0.80
      },
      {
        keywords: ['protocol', 'guideline', 'algorithm'],
        tool: 'protocol-lookup',
        confidence: 0.80
      },
      {
        keywords: ['diagnosis', 'symptom', 'differential'],
        tool: 'diagnosis-assistant',
        confidence: 0.75
      },
      {
        keywords: ['procedure', 'step', 'instruction', 'how to'],
        tool: 'procedure-guide',
        confidence: 0.75
      }
    ];

    const matches = fallbackRules
      .filter(rule => rule.keywords.some(kw => lowerMessage.includes(kw)))
      .map(rule => ({
        toolId: rule.tool,
        confidence: rule.confidence,
        reason: 'Keyword match (fallback)',
        source: 'fallback'
      }));

    return this.normalizeRecommendationToolIds(matches.slice(0, 3));
  }

  /**
   * Record user feedback on recommendation
   * @param {string} toolId - Tool that was recommended
   * @param {boolean} accepted - Whether user accepted the recommendation
   */
  recordFeedback(toolId, accepted) {
    this.userFeedback.push({
      toolId,
      accepted,
      timestamp: new Date().toISOString()
    });

    // Keep only last 100 feedback items
    if (this.userFeedback.length > 100) {
      this.userFeedback = this.userFeedback.slice(-100);
    }

    // Save to localStorage
    try {
      localStorage.setItem('careDroid.recommendationFeedback', JSON.stringify(this.userFeedback));
    } catch (error: any) {
      console.error('Failed to save feedback:', error);
    }
  }

  /**
   * Get user feedback stats for a tool
   * @param {string} toolId - Tool ID
   * @returns {Object} Feedback stats
   */
  getUserFeedback(toolId) {
    const toolFeedback = this.userFeedback.filter(f => f.toolId === toolId);
    if (toolFeedback.length === 0) return null;

    const accepted = toolFeedback.filter(f => f.accepted).length;
    return {
      totalFeedback: toolFeedback.length,
      accepted,
      rejected: toolFeedback.length - accepted,
      successRate: accepted / toolFeedback.length
    };
  }

  /**
   * Track recommendation for analytics
   * @param {string} message - Original message
   * @param {Array} recommendations - Recommendations made
   */
  trackRecommendation(message, recommendations) {
    this.recommendationHistory.push({
      message: message.substring(0, 100), // Store first 100 chars only
      recommendations: recommendations.map(r => ({ toolId: r.toolId, confidence: r.confidence })),
      timestamp: new Date().toISOString()
    });

    // Keep only last 50 recommendations
    if (this.recommendationHistory.length > 50) {
      this.recommendationHistory = this.recommendationHistory.slice(-50);
    }
  }

  /**
   * Remove duplicate recommendations
   * @param {Array} recommendations - Recommendations array
   * @returns {Array} Deduplicated array
   */
  deduplicateRecommendations(recommendations) {
    const seen = new Map();
    
    recommendations.forEach(rec => {
      const existing = seen.get(rec.toolId);
      if (!existing || rec.confidence > existing.confidence) {
        seen.set(rec.toolId, rec);
      }
    });

    return Array.from(seen.values());
  }

  /**
   * Cache management
   */
  getCacheKey(message, context) {
    return `${message.toLowerCase()}_${context.userId || 'anon'}`;
  }

  getFromCache(key) {
    const cached = this.cache.get(key);
    if (!cached) return null;

    if (Date.now() - cached.timestamp > this.cacheExpiry) {
      this.cache.delete(key);
      return null;
    }

    return cached.data;
  }

  setCache(key, data) {
    this.cache.set(key, {
      data,
      timestamp: Date.now()
    });

    // Limit cache size
    if (this.cache.size > 100) {
      const firstKey = this.cache.keys().next().value;
      this.cache.delete(firstKey);
    }
  }

  /**
   * Clear cache
   */
  clearCache() {
    this.cache.clear();
  }
}

// Export singleton instance
const advancedRecommendationService = new AdvancedRecommendationService();
export default advancedRecommendationService;
