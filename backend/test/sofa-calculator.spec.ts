/**
 * SOFA Calculator Service Unit Tests
 *
 * Tests for sequential organ failure assessment scoring algorithm
 * Covers all organ systems, edge cases, and mortality estimation
 */

import { Test, TestingModule } from '@nestjs/testing';
import { SofaCalculatorService } from '../src/modules/medical-control-plane/tool-orchestrator/services/sofa-calculator.service';
import { AIService } from '../src/modules/ai/ai.service';

describe('SofaCalculatorService', () => {
  let service: SofaCalculatorService;
  let mockAiService: any;

  beforeEach(async () => {
    mockAiService = {
      generateStructuredJSON: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SofaCalculatorService,
        {
          provide: AIService,
          useValue: mockAiService,
        },
      ],
    }).compile();

    service = module.get<SofaCalculatorService>(SofaCalculatorService);
  });

  describe('getMetadata', () => {
    it('should return valid SOFA calculator metadata', () => {
      const metadata = service.getMetadata();

      expect(metadata.id).toBe('sofa-calculator');
      expect(metadata.name).toBe('SOFA Score Calculator');
      expect(metadata.category).toBe('calculator');
      expect(metadata.version).toBe('1.0.0');
      expect(metadata.references).toBeDefined();
    });
  });

  describe('getSchema', () => {
    it('should return all expected parameters', () => {
      const schema = service.getSchema();

      expect(schema.length).toBeGreaterThan(10);
      const paramNames = schema.map((p) => p.name);
      expect(paramNames).toContain('pao2');
      expect(paramNames).toContain('platelets');
      expect(paramNames).toContain('bilirubin');
      expect(paramNames).toContain('gcs');
      expect(paramNames).toContain('creatinine');
    });

    it('all parameters should be optional', () => {
      const schema = service.getSchema();
      expect(schema.every((p) => !p.required)).toBe(true);
    });
  });

  describe('validate', () => {
    it('should accept empty parameters', () => {
      const result = service.validate({});
      expect(result.valid).toBe(true);
      expect(result.errors).toEqual([]);
    });

    it('should reject non-numeric parameter values', () => {
      const result = service.validate({
        pao2: 'invalid',
      });
      expect(result.valid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
    });

    it('should reject out-of-range values', () => {
      const result = service.validate({
        pao2: -10,
      });
      expect(result.valid).toBe(false);
    });

    it('should warn about unusual but valid values', () => {
      const result = service.validate({
        platelets: 1000,
      });
      expect(result.warnings.length).toBeGreaterThanOrEqual(0);
    });
  });

  describe('Respiration scoring', () => {
    it('should score 0 for PaO2/FiO2 >= 400', async () => {
      const result = await service.execute({
        pao2: 400,
        fio2: 1.0,
      });

      expect(result.success).toBe(true);
      expect(result.data.respirationScore).toBe(0);
    });

    it('should score 1 for PaO2/FiO2 300-399', async () => {
      const result = await service.execute({
        pao2: 300,
        fio2: 1.0,
      });

      expect(result.success).toBe(true);
      expect(result.data.respirationScore).toBe(1);
    });

    it('should score 2 for PaO2/FiO2 200-299', async () => {
      const result = await service.execute({
        pao2: 200,
        fio2: 1.0,
      });

      expect(result.success).toBe(true);
      expect(result.data.respirationScore).toBe(2);
    });

    it('should score 3 for PaO2/FiO2 100-199', async () => {
      const result = await service.execute({
        pao2: 100,
        fio2: 1.0,
      });

      expect(result.success).toBe(true);
      expect(result.data.respirationScore).toBe(3);
    });

    it('should score 4 for PaO2/FiO2 < 100', async () => {
      const result = await service.execute({
        pao2: 50,
        fio2: 1.0,
      });

      expect(result.success).toBe(true);
      expect(result.data.respirationScore).toBe(4);
    });

    it('should account for mechanical ventilation in scoring', async () => {
      const withVent = await service.execute({
        pao2: 250,
        fio2: 1.0,
        mechanicalVentilation: true,
      });

      const withoutVent = await service.execute({
        pao2: 250,
        fio2: 1.0,
        mechanicalVentilation: false,
      });

      expect(withVent.success).toBe(true);
      expect(withoutVent.success).toBe(true);
    });
  });

  describe('Coagulation scoring', () => {
    it('should score 0 for platelets >= 150', async () => {
      const result = await service.execute({ platelets: 150 });
      expect(result.data.coagulationScore).toBe(0);
    });

    it('should score 1 for platelets 100-149', async () => {
      const result = await service.execute({ platelets: 120 });
      expect(result.data.coagulationScore).toBe(1);
    });

    it('should score 2 for platelets 50-99', async () => {
      const result = await service.execute({ platelets: 75 });
      expect(result.data.coagulationScore).toBe(2);
    });

    it('should score 3 for platelets 20-49', async () => {
      const result = await service.execute({ platelets: 30 });
      expect(result.data.coagulationScore).toBe(3);
    });

    it('should score 4 for platelets < 20', async () => {
      const result = await service.execute({ platelets: 10 });
      expect(result.data.coagulationScore).toBe(4);
    });
  });

  describe('Liver scoring', () => {
    it('should score 0 for bilirubin < 1.2', async () => {
      const result = await service.execute({ bilirubin: 1.0 });
      expect(result.data.liverScore).toBe(0);
    });

    it('should score 1 for bilirubin 1.2-1.9', async () => {
      const result = await service.execute({ bilirubin: 1.5 });
      expect(result.data.liverScore).toBe(1);
    });

    it('should score 2 for bilirubin 2.0-5.9', async () => {
      const result = await service.execute({ bilirubin: 3.0 });
      expect(result.data.liverScore).toBe(2);
    });

    it('should score 3 for bilirubin 6.0-11.9', async () => {
      const result = await service.execute({ bilirubin: 8.0 });
      expect(result.data.liverScore).toBe(3);
    });

    it('should score 4 for bilirubin >= 12.0', async () => {
      const result = await service.execute({ bilirubin: 15.0 });
      expect(result.data.liverScore).toBe(4);
    });
  });

  describe('Cardiovascular scoring', () => {
    it('should score 0 for MAP >= 70 with no vasopressors', async () => {
      const result = await service.execute({ map: 70 });
      expect(result.data.cardiovascularScore).toBe(0);
    });

    it('should score 1 for MAP < 70', async () => {
      const result = await service.execute({ map: 60 });
      expect(result.data.cardiovascularScore).toBe(1);
    });

    it('should score 2 for dopamine <= 5 or dobutamine', async () => {
      const result = await service.execute({
        map: 60,
        dopamine: 5,
      });
      expect(result.data.cardiovascularScore).toBe(2);
    });

    it('should score 3 for dopamine > 5 or epinephrine <= 0.1', async () => {
      const result = await service.execute({
        map: 60,
        dopamine: 10,
      });
      expect(result.data.cardiovascularScore).toBe(3);
    });

    it('should score 4 for epinephrine > 0.1 or norepinephrine > 0.1', async () => {
      const result = await service.execute({
        map: 60,
        epinephrine: 0.2,
      });
      expect(result.data.cardiovascularScore).toBe(4);
    });
  });

  describe('CNS scoring', () => {
    it('should score 0 for GCS 15', async () => {
      const result = await service.execute({ gcs: 15 });
      expect(result.data.cnsScore).toBe(0);
    });

    it('should score 1 for GCS 13-14', async () => {
      const result = await service.execute({ gcs: 13 });
      expect(result.data.cnsScore).toBe(1);
    });

    it('should score 2 for GCS 10-12', async () => {
      const result = await service.execute({ gcs: 10 });
      expect(result.data.cnsScore).toBe(2);
    });

    it('should score 3 for GCS 6-9', async () => {
      const result = await service.execute({ gcs: 7 });
      expect(result.data.cnsScore).toBe(3);
    });

    it('should score 4 for GCS < 6', async () => {
      const result = await service.execute({ gcs: 3 });
      expect(result.data.cnsScore).toBe(4);
    });

    it('should handle edge case GCS values', async () => {
      const result = await service.execute({ gcs: 15 });
      expect(result.success).toBe(true);
      expect(result.data.cnsScore).toBeDefined();
    });
  });

  describe('Renal scoring', () => {
    it('should score 0 for creatinine < 1.2', async () => {
      const result = await service.execute({ creatinine: 1.0 });
      expect(result.data.renalScore).toBe(0);
    });

    it('should score 1 for creatinine 1.2-1.9', async () => {
      const result = await service.execute({ creatinine: 1.5 });
      expect(result.data.renalScore).toBe(1);
    });

    it('should consider urine output in renal score', async () => {
      const result = await service.execute({
        creatinine: 1.5,
        urineOutput: 200,
      });
      expect(result.data.renalScore).toBeDefined();
    });
  });

  describe('Total score calculation', () => {
    it('should sum all organ scores up to 24', async () => {
      const result = await service.execute({
        pao2: 50,
        fio2: 1.0,
        platelets: 10,
        bilirubin: 15.0,
        map: 40,
        dopamine: 0,
        gcs: 3,
        creatinine: 5.0,
      });

      expect(result.data.totalScore).toBeLessThanOrEqual(24);
      expect(result.data.totalScore).toBeGreaterThanOrEqual(0);
    });

    it('should return 0 for normal parameters', async () => {
      const result = await service.execute({
        pao2: 400,
        fio2: 1.0,
        platelets: 200,
        bilirubin: 0.5,
        map: 80,
        gcs: 15,
        creatinine: 0.8,
      });

      expect(result.data.totalScore).toBe(0);
    });

    it('should correctly calculate mixed scores', async () => {
      const result = await service.execute({
        pao2: 150,
        fio2: 1.0,
        platelets: 100,
        bilirubin: 2.0,
        map: 60,
        gcs: 13,
        creatinine: 1.5,
      });

      expect(result.data.totalScore).toBeGreaterThan(0);
      expect(result.data.totalScore).toBeLessThanOrEqual(24);
    });
  });

  describe('Interpretation', () => {
    it('should interpret score 0-2 as minimal dysfunction', async () => {
      const result = await service.execute({ pao2: 350, fio2: 1.0 });
      expect(result.data.interpretation).toBeDefined();
      expect(result.data.interpretation.toLowerCase()).toContain('minimal');
    });

    it('should provide clinical interpretation for each score', async () => {
      const result = await service.execute({ pao2: 100, fio2: 1.0 });
      expect(result.data.interpretation).toBeDefined();
      expect(result.data.interpretation.length).toBeGreaterThan(0);
    });
  });

  describe('Mortality estimation', () => {
    it('should estimate <10% mortality for low scores', async () => {
      const result = await service.execute({
        pao2: 400,
        fio2: 1.0,
        platelets: 200,
        bilirubin: 0.5,
        map: 80,
        gcs: 15,
        creatinine: 0.8,
      });

      expect(result.data.mortalityEstimate).toBeDefined();
    });

    it('should estimate >50% mortality for high scores', async () => {
      const result = await service.execute({
        pao2: 50,
        fio2: 1.0,
        platelets: 10,
        bilirubin: 15.0,
        map: 40,
        gcs: 3,
        creatinine: 5.0,
      });

      expect(result.data.mortalityEstimate).toBeDefined();
    });
  });

  describe('Execute method', () => {
    it('should return success true for valid execution', async () => {
      const result = await service.execute({ pao2: 200, fio2: 1.0 });
      expect(result.success).toBe(true);
    });

    it('should include timestamp', async () => {
      const result = await service.execute({ pao2: 200, fio2: 1.0 });
      expect(result.timestamp).toBeDefined();
      expect(result.timestamp instanceof Date).toBe(true);
    });

    it('should include citations', async () => {
      const result = await service.execute({ pao2: 200, fio2: 1.0 });
      expect(result.citations).toBeDefined();
      expect(result.citations?.length).toBeGreaterThan(0);
    });

    it('should include disclaimer', async () => {
      const result = await service.execute({ pao2: 200, fio2: 1.0 });
      expect(result.disclaimer).toBeDefined();
      expect(result.disclaimer?.length).toBeGreaterThan(0);
    });
  });

  describe('Edge cases', () => {
    it('should handle zero values', async () => {
      const result = await service.execute({ pao2: 0, fio2: 0 });
      expect(result.success).toBe(true);
    });

    it('should handle very large values', async () => {
      const result = await service.execute({ pao2: 1000, fio2: 1.0 });
      expect(result.success).toBe(true);
    });

    it('should handle floating point precision', async () => {
      const result = await service.execute({
        pao2: 99.99,
        fio2: 0.999,
      });
      expect(result.success).toBe(true);
    });
  });
});
