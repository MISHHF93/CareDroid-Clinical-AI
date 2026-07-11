/**
 * Corrected Calcium Calculator Service Unit Tests
 */

import { Test, TestingModule } from '@nestjs/testing';
import { CorrectedCalciumService } from '../src/modules/medical-control-plane/tool-orchestrator/services/corrected-calcium.service';

describe('CorrectedCalciumService', () => {
  let service: CorrectedCalciumService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [CorrectedCalciumService],
    }).compile();

    service = module.get<CorrectedCalciumService>(CorrectedCalciumService);
  });

  describe('getMetadata', () => {
    it('returns valid metadata', () => {
      expect(service.getMetadata().id).toBe('corrected-calcium');
    });
  });

  describe('validate', () => {
    it('rejects missing required fields', () => {
      const result = service.validate({ calciumMgDl: 8 });
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('albuminGDl must be between 1 and 6');
    });

    it('accepts a valid payload', () => {
      expect(service.validate({ calciumMgDl: 8, albuminGDl: 2 }).valid).toBe(true);
    });
  });

  describe('execute — calculation and banding', () => {
    it('calculates a normal corrected calcium (Ca 8.0, alb 2.0 -> 9.6)', async () => {
      const result = await service.execute({ calciumMgDl: 8.0, albuminGDl: 2.0 });
      expect(result.data.correctedCalciumMgDl).toBe(9.6);
      expect(result.data.correctedCalciumMmolL).toBe(2.4);
      expect(result.data.severity).toBe('normal');
    });

    it('flags critical low corrected calcium (< 7)', async () => {
      const result = await service.execute({ calciumMgDl: 6, albuminGDl: 4 });
      expect(result.data.correctedCalciumMgDl).toBe(6);
      expect(result.data.severity).toBe('critical');
    });

    it('flags critical high corrected calcium (> 12)', async () => {
      const result = await service.execute({ calciumMgDl: 13, albuminGDl: 4 });
      expect(result.data.correctedCalciumMgDl).toBe(13);
      expect(result.data.severity).toBe('critical');
    });

    it('populates interpretation, citation, and disclaimer', async () => {
      const result = await service.execute({ calciumMgDl: 8, albuminGDl: 2 });
      expect(result.interpretation).toContain('Albumin-corrected calcium');
      expect(result.citations?.[0]?.reference).toContain('0.8 x (4.0 - albumin');
      expect(result.disclaimer).toContain('Does not diagnose calcium disorders');
    });

    it('fails execution when validation fails', async () => {
      const result = await service.execute({ calciumMgDl: 8 });
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
