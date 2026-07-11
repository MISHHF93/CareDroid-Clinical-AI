/**
 * Modified Early Warning Score (MEWS) Calculator Service Unit Tests
 */

import { Test, TestingModule } from '@nestjs/testing';
import { MewsService } from '../src/modules/medical-control-plane/tool-orchestrator/services/mews.service';

describe('MewsService', () => {
  let service: MewsService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [MewsService],
    }).compile();

    service = module.get<MewsService>(MewsService);
  });

  describe('getMetadata', () => {
    it('returns valid metadata', () => {
      expect(service.getMetadata().id).toBe('mews');
    });
  });

  describe('validate', () => {
    it('rejects missing required fields', () => {
      const result = service.validate({ respiratoryRate: 20 });
      expect(result.valid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
    });

    it('rejects an out-of-range AVPU value', () => {
      const result = service.validate({
        respiratoryRate: 16,
        heartRate: 75,
        systolicBp: 115,
        temperature: 37,
        avpu: 5,
      });
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('avpu must be one of 0, 1, 2, 3');
    });
  });

  describe('execute — calculation and banding', () => {
    it('calculates a low-risk MEWS (score 1)', async () => {
      const result = await service.execute({
        respiratoryRate: 16,
        heartRate: 75,
        systolicBp: 115,
        temperature: 37,
        avpu: 0,
      });
      expect(result.data.totalScore).toBe(1);
      expect(result.data.riskCategory).toBe('low');
      expect(result.data.severity).toBe('normal');
    });

    it('calculates a moderate-risk MEWS (score 3)', async () => {
      const result = await service.execute({
        respiratoryRate: 17,
        heartRate: 105,
        systolicBp: 115,
        temperature: 37,
        avpu: 1,
      });
      expect(result.data.totalScore).toBe(3);
      expect(result.data.riskCategory).toBe('medium');
      expect(result.data.severity).toBe('warning');
    });

    it('calculates a high-risk MEWS (score >= 5)', async () => {
      const result = await service.execute({
        respiratoryRate: 22,
        heartRate: 115,
        systolicBp: 95,
        temperature: 38.7,
        avpu: 1,
      });
      expect(result.data.totalScore).toBe(8);
      expect(result.data.breakdown).toEqual({
        respiratoryRate: 2,
        heartRate: 2,
        systolicBp: 1,
        temperature: 2,
        avpu: 1,
      });
      expect(result.data.riskCategory).toBe('high');
      expect(result.data.severity).toBe('critical');
    });

    it('populates interpretation, citation, disclaimer, and safety warnings', async () => {
      const result = await service.execute({
        respiratoryRate: 22,
        heartRate: 115,
        systolicBp: 95,
        temperature: 38.7,
        avpu: 1,
      });
      expect(result.interpretation).toContain('urgent clinical review');
      expect(result.citations?.[0]?.reference).toContain('Subbe CP');
      expect(result.warnings).toContain(
        'MEWS does not diagnose sepsis, shock, respiratory failure, or any specific condition.',
      );
      expect(result.disclaimer).toContain('A low MEWS does not rule out serious illness');
    });

    it('fails execution when validation fails', async () => {
      const result = await service.execute({ respiratoryRate: 20 });
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
