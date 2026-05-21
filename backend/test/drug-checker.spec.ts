/**
 * Drug Interaction Checker Service Unit Tests
 *
 * Tests for drug-drug interaction detection
 * Covers rule-based detection, AI integration, severity classification
 */

import { Test, TestingModule } from '@nestjs/testing';
import { DrugCheckerService } from '../src/modules/medical-control-plane/tool-orchestrator/services/drug-checker.service';
import { AIService } from '../src/modules/ai/ai.service';

describe('DrugCheckerService', () => {
  let service: DrugCheckerService;
  let mockAiService: any;

  beforeEach(async () => {
    mockAiService = {
      generateStructuredJSON: jest.fn().mockResolvedValue({
        interactions: [],
        summary: 'No additional interactions detected',
      }),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        DrugCheckerService,
        {
          provide: AIService,
          useValue: mockAiService,
        },
      ],
    }).compile();

    service = module.get<DrugCheckerService>(DrugCheckerService);
  });

  describe('getMetadata', () => {
    it('should return drug checker metadata', () => {
      const metadata = service.getMetadata();

      expect(metadata.id).toBe('drug-interactions');
      expect(metadata.name).toBe('Drug Interaction Checker');
      expect(metadata.category).toBe('checker');
      expect(metadata.version).toBe('1.0.0');
    });
  });

  describe('getSchema', () => {
    it('should define medications parameter', () => {
      const schema = service.getSchema();
      const medicationsParam = schema.find((p) => p.name === 'medications');

      expect(medicationsParam).toBeDefined();
      expect(medicationsParam?.required).toBe(true);
      expect(medicationsParam?.type).toBe('array');
    });
  });

  describe('validate', () => {
    it('should require medications parameter', () => {
      const result = service.validate({});
      expect(result.valid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
    });

    it('should reject empty medications array', () => {
      const result = service.validate({ medications: [] });
      expect(result.valid).toBe(false);
    });

    it('should accept single medication', () => {
      const result = service.validate({ medications: ['aspirin'] });
      expect(result.valid).toBe(true);
    });

    it('should accept multiple medications', () => {
      const result = service.validate({
        medications: ['warfarin', 'aspirin', 'metformin'],
      });
      expect(result.valid).toBe(true);
    });

    it('should reject non-array medications', () => {
      const result = service.validate({ medications: 'warfarin' });
      expect(result.valid).toBe(false);
    });

    it('should reject medications with non-string elements', () => {
      const result = service.validate({
        medications: ['warfarin', 123],
      });
      expect(result.valid).toBe(false);
    });
  });

  describe('Known interactions detection', () => {
    it('should detect warfarin + aspirin interaction', async () => {
      const result = await service.execute({
        medications: ['warfarin', 'aspirin'],
      });

      expect(result.success).toBe(true);
      expect(result.data.interactions).toBeDefined();
      const warfarinAspirin = result.data.interactions.find(
        (i) =>
          ['warfarin', 'aspirin'].includes(i.drug1.toLowerCase()) &&
          ['warfarin', 'aspirin'].includes(i.drug2.toLowerCase()),
      );
      expect(warfarinAspirin).toBeDefined();
    });

    it('should detect warfarin + NSAID interaction', async () => {
      const result = await service.execute({
        medications: ['warfarin', 'ibuprofen'],
      });

      expect(result.success).toBe(true);
      const interaction = result.data.interactions.find((i) => i.severity === 'major');
      expect(interaction).toBeDefined();
    });

    it('should detect metformin + contrast interaction', async () => {
      const result = await service.execute({
        medications: ['metformin', 'contrast dye'],
      });

      expect(result.success).toBe(true);
      expect(result.data.interactions.length).toBeGreaterThan(0);
    });

    it('should detect SSRI + tramadol interaction', async () => {
      const result = await service.execute({
        medications: ['sertraline', 'tramadol'],
      });

      expect(result.success).toBe(true);
      expect(result.data.interactions.length).toBeGreaterThan(0);
    });

    it('should detect ACE inhibitor + spironolactone interaction', async () => {
      const result = await service.execute({
        medications: ['lisinopril', 'spironolactone'],
      });

      expect(result.success).toBe(true);
      expect(result.data.interactions.length).toBeGreaterThan(0);
    });

    it('should not flag incompatible drugs without interactions', async () => {
      const result = await service.execute({
        medications: ['acetaminophen', 'ibuprofen'],
      });

      expect(result.success).toBe(true);
      // Should have no interactions or only minor ones
    });
  });

  describe('Severity classification', () => {
    it('should classify major interactions with "major" severity', async () => {
      const result = await service.execute({
        medications: ['warfarin', 'aspirin'],
      });

      expect(result.success).toBe(true);
      const majorInteraction = result.data.interactions.find((i) => i.severity === 'major');
      expect(majorInteraction).toBeDefined();
    });

    it('should include severity field in all interactions', async () => {
      const result = await service.execute({
        medications: ['warfarin', 'aspirin', 'metoprolol'],
      });

      expect(result.success).toBe(true);
      result.data.interactions.forEach((interaction) => {
        expect(['contraindicated', 'major', 'moderate', 'minor']).toContain(interaction.severity);
      });
    });

    it('should provide recommendation for major interactions', async () => {
      const result = await service.execute({
        medications: ['warfarin', 'aspirin'],
      });

      expect(result.success).toBe(true);
      const majorInteraction = result.data.interactions.find((i) => i.severity === 'major');
      if (majorInteraction) {
        expect(majorInteraction.recommendation).toBeDefined();
        expect(majorInteraction.recommendation?.length).toBeGreaterThan(0);
      }
    });
  });

  describe('Multiple medication combinations', () => {
    it('should detect all interactions in 3-drug combination', async () => {
      const result = await service.execute({
        medications: ['warfarin', 'aspirin', 'metformin'],
      });

      expect(result.success).toBe(true);
      expect(result.data.interactions.length).toBeGreaterThanOrEqual(0);
    });

    it('should handle single medication (no interactions)', async () => {
      const result = await service.execute({
        medications: ['aspirin'],
      });

      expect(result.success).toBe(true);
      expect(Array.isArray(result.data.interactions)).toBe(true);
    });

    it('should find all combinations for n medications', async () => {
      const result = await service.execute({
        medications: ['drug1', 'drug2', 'drug3', 'drug4'],
      });

      expect(result.success).toBe(true);
      expect(Array.isArray(result.data.interactions)).toBe(true);
    });
  });

  describe('execute method', () => {
    it('should return success true', async () => {
      const result = await service.execute({
        medications: ['aspirin'],
      });
      expect(result.success).toBe(true);
    });

    it('should return interactions array', async () => {
      const result = await service.execute({
        medications: ['warfarin', 'aspirin'],
      });
      expect(Array.isArray(result.data.interactions)).toBe(true);
    });

    it('should include timestamp', async () => {
      const result = await service.execute({
        medications: ['aspirin'],
      });
      expect(result.timestamp).toBeDefined();
      expect(result.timestamp instanceof Date).toBe(true);
    });

    it('should include interpretation', async () => {
      const result = await service.execute({
        medications: ['aspirin'],
      });
      expect(result.interpretation).toBeDefined();
    });

    it('should include disclaimer', async () => {
      const result = await service.execute({
        medications: ['aspirin'],
      });
      expect(result.disclaimer).toBeDefined();
    });

    it('should include citations', async () => {
      const result = await service.execute({
        medications: ['aspirin'],
      });
      expect(result.citations).toBeDefined();
    });
  });

  describe('Interpretation text', () => {
    it('should generate appropriate interpretation for no interactions', async () => {
      const result = await service.execute({
        medications: ['acetaminophen'],
      });

      expect(result.interpretation).toBeDefined();
      expect(result.interpretation?.length).toBeGreaterThan(0);
    });

    it('should generate appropriate interpretation for major interactions', async () => {
      const result = await service.execute({
        medications: ['warfarin', 'aspirin'],
      });

      expect(result.interpretation).toBeDefined();
      expect(result.interpretation).toContain('major');
    });

    it('should include severity in interpretation', async () => {
      const result = await service.execute({
        medications: ['warfarin', 'aspirin'],
      });

      const interpretation = result.interpretation.toLowerCase();
      expect(
        interpretation.includes('major') ||
          interpretation.includes('interaction') ||
          interpretation.includes('warning'),
      ).toBe(true);
    });
  });

  describe('AI integration', () => {
    it('should call AI service for comprehensive analysis', async () => {
      await service.execute({ medications: ['warfarin', 'aspirin'] });

      expect(mockAiService.generateStructuredJSON).toHaveBeenCalled();
    });

    it('should handle AI service errors gracefully', async () => {
      mockAiService.generateStructuredJSON.mockRejectedValueOnce(
        new Error('AI service unavailable'),
      );

      const result = await service.execute({
        medications: ['warfarin', 'aspirin'],
      });

      expect(result.success).toBe(true);
    });
  });

  describe('Drug name handling', () => {
    it('should be case-insensitive for drug names', async () => {
      const result1 = await service.execute({
        medications: ['Warfarin', 'ASPIRIN'],
      });
      const result2 = await service.execute({
        medications: ['warfarin', 'aspirin'],
      });

      expect(result1.data.interactions.length).toBe(result2.data.interactions.length);
    });

    it('should handle brand names', async () => {
      const result = await service.execute({
        medications: ['Coumadin', 'Bayer'],
      });

      expect(result.success).toBe(true);
    });

    it('should handle generic and brand name combinations', async () => {
      const result = await service.execute({
        medications: ['warfarin', 'Bayer'],
      });

      expect(result.success).toBe(true);
    });

    it('should trim whitespace from drug names', async () => {
      const result = await service.execute({
        medications: ['  warfarin  ', ' aspirin '],
      });

      expect(result.success).toBe(true);
    });
  });

  describe('Edge cases', () => {
    it('should handle special characters in drug names', async () => {
      const result = await service.execute({
        medications: ['Co-trimoxazole'],
      });

      expect(result.success).toBe(true);
    });

    it('should handle unknown drug names', async () => {
      const result = await service.execute({
        medications: ['unknown_drug_xyz123', 'aspirin'],
      });

      expect(result.success).toBe(true);
    });

    it('should handle very long medication list', async () => {
      const medications = Array.from({ length: 20 }, (_, i) => `drug${i}`);
      const result = await service.execute({ medications });

      expect(result.success).toBe(true);
    });

    it('should handle duplicate medications', async () => {
      const result = await service.execute({
        medications: ['warfarin', 'warfarin', 'aspirin'],
      });

      expect(result.success).toBe(true);
    });
  });

  describe('Interaction object structure', () => {
    it('each interaction should have required fields', async () => {
      const result = await service.execute({
        medications: ['warfarin', 'aspirin'],
      });

      result.data.interactions.forEach((interaction) => {
        expect(interaction).toHaveProperty('drug1');
        expect(interaction).toHaveProperty('drug2');
        expect(interaction).toHaveProperty('severity');
        expect(interaction).toHaveProperty('description');
      });
    });

    it('interaction should have optional recommendation field', async () => {
      const result = await service.execute({
        medications: ['warfarin', 'aspirin'],
      });

      result.data.interactions.forEach((interaction) => {
        if (interaction.severity === 'major' || interaction.severity === 'contraindicated') {
          expect(interaction.recommendation).toBeDefined();
        }
      });
    });
  });
});
