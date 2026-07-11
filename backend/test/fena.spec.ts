/**
 * Fractional Excretion of Sodium (FeNa) Calculator Service Unit Tests
 */

import { Test, TestingModule } from '@nestjs/testing';
import { FenaService } from '../src/modules/medical-control-plane/tool-orchestrator/services/fena.service';

describe('FenaService', () => {
  let service: FenaService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [FenaService],
    }).compile();

    service = module.get<FenaService>(FenaService);
  });

  describe('getMetadata', () => {
    it('returns valid metadata', () => {
      expect(service.getMetadata().id).toBe('fena');
    });
  });

  describe('validate', () => {
    it('rejects missing required fields', () => {
      const result = service.validate({ serumSodium: 140 });
      expect(result.valid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
    });
  });

  describe('execute — calculation and banding', () => {
    it('calculates a low FeNa (< 1%)', async () => {
      const result = await service.execute({
        serumSodium: 140,
        urineSodium: 20,
        serumCreatinineMgDl: 2.0,
        urineCreatinineMgDl: 60,
      });
      expect(result.data.fractionalExcretionPct).toBe(0.48);
      expect(result.data.riskBand).toBe('low');
      expect(result.data.severity).toBe('normal');
    });

    it('calculates an intermediate FeNa (1-2%)', async () => {
      const result = await service.execute({
        serumSodium: 140,
        urineSodium: 40,
        serumCreatinineMgDl: 1.0,
        urineCreatinineMgDl: 20,
      });
      expect(result.data.fractionalExcretionPct).toBe(1.43);
      expect(result.data.riskBand).toBe('intermediate');
      expect(result.data.severity).toBe('warning');
    });

    it('calculates a high FeNa (> 2%)', async () => {
      const result = await service.execute({
        serumSodium: 140,
        urineSodium: 60,
        serumCreatinineMgDl: 1.0,
        urineCreatinineMgDl: 20,
      });
      expect(result.data.fractionalExcretionPct).toBe(2.14);
      expect(result.data.riskBand).toBe('high');
    });

    it('populates interpretation, citation, and disclaimer', async () => {
      const result = await service.execute({
        serumSodium: 140,
        urineSodium: 20,
        serumCreatinineMgDl: 2.0,
        urineCreatinineMgDl: 60,
      });
      expect(result.interpretation).toContain('urine electrolyte pattern');
      expect(result.citations?.[0]?.reference).toContain('urine sodium x serum creatinine');
      expect(result.disclaimer).toContain('does not diagnose AKI etiology');
    });

    it('fails execution when validation fails', async () => {
      const result = await service.execute({ serumSodium: 140 });
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
