/**
 * Shock Index Calculator Service Unit Tests
 */

import { Test, TestingModule } from '@nestjs/testing';
import { ShockIndexService } from '../src/modules/medical-control-plane/tool-orchestrator/services/shock-index.service';

describe('ShockIndexService', () => {
  let service: ShockIndexService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [ShockIndexService],
    }).compile();

    service = module.get<ShockIndexService>(ShockIndexService);
  });

  describe('getMetadata', () => {
    it('returns valid metadata', () => {
      expect(service.getMetadata().id).toBe('shock-index');
    });
  });

  describe('validate', () => {
    it('accepts positive heartRate/systolicBp', () => {
      expect(service.validate({ heartRate: 80, systolicBp: 120 }).valid).toBe(true);
    });

    it('rejects zero or negative values', () => {
      const result = service.validate({ heartRate: 0, systolicBp: -10 });
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('heartRate must be a positive number');
      expect(result.errors).toContain('systolicBp must be a positive number');
    });

    it('rejects missing values', () => {
      expect(service.validate({}).valid).toBe(false);
    });
  });

  describe('execute — calculation and risk banding', () => {
    it('calculates HR/SBP rounded to 2 decimals', async () => {
      const result = await service.execute({ heartRate: 90, systolicBp: 120 });
      expect(result.data.index).toBe(0.75);
    });

    it('classifies index < 0.9 as not elevated', async () => {
      const result = await service.execute({ heartRate: 70, systolicBp: 120 });
      expect(result.data.riskCategory).toBe('not_elevated');
    });

    it('classifies index of 0.9 as elevated (boundary)', async () => {
      const result = await service.execute({ heartRate: 108, systolicBp: 120 });
      expect(result.data.index).toBe(0.9);
      expect(result.data.riskCategory).toBe('elevated');
    });

    it('classifies index of exactly 1.0 as critical (boundary)', async () => {
      const result = await service.execute({ heartRate: 120, systolicBp: 120 });
      expect(result.data.index).toBe(1);
      expect(result.data.riskCategory).toBe('critical');
    });

    it('classifies index above 1.0 as critical', async () => {
      const result = await service.execute({ heartRate: 140, systolicBp: 90 });
      expect(result.data.riskCategory).toBe('critical');
    });

    it('populates interpretation, citation, and disclaimer', async () => {
      const result = await service.execute({ heartRate: 140, systolicBp: 90 });
      expect(result.interpretation).toContain('hemodynamic warning sign');
      expect(result.citations?.[0]?.reference).toContain('heart rate / systolic blood pressure');
      expect(result.disclaimer).toContain('Does not diagnose shock');
    });

    it('fails execution when validation fails', async () => {
      const result = await service.execute({ heartRate: -5, systolicBp: 120 });
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
