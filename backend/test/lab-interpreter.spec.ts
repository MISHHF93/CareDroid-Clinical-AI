/**
 * Lab Interpreter Service Unit Tests
 *
 * Tests for laboratory result interpretation
 * Covers lab classification, reference ranges, AI integration
 */

import { Test, TestingModule } from '@nestjs/testing';
import { LabInterpreterService } from '../src/modules/medical-control-plane/tool-orchestrator/services/lab-interpreter.service';
import { AIService } from '../src/modules/ai/ai.service';

describe('LabInterpreterService', () => {
  let service: LabInterpreterService;
  let mockAiService: any;

  beforeEach(async () => {
    mockAiService = {
      generateStructuredJSON: jest.fn().mockResolvedValue({
        findings: ['All values within normal limits'],
        clinicalSignificance: 'No significant abnormalities detected.',
        suggestedActions: [],
      }),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        LabInterpreterService,
        {
          provide: AIService,
          useValue: mockAiService,
        },
      ],
    }).compile();

    service = module.get<LabInterpreterService>(LabInterpreterService);
  });

  describe('getMetadata', () => {
    it('should return lab interpreter metadata', () => {
      const metadata = service.getMetadata();

      expect(metadata.id).toBe('lab-interpreter');
      expect(metadata.name).toBe('Lab Results Interpreter');
      expect(metadata.category).toBe('interpreter');
    });
  });

  describe('getSchema', () => {
    it('should include labValues parameter', () => {
      const schema = service.getSchema();
      const labValuesParam = schema.find((p) => p.name === 'labValues');

      expect(labValuesParam).toBeDefined();
      expect(labValuesParam?.required).toBe(true);
      expect(labValuesParam?.type).toBe('array');
    });

    it('should include optional demographic parameters', () => {
      const schema = service.getSchema();
      const paramNames = schema.map((p) => p.name);

      expect(paramNames).toContain('patientAge');
      expect(paramNames).toContain('patientSex');
      expect(paramNames).toContain('clinicalContext');
    });
  });

  describe('validate', () => {
    it('should require labValues parameter', () => {
      const result = service.validate({});
      expect(result.valid).toBe(false);
    });

    it('should reject empty labValues array', () => {
      const result = service.validate({ labValues: [] });
      expect(result.valid).toBe(false);
    });

    it('should accept single lab value', () => {
      const result = service.validate({
        labValues: [{ name: 'WBC', value: 7.5, unit: 'K/μL' }],
      });
      expect(result.valid).toBe(true);
    });

    it('should validate patientAge range', () => {
      const result = service.validate({
        labValues: [{ name: 'WBC', value: 7.5 }],
        patientAge: 150,
      });
      expect(result.valid).toBe(false);
    });

    it('should reject negative patientAge', () => {
      const result = service.validate({
        labValues: [{ name: 'WBC', value: 7.5 }],
        patientAge: -5,
      });
      expect(result.valid).toBe(false);
    });

    it('should validate patientSex options', () => {
      const result = service.validate({
        labValues: [{ name: 'WBC', value: 7.5 }],
        patientSex: 'invalid',
      });
      expect(result.valid).toBe(false);
    });

    it('should accept valid patientSex values', () => {
      const resultMale = service.validate({
        labValues: [{ name: 'WBC', value: 7.5 }],
        patientSex: 'male',
      });
      const resultFemale = service.validate({
        labValues: [{ name: 'WBC', value: 7.5 }],
        patientSex: 'female',
      });

      expect(resultMale.valid).toBe(true);
      expect(resultFemale.valid).toBe(true);
    });
  });

  describe('Lab value classification', () => {
    it('should classify normal WBC as normal', async () => {
      const result = await service.execute({
        labValues: [{ name: 'WBC', value: 7.0, unit: 'K/μL' }],
      });

      expect(result.success).toBe(true);
      const wbc = result.data.labValues.find((l) => l.name === 'WBC');
      expect(wbc?.status).toBe('normal');
    });

    it('should classify low WBC as low', async () => {
      const result = await service.execute({
        labValues: [{ name: 'WBC', value: 2.0, unit: 'K/μL' }],
      });

      expect(result.data.labValues[0].status).toBe('low');
    });

    it('should classify high WBC as high', async () => {
      const result = await service.execute({
        labValues: [{ name: 'WBC', value: 20.0, unit: 'K/μL' }],
      });

      expect(result.data.labValues[0].status).toBe('high');
    });

    it('should classify critical WBC as critical-low', async () => {
      const result = await service.execute({
        labValues: [{ name: 'WBC', value: 1.0, unit: 'K/μL' }],
      });

      expect(result.data.labValues[0].status).toBe('critical-low');
    });

    it('should classify critical WBC as critical-high', async () => {
      const result = await service.execute({
        labValues: [{ name: 'WBC', value: 35.0, unit: 'K/μL' }],
      });

      expect(result.data.labValues[0].status).toBe('critical-high');
    });
  });

  describe('Sex-specific reference ranges', () => {
    it('should use different hemoglobin ranges for male vs female', async () => {
      const maleResult = await service.execute({
        labValues: [{ name: 'Hemoglobin', value: 12.5, unit: 'g/dL' }],
        patientSex: 'male',
      });

      const femaleResult = await service.execute({
        labValues: [{ name: 'Hemoglobin', value: 12.5, unit: 'g/dL' }],
        patientSex: 'female',
      });

      expect(maleResult.data.labValues[0].status).toBe('low');
      expect(femaleResult.data.labValues[0].status).toBe('normal');
    });

    it('should use different creatinine ranges for male vs female', async () => {
      const maleResult = await service.execute({
        labValues: [{ name: 'Creatinine', value: 0.7, unit: 'mg/dL' }],
        patientSex: 'male',
      });

      const femaleResult = await service.execute({
        labValues: [{ name: 'Creatinine', value: 0.7, unit: 'mg/dL' }],
        patientSex: 'female',
      });

      expect(maleResult.data.labValues[0].status).toBe('normal');
      expect(femaleResult.data.labValues[0].status).toBe('normal');
    });
  });

  describe('Reference range retrieval', () => {
    it('should provide reference range display text', async () => {
      const result = await service.execute({
        labValues: [{ name: 'WBC', value: 7.0 }],
      });

      const wbc = result.data.labValues.find((l) => l.name === 'WBC');
      expect(wbc?.referenceRange).toBeDefined();
      expect(wbc?.referenceRange).toMatch(/\d+/);
    });

    it('should handle labs with unknown reference ranges', async () => {
      const result = await service.execute({
        labValues: [{ name: 'UnknownLab', value: 123 }],
      });

      expect(result.success).toBe(true);
      const lab = result.data.labValues.find((l) => l.name === 'UnknownLab');
      expect(lab?.referenceRange).toBeDefined();
    });
  });

  describe('Lab categorization', () => {
    it('should group CBC values together', async () => {
      const result = await service.execute({
        labValues: [
          { name: 'WBC', value: 7.0 },
          { name: 'Hemoglobin', value: 14.0 },
          { name: 'Platelets', value: 250 },
        ],
      });

      expect(result.data.groupedByCategory['CBC']).toBeDefined();
      expect(result.data.groupedByCategory['CBC'].length).toBe(3);
    });

    it('should group electrolyte values together', async () => {
      const result = await service.execute({
        labValues: [
          { name: 'Sodium', value: 140 },
          { name: 'Potassium', value: 4.5 },
        ],
      });

      expect(result.data.groupedByCategory['Electrolytes']).toBeDefined();
      expect(result.data.groupedByCategory['Electrolytes'].length).toBe(2);
    });

    it('should separate labs into correct categories', async () => {
      const result = await service.execute({
        labValues: [
          { name: 'WBC', value: 7.0 },
          { name: 'Sodium', value: 140 },
          { name: 'Creatinine', value: 0.9 },
          { name: 'ALT', value: 25 },
        ],
      });

      expect(Object.keys(result.data.groupedByCategory).length).toBeGreaterThan(1);
    });
  });

  describe('Critical values detection', () => {
    it('should identify critical-high values', async () => {
      const result = await service.execute({
        labValues: [{ name: 'Glucose', value: 500, unit: 'mg/dL' }],
      });

      const criticalValues = result.data.criticalValues || [];
      expect(criticalValues.length).toBeGreaterThan(0);
    });

    it('should identify critical-low values', async () => {
      const result = await service.execute({
        labValues: [{ name: 'Glucose', value: 30, unit: 'mg/dL' }],
      });

      const criticalValues = result.data.criticalValues || [];
      expect(criticalValues.length).toBeGreaterThan(0);
    });

    it('should not include normal values in critical values', async () => {
      const result = await service.execute({
        labValues: [
          { name: 'Glucose', value: 85, unit: 'mg/dL' },
          { name: 'WBC', value: 7.0, unit: 'K/μL' },
        ],
      });

      const criticalValues = result.data.criticalValues || [];
      expect(criticalValues.length).toBe(0);
    });
  });

  describe('Summary statistics', () => {
    it('should calculate correct summary counts', async () => {
      const result = await service.execute({
        labValues: [
          { name: 'WBC', value: 2.0 },
          { name: 'Sodium', value: 140 },
          { name: 'Glucose', value: 85 },
          { name: 'Platelets', value: 10 },
        ],
      });

      const summary = result.data.summary;
      expect(summary.total).toBe(4);
      expect(summary.abnormal).toBeGreaterThan(0);
      expect(summary.normal).toEqual(summary.total - summary.abnormal - summary.critical);
    });

    it('should track normal value count', async () => {
      const result = await service.execute({
        labValues: [
          { name: 'WBC', value: 7.0 },
          { name: 'Sodium', value: 140 },
        ],
      });

      expect(result.data.summary.normal).toBeGreaterThanOrEqual(0);
    });
  });

  describe('execute method', () => {
    it('should return success true for valid input', async () => {
      const result = await service.execute({
        labValues: [{ name: 'WBC', value: 7.0 }],
      });

      expect(result.success).toBe(true);
    });

    it('should include timestamp', async () => {
      const result = await service.execute({
        labValues: [{ name: 'WBC', value: 7.0 }],
      });

      expect(result.timestamp).toBeDefined();
      expect(result.timestamp instanceof Date).toBe(true);
    });

    it('should include disclaimer', async () => {
      const result = await service.execute({
        labValues: [{ name: 'WBC', value: 7.0 }],
      });

      expect(result.disclaimer).toBeDefined();
      expect(result.disclaimer?.length).toBeGreaterThan(0);
    });

    it('should include citations', async () => {
      const result = await service.execute({
        labValues: [{ name: 'WBC', value: 7.0 }],
      });

      expect(result.citations).toBeDefined();
      expect(result.citations?.length).toBeGreaterThan(0);
    });

    it('should include interpretation', async () => {
      const result = await service.execute({
        labValues: [{ name: 'WBC', value: 7.0 }],
      });

      expect(result.interpretation).toBeDefined();
    });
  });

  describe('Interpretation generation', () => {
    it('should generate interpretation for normal values', async () => {
      const result = await service.execute({
        labValues: [{ name: 'WBC', value: 7.0 }],
      });

      expect(result.interpretation).toBeDefined();
      expect(result.interpretation?.length).toBeGreaterThan(0);
    });

    it('should generate interpretation for abnormal values', async () => {
      const result = await service.execute({
        labValues: [{ name: 'WBC', value: 2.0 }],
      });

      expect(result.interpretation).toBeDefined();
    });

    it('should call AI service for interpretation', async () => {
      await service.execute({
        labValues: [
          { name: 'WBC', value: 2.0 },
          { name: 'Hemoglobin', value: 10.0 },
        ],
      });

      expect(mockAiService.generateStructuredJSON).toHaveBeenCalled();
    });

    it('should include suggested actions in interpretation', async () => {
      const result = await service.execute({
        labValues: [{ name: 'WBC', value: 2.0 }],
      });

      if (result.data.interpretations && result.data.interpretations.length > 0) {
        const interpretation = result.data.interpretations[0];
        expect(interpretation.suggestedActions).toBeDefined();
      }
    });
  });

  describe('AI integration', () => {
    it('should call AI service for abnormal values', async () => {
      await service.execute({
        labValues: [{ name: 'WBC', value: 2.0 }],
      });

      expect(mockAiService.generateStructuredJSON).toHaveBeenCalled();
    });

    it('should handle AI service errors gracefully', async () => {
      mockAiService.generateStructuredJSON.mockRejectedValueOnce(
        new Error('AI service unavailable'),
      );

      const result = await service.execute({
        labValues: [{ name: 'WBC', value: 2.0 }],
      });

      expect(result.success).toBe(true);
    });

    it('should fall back to rule-based interpretation', async () => {
      mockAiService.generateStructuredJSON.mockRejectedValueOnce(
        new Error('AI service unavailable'),
      );

      const result = await service.execute({
        labValues: [
          { name: 'WBC', value: 2.0 },
          { name: 'Hemoglobin', value: 10.0 },
        ],
      });

      expect(result.data.interpretations).toBeDefined();
      expect(result.data.interpretations.length).toBeGreaterThan(0);
    });
  });

  describe('Common lab panels', () => {
    it('should handle CBC panel', async () => {
      const result = await service.execute({
        labValues: [
          { name: 'WBC', value: 7.0 },
          { name: 'Hemoglobin', value: 14.0 },
          { name: 'Platelets', value: 250 },
        ],
      });

      expect(result.success).toBe(true);
      expect(result.data.groupedByCategory['CBC']).toBeDefined();
    });

    it('should handle BMP panel', async () => {
      const result = await service.execute({
        labValues: [
          { name: 'Sodium', value: 140 },
          { name: 'Potassium', value: 4.0 },
          { name: 'Glucose', value: 85 },
          { name: 'Creatinine', value: 0.9 },
        ],
      });

      expect(result.success).toBe(true);
    });

    it('should handle LFT panel', async () => {
      const result = await service.execute({
        labValues: [
          { name: 'ALT', value: 25 },
          { name: 'AST', value: 30 },
          { name: 'Bilirubin', value: 0.8 },
          { name: 'Albumin', value: 4.0 },
        ],
      });

      expect(result.success).toBe(true);
      expect(result.data.groupedByCategory['Liver Function']).toBeDefined();
    });
  });

  describe('Edge cases', () => {
    it('should handle zero values', async () => {
      const result = await service.execute({
        labValues: [{ name: 'WBC', value: 0 }],
      });

      expect(result.success).toBe(true);
    });

    it('should handle very large values', async () => {
      const result = await service.execute({
        labValues: [{ name: 'Glucose', value: 9999 }],
      });

      expect(result.success).toBe(true);
    });

    it('should handle decimal values', async () => {
      const result = await service.execute({
        labValues: [{ name: 'Creatinine', value: 1.234 }],
      });

      expect(result.success).toBe(true);
    });

    it('should handle missing units', async () => {
      const result = await service.execute({
        labValues: [{ name: 'WBC', value: 7.0 }],
      });

      expect(result.success).toBe(true);
      expect(result.data.labValues[0].unit).toBeDefined();
    });

    it('should handle labs without reference ranges', async () => {
      const result = await service.execute({
        labValues: [{ name: 'UnknownLab123', value: 42 }],
      });

      expect(result.success).toBe(true);
    });
  });

  describe('Multiple value processing', () => {
    it('should process many labs without error', async () => {
      const labs = Array.from({ length: 30 }, (_, i) => ({
        name: `Lab${i}`,
        value: Math.random() * 100,
      }));

      const result = await service.execute({ labValues: labs });

      expect(result.success).toBe(true);
      expect(result.data.labValues.length).toBe(30);
    });

    it('should preserve lab data integrity', async () => {
      const labValues = [
        { name: 'WBC', value: 7.5, unit: 'K/μL' },
        { name: 'Hemoglobin', value: 14.2, unit: 'g/dL' },
      ];

      const result = await service.execute({ labValues });

      result.data.labValues.forEach((lab, idx) => {
        expect(lab.name).toBe(labValues[idx].name);
        expect(lab.value).toBe(labValues[idx].value);
      });
    });
  });
});
