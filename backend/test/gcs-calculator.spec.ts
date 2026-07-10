/**
 * GCS Calculator Service Unit Tests
 */

import { Test, TestingModule } from '@nestjs/testing';
import { GcsCalculatorService } from '../src/modules/medical-control-plane/tool-orchestrator/services/gcs-calculator.service';

describe('GcsCalculatorService', () => {
  let service: GcsCalculatorService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [GcsCalculatorService],
    }).compile();

    service = module.get<GcsCalculatorService>(GcsCalculatorService);
  });

  describe('getMetadata', () => {
    it('returns valid metadata', () => {
      expect(service.getMetadata().id).toBe('gcs-calculator');
    });
  });

  describe('validate', () => {
    it('accepts values within each component range', () => {
      expect(service.validate({ eye: 4, verbal: 5, motor: 6 }).valid).toBe(true);
      expect(service.validate({ eye: 1, verbal: 1, motor: 1 }).valid).toBe(true);
    });

    it('rejects eye > 4', () => {
      const result = service.validate({ eye: 5, verbal: 5, motor: 6 });
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('eye must be a number between 1 and 4');
    });

    it('rejects verbal > 5', () => {
      const result = service.validate({ eye: 4, verbal: 6, motor: 6 });
      expect(result.valid).toBe(false);
    });

    it('rejects motor > 6', () => {
      const result = service.validate({ eye: 4, verbal: 5, motor: 7 });
      expect(result.valid).toBe(false);
    });

    it('rejects values below 1', () => {
      const result = service.validate({ eye: 0, verbal: 5, motor: 6 });
      expect(result.valid).toBe(false);
    });
  });

  describe('execute — scoring and bands', () => {
    it('sums to the minimum score of 3', async () => {
      const result = await service.execute({ eye: 1, verbal: 1, motor: 1 });
      expect(result.data.score).toBe(3);
      expect(result.data.riskCategory).toBe('severe');
    });

    it('sums to the maximum score of 15', async () => {
      const result = await service.execute({ eye: 4, verbal: 5, motor: 6 });
      expect(result.data.score).toBe(15);
      expect(result.data.riskCategory).toBe('mild');
    });

    it('classifies score 8 as severe (boundary)', async () => {
      const result = await service.execute({ eye: 2, verbal: 3, motor: 3 });
      expect(result.data.score).toBe(8);
      expect(result.data.riskCategory).toBe('severe');
    });

    it('classifies score 9 as moderate (boundary)', async () => {
      const result = await service.execute({ eye: 2, verbal: 3, motor: 4 });
      expect(result.data.score).toBe(9);
      expect(result.data.riskCategory).toBe('moderate');
    });

    it('classifies score 12 as moderate (boundary)', async () => {
      const result = await service.execute({ eye: 3, verbal: 4, motor: 5 });
      expect(result.data.score).toBe(12);
      expect(result.data.riskCategory).toBe('moderate');
    });

    it('classifies score 13 as mild (boundary)', async () => {
      const result = await service.execute({ eye: 4, verbal: 4, motor: 5 });
      expect(result.data.score).toBe(13);
      expect(result.data.riskCategory).toBe('mild');
    });

    it('populates interpretation, citation, and warnings', async () => {
      const result = await service.execute({ eye: 1, verbal: 1, motor: 1 });
      expect(result.interpretation).toContain('severe traumatic brain injury');
      expect(result.citations?.[0]?.reference).toContain('Teasdale');
      expect(result.warnings?.length).toBeGreaterThan(0);
    });

    it('fails execution when validation fails', async () => {
      const result = await service.execute({ eye: 0, verbal: 5, motor: 6 });
      expect(result.success).toBe(false);
      expect(result.data).toEqual({});
    });
  });

  describe('getExample', () => {
    it('returns a valid example payload', () => {
      const example = service.getExample?.();
      expect(service.validate(example!).valid).toBe(true);
    });
  });
});
