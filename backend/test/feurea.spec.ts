/**
 * Fractional Excretion of Urea (FeUrea) Calculator Service Unit Tests
 */

import { Test, TestingModule } from '@nestjs/testing';
import { FeureaService } from '../src/modules/medical-control-plane/tool-orchestrator/services/feurea.service';

describe('FeureaService', () => {
  let service: FeureaService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [FeureaService],
    }).compile();

    service = module.get<FeureaService>(FeureaService);
  });

  describe('getMetadata', () => {
    it('returns valid metadata', () => {
      expect(service.getMetadata().id).toBe('feurea');
    });
  });

  describe('validate', () => {
    it('rejects missing required fields', () => {
      const result = service.validate({ bunMgDl: 40 });
      expect(result.valid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
    });
  });

  describe('execute — calculation and banding', () => {
    it('calculates a not-low FeUrea (>= 35%)', async () => {
      const result = await service.execute({
        bunMgDl: 40,
        urineUreaNitrogenMgDl: 800,
        serumCreatinineMgDl: 2.0,
        urineCreatinineMgDl: 60,
      });
      expect(result.data.fractionalExcretionPct).toBe(66.7);
      expect(result.data.riskBand).toBe('not_low');
    });

    it('calculates a low FeUrea (< 35%)', async () => {
      const result = await service.execute({
        bunMgDl: 40,
        urineUreaNitrogenMgDl: 200,
        serumCreatinineMgDl: 2.0,
        urineCreatinineMgDl: 60,
      });
      expect(result.data.fractionalExcretionPct).toBe(16.7);
      expect(result.data.riskBand).toBe('low');
    });

    it('populates interpretation, citation, and disclaimer', async () => {
      const result = await service.execute({
        bunMgDl: 40,
        urineUreaNitrogenMgDl: 800,
        serumCreatinineMgDl: 2.0,
        urineCreatinineMgDl: 60,
      });
      expect(result.interpretation).toContain('FeUrea can support AKI pattern review');
      expect(result.citations?.[0]?.reference).toContain('urine urea nitrogen x serum creatinine');
      expect(result.disclaimer).toContain('does not diagnose AKI etiology');
    });

    it('fails execution when validation fails', async () => {
      const result = await service.execute({ bunMgDl: 40 });
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
