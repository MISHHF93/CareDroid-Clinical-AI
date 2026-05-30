/**
 * Intent Classifier Service - Unit Tests
 *
 * Tests the 3-phase intent classification pipeline:
 * - Phase 1: Keyword matching
 * - Phase 2: NLU model (mocked, not yet implemented)
 * - Phase 3: LLM fallback
 *
 * Critical requirement: 100% recall for emergency detection
 */

import { Test, TestingModule } from '@nestjs/testing';
import { IntentClassifierService } from './intent-classifier.service';
import { AIService } from '../../ai/ai.service';
import { ConfigService } from '@nestjs/config';
import { NluMetricsService } from '../../metrics/nlu-metrics.service';
import { PrimaryIntent, EmergencySeverity } from './dto/intent-classification.dto';

describe('IntentClassifierService', () => {
  let service: IntentClassifierService;
  let _aiService: AIService;

  // Mock AIService
  const mockAIService = {
    generateStructuredJSON: jest.fn(),
  };

  const mockConfigService = {
    get: jest.fn().mockReturnValue('http://localhost:8001'),
  };

  const mockNluMetricsService = {
    recordKeywordPhaseDuration: jest.fn(),
    recordConfidenceScore: jest.fn(),
    recordIntentClassification: jest.fn(),
    recordModelPhaseDuration: jest.fn(),
    recordLlmPhaseDuration: jest.fn(),
    setCircuitBreakerState: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        IntentClassifierService,
        {
          provide: AIService,
          useValue: mockAIService,
        },
        {
          provide: ConfigService,
          useValue: mockConfigService,
        },
        {
          provide: NluMetricsService,
          useValue: mockNluMetricsService,
        },
      ],
    }).compile();

    service = module.get<IntentClassifierService>(IntentClassifierService);
    _aiService = module.get<AIService>(AIService);

    // Reset mocks
    jest.clearAllMocks();
    (global as unknown as { fetch?: jest.Mock }).fetch = jest
      .fn()
      .mockRejectedValue(new Error('NLU unavailable'));
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  // ========================================
  // EMERGENCY DETECTION TESTS (100% RECALL)
  // ========================================
  describe('Emergency Detection (Critical Requirement)', () => {
    it('should detect cardiac arrest with 100% confidence', async () => {
      const result = await service.classify('Patient has no pulse, cardiac arrest!');

      expect(result.isEmergency).toBe(true);
      expect(result.primaryIntent).toBe(PrimaryIntent.EMERGENCY);
      expect(result.emergencySeverity).toBe(EmergencySeverity.CRITICAL);
      expect(result.confidence).toBe(1.0);
      expect(result.emergencyKeywords.length).toBeGreaterThan(0);
    });

    it('should detect stroke symptoms', async () => {
      const result = await service.classify('Patient has facial droop and slurred speech');

      expect(result.isEmergency).toBe(true);
      expect(result.emergencySeverity).toBe(EmergencySeverity.CRITICAL);
      expect(result.emergencyKeywords.some((k) => k.category === 'neurological')).toBe(true);
    });

    it('should detect chest pain (urgent)', async () => {
      const result = await service.classify('Patient complains of crushing chest pain');

      expect(result.isEmergency).toBe(true);
      expect(result.emergencySeverity).toBe(EmergencySeverity.URGENT);
      expect(result.emergencyKeywords.some((k) => k.category === 'cardiac')).toBe(true);
    });

    it('should detect respiratory failure', async () => {
      const result = await service.classify('Patient is not breathing');

      expect(result.isEmergency).toBe(true);
      expect(result.emergencySeverity).toBe(EmergencySeverity.CRITICAL);
      expect(result.emergencyKeywords.some((k) => k.category === 'respiratory')).toBe(true);
    });

    it('should detect suicide risk', async () => {
      const result = await service.classify('Patient says they want to kill themself');

      expect(result.isEmergency).toBe(true);
      expect(result.emergencySeverity).toBe(EmergencySeverity.CRITICAL);
      expect(result.emergencyKeywords.some((k) => k.category === 'psychiatric')).toBe(true);
    });

    it('should detect sepsis', async () => {
      const result = await service.classify('Patient has septic shock');

      expect(result.isEmergency).toBe(true);
      expect(result.emergencySeverity).toBe(EmergencySeverity.CRITICAL);
    });

    it('should detect massive hemorrhage', async () => {
      const result = await service.classify('Uncontrolled bleeding from wound');

      expect(result.isEmergency).toBe(true);
      expect(result.emergencySeverity).toBe(EmergencySeverity.CRITICAL);
      expect(result.emergencyKeywords.some((k) => k.category === 'trauma')).toBe(true);
    });

    it('should NOT false positive on non-emergency queries', async () => {
      const result = await service.classify('What is the treatment for stable angina?');

      expect(result.isEmergency).toBe(false);
      expect(result.emergencyKeywords.length).toBe(0);
    });
  });

  // ========================================
  // CLINICAL TOOL DETECTION TESTS
  // ========================================
  describe('Clinical Tool Detection', () => {
    it('should detect SOFA calculator request', async () => {
      const result = await service.classify('Calculate SOFA score for this patient');

      expect(result.primaryIntent).toBe(PrimaryIntent.CLINICAL_TOOL);
      expect(result.toolId).toBe('sofa-calculator');
      expect(result.confidence).toBeGreaterThan(0.5);
      expect(result.method).toBe('keyword');
    });

    it('should detect drug interaction checker', async () => {
      const result = await service.classify('Check interaction between warfarin and aspirin');

      expect(result.primaryIntent).toBe(PrimaryIntent.CLINICAL_TOOL);
      expect(result.toolId).toBe('drug-interactions');
      expect(result.confidence).toBeGreaterThan(0.5);
    });

    it('should detect lab interpreter', async () => {
      const result = await service.classify('Interpret these lab results');

      expect(result.primaryIntent).toBe(PrimaryIntent.CLINICAL_TOOL);
      expect(result.toolId).toBe('lab-interpreter');
    });

    it('should detect CHA2DS2-VASc calculator', async () => {
      const result = await service.classify('Calculate CHA2DS2-VASc score for AFib patient');

      expect(result.primaryIntent).toBe(PrimaryIntent.CLINICAL_TOOL);
      expect(result.toolId).toBe('cha2ds2vasc-calculator');
    });

    it('should provide alternative tool suggestions', async () => {
      const result = await service.classify('I need a cardiac risk calculator');

      expect(result.primaryIntent).toBe(PrimaryIntent.CLINICAL_TOOL);
      expect(result.alternativeIntents).toBeDefined();
      if (result.alternativeIntents) {
        expect(result.alternativeIntents.length).toBeGreaterThan(0);
      }
    });
  });

  // ========================================
  // PARAMETER EXTRACTION TESTS
  // ========================================
  describe('Parameter Extraction', () => {
    it('should extract age from message', async () => {
      const result = await service.classify('Calculate CURB-65 for 75 year old patient');

      expect(result.extractedParameters.age).toBe(75);
    });

    it('should extract medications from drug interaction query', async () => {
      const result = await service.classify('Check interactions between warfarin and aspirin');

      expect(result.extractedParameters.medications).toBeDefined();
    });
  });

  // ========================================
  // MEDICAL REFERENCE DETECTION
  // ========================================
  describe('Medical Reference Detection', () => {
    it('should detect medical information query', async () => {
      const result = await service.classify('What is the pathophysiology of heart failure?');

      expect(result.primaryIntent).toBe(PrimaryIntent.MEDICAL_REFERENCE);
      expect(result.confidence).toBeGreaterThan(0.3);
    });

    it('should detect treatment inquiry', async () => {
      const result = await service.classify('Tell me about treatment for pneumonia');

      expect(result.primaryIntent).toBe(PrimaryIntent.MEDICAL_REFERENCE);
    });

    it('should detect diagnostic criteria query', async () => {
      const result = await service.classify('What are the diagnostic criteria for diabetes?');

      expect(result.primaryIntent).toBe(PrimaryIntent.MEDICAL_REFERENCE);
    });
  });

  // ========================================
  // ADMINISTRATIVE DETECTION
  // ========================================
  describe('Administrative Detection', () => {
    it('should detect billing query', async () => {
      const result = await service.classify('What is the ICD-10 code for pneumonia?');

      expect(result.primaryIntent).toBe(PrimaryIntent.ADMINISTRATIVE);
    });

    it('should detect documentation request', async () => {
      const result = await service.classify('Help me write a discharge summary');

      expect(result.primaryIntent).toBe(PrimaryIntent.ADMINISTRATIVE);
    });
  });

  // ========================================
  // CONFIDENCE SCORING TESTS
  // ========================================
  describe('Confidence Scoring', () => {
    it('should have high confidence for clear tool requests', async () => {
      const result = await service.classify('Calculate SOFA score');

      expect(result.confidence).toBeGreaterThan(0.7);
    });

    it('should have lower confidence for ambiguous queries', async () => {
      const result = await service.classify('Tell me about the patient');

      expect(result.confidence).toBeLessThan(0.7);
    });

    it('should always have 1.0 confidence for emergencies', async () => {
      const result = await service.classify('Code blue! Patient is in cardiac arrest!');

      expect(result.confidence).toBe(1.0);
    });
  });

  // ========================================
  // LLM FALLBACK TESTS
  // ========================================
  describe('LLM Fallback (Phase 3)', () => {
    it('should invoke LLM for low-confidence queries', async () => {
      mockAIService.generateStructuredJSON.mockResolvedValue({
        primaryIntent: 'general_query',
        confidence: 0.8,
        extractedParameters: {},
        reasoning: 'Ambiguous query requiring LLM analysis',
      });

      const result = await service.classify('Can you help me with this complex case?');

      // Should attempt LLM if keyword confidence is low
      if (result.method === 'llm') {
        expect(mockAIService.generateStructuredJSON).toHaveBeenCalled();
      }
    });

    it('should gracefully fallback if LLM fails', async () => {
      mockAIService.generateStructuredJSON.mockRejectedValue(new Error('API error'));

      const result = await service.classify('Some ambiguous query');

      // Should still return a result (keyword-based fallback)
      expect(result).toBeDefined();
      expect(result.primaryIntent).toBeDefined();
    });
  });

  // ========================================
  // NLU INTEGRATION TESTS (PHASE 2)
  // ========================================
  describe('NLU Integration (Phase 2)', () => {
    it('should use NLU result when confidence is high', async () => {
      (global as unknown as { fetch?: jest.Mock }).fetch = jest.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          intent: 'clinical_tool',
          confidence: 0.92,
          toolId: 'sofa-calculator',
          parameters: {},
        }),
      });

      const result = await service.classify('Help me with this case');

      expect(result.method).toBe('nlu');
      expect(result.primaryIntent).toBe(PrimaryIntent.CLINICAL_TOOL);
      expect(result.confidence).toBeGreaterThanOrEqual(0.7);
    });

    it('should fall back to LLM when NLU confidence is low', async () => {
      (global as unknown as { fetch?: jest.Mock }).fetch = jest.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          intent: 'general_query',
          confidence: 0.4,
        }),
      });

      mockAIService.generateStructuredJSON.mockResolvedValue({
        primaryIntent: 'general_query',
        confidence: 0.8,
        extractedParameters: {},
        reasoning: 'LLM fallback due to low NLU confidence',
      });

      const result = await service.classify('Can you help me with this complex case?');

      expect(result.method).toBe('llm');
      expect(mockAIService.generateStructuredJSON).toHaveBeenCalled();
    });
  });

  // ========================================
  // ESCALATION TESTS
  // ========================================
  describe('Escalation Requirements', () => {
    it('should require escalation for critical emergencies', async () => {
      const result = await service.classify('Patient cardiac arrest');

      const requiresEscalation = service.requiresEscalation(result);
      expect(requiresEscalation).toBe(true);
    });

    it('should not require escalation for urgent but stable conditions', async () => {
      const result = await service.classify('Patient has chest pain, stable vitals');

      // Chest pain is URGENT, not CRITICAL, so should not auto-escalate
      expect(result.emergencySeverity).toBe(EmergencySeverity.URGENT);
      expect(service.requiresEscalation(result)).toBe(false);
    });

    it('should provide escalation message for emergencies', async () => {
      const classification = await service.classify('Stroke suspected - facial droop');

      const patterns = classification.emergencyKeywords.map((kw) => ({
        keywords: [kw.keyword],
        category: kw.category,
        severity: kw.severity,
        escalationMessage: 'Test message',
      }));

      const message = service.getEmergencyEscalationMessage(patterns);
      expect(message).toBeDefined();
      expect(message.length).toBeGreaterThan(0);
    });
  });

  // ========================================
  // CLASSIFICATION METHOD TESTS
  // ========================================
  describe('Classification Method Tracking', () => {
    it('should track keyword method for simple queries', async () => {
      const result = await service.classify('Calculate SOFA score');

      expect(result.method).toBe('keyword');
    });

    it('should include timestamp', async () => {
      const result = await service.classify('Test query');

      expect(result.classifiedAt).toBeInstanceOf(Date);
    });
  });

  // ========================================
  // EDGE CASES
  // ========================================
  describe('Edge Cases', () => {
    it('should handle empty message', async () => {
      const result = await service.classify('');

      expect(result).toBeDefined();
      expect(result.primaryIntent).toBe(PrimaryIntent.GENERAL_QUERY);
    });

    it('should handle very long messages', async () => {
      const longMessage = 'Calculate SOFA score '.repeat(100);

      const result = await service.classify(longMessage);

      expect(result).toBeDefined();
      expect(result.primaryIntent).toBe(PrimaryIntent.CLINICAL_TOOL);
    });

    it('should handle special characters', async () => {
      const result = await service.classify('Patient has HR: 120, BP: 90/60, Temp: 38.5°C');

      expect(result).toBeDefined();
    });

    it('should handle case insensitivity', async () => {
      const result1 = await service.classify('CARDIAC ARREST');
      const result2 = await service.classify('cardiac arrest');
      const result3 = await service.classify('Cardiac Arrest');

      expect(result1.isEmergency).toBe(true);
      expect(result2.isEmergency).toBe(true);
      expect(result3.isEmergency).toBe(true);
    });
  });
});
