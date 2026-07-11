/**
 * PaO2/FiO2 Ratio Calculator Service Unit Tests
 */

import { Test, TestingModule } from '@nestjs/testing';
import { Pao2Fio2RatioService } from '../src/modules/medical-control-plane/tool-orchestrator/services/pao2-fio2-ratio.service';

describe('Pao2Fio2RatioService', () => {
  let service: Pao2Fio2RatioService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [Pao2Fio2RatioService],
    }).compile();

    service = module.get<Pao2Fio2RatioService>(Pao2Fio2RatioService);
  });

  describe('getMetadata', () => {
    it('returns valid metadata', () => {
      expect(service.getMetadata().id).toBe('pao2-fio2-ratio');
    });
  });

  describe('validate', () => {
    it('rejects missing required fields', () => {
      const result = service.validate({ pao2MmHg: 90 });
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('fio2Pct must be between 21 and 100');
    });
  });

  describe('execute — calculation and banding', () => {
    it('calculates a severe ratio (<= 100)', async () => {
      const result = await service.execute({ pao2MmHg: 80, fio2Pct: 100 });
      expect(result.data.ratio).toBe(80);
      expect(result.data.riskBand).toBe('severe');
      expect(result.data.severity).toBe('critical');
    });

    it('calculates a moderate ratio (101-200)', async () => {
      const result = await service.execute({ pao2MmHg: 90, fio2Pct: 60 });
      expect(result.data.ratio).toBe(150);
      expect(result.data.riskBand).toBe('moderate');
      expect(result.data.severity).toBe('warning');
    });

    it('calculates a mild ratio (201-300)', async () => {
      const result = await service.execute({ pao2MmHg: 90, fio2Pct: 40 });
      expect(result.data.ratio).toBe(225);
      expect(result.data.riskBand).toBe('mild');
    });

    it('calculates above the ARDS threshold', async () => {
      const result = await service.execute({ pao2MmHg: 90, fio2Pct: 21 });
      expect(result.data.riskBand).toBe('above_ards_threshold');
      expect(result.data.severity).toBe('normal');
    });

    it('populates interpretation, citation, and disclaimer', async () => {
      const result = await service.execute({ pao2MmHg: 80, fio2Pct: 100 });
      expect(result.interpretation).toContain('ARDS diagnosis requires timing');
      expect(result.citations?.[0]?.title).toBe('Berlin Definition of ARDS');
      expect(result.disclaimer).toContain('Does not diagnose ARDS');
    });

    it('fails execution when validation fails', async () => {
      const result = await service.execute({ pao2MmHg: 90 });
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
