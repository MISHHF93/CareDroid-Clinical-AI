/**
 * Revised Trauma Score (RTS) Calculator Service Unit Tests
 */

import { Test, TestingModule } from '@nestjs/testing';
import { RevisedTraumaScoreService } from '../src/modules/medical-control-plane/tool-orchestrator/services/revised-trauma-score.service';

describe('RevisedTraumaScoreService', () => {
  let service: RevisedTraumaScoreService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [RevisedTraumaScoreService],
    }).compile();

    service = module.get<RevisedTraumaScoreService>(RevisedTraumaScoreService);
  });

  describe('getMetadata', () => {
    it('returns valid metadata', () => {
      expect(service.getMetadata().id).toBe('revised-trauma-score');
    });
  });

  describe('validate', () => {
    it('rejects missing required fields', () => {
      const result = service.validate({ gcs: 15 });
      expect(result.valid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
    });

    it('rejects an out-of-range GCS', () => {
      const result = service.validate({ gcs: 2, systolicBp: 110, respiratoryRate: 18 });
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('gcs must be between 3 and 15');
    });
  });

  describe('execute — calculation and banding', () => {
    it('calculates the maximum RTS for normal physiology (GCS 15, SBP 110, RR 18)', async () => {
      const result = await service.execute({ gcs: 15, systolicBp: 110, respiratoryRate: 18 });
      expect(result.data.gcsCode).toBe(4);
      expect(result.data.sbpCode).toBe(4);
      expect(result.data.rrCode).toBe(4);
      expect(result.data.weighted).toBeCloseTo(7.8408, 4);
      expect(result.data.unweighted).toBe(12);
      expect(result.data.riskCategory).toBe('maximal');
      expect(result.data.severity).toBe('normal');
    });

    it('calculates a critical RTS for the worst-coded physiology (GCS 3, SBP 0, RR 0)', async () => {
      const result = await service.execute({ gcs: 3, systolicBp: 0, respiratoryRate: 0 });
      expect(result.data.weighted).toBe(0);
      expect(result.data.riskCategory).toBe('critical');
      expect(result.data.severity).toBe('critical');
    });

    it('calculates a "high" (low RTS) band between 4 and 6', async () => {
      const result = await service.execute({ gcs: 10, systolicBp: 80, respiratoryRate: 8 });
      expect(result.data.gcsCode).toBe(3);
      expect(result.data.sbpCode).toBe(3);
      expect(result.data.rrCode).toBe(2);
      expect(result.data.weighted).toBeCloseTo(5.5898, 4);
      expect(result.data.riskCategory).toBe('high');
      expect(result.data.severity).toBe('critical');
    });

    it('calculates a "moderate" (reduced RTS) band between 6 and 7.84', async () => {
      const result = await service.execute({ gcs: 15, systolicBp: 110, respiratoryRate: 32 });
      expect(result.data.rrCode).toBe(3);
      expect(result.data.weighted).toBeCloseTo(7.55, 2);
      expect(result.data.riskCategory).toBe('moderate');
      expect(result.data.severity).toBe('warning');
    });

    it('populates interpretation, citation, and disclaimer', async () => {
      const result = await service.execute({ gcs: 15, systolicBp: 110, respiratoryRate: 18 });
      expect(result.interpretation).toContain('maximum coded value');
      expect(result.citations?.[0]?.reference).toContain('Champion HR');
      expect(result.disclaimer).toContain('does not replace primary/secondary survey');
    });

    it('fails execution when validation fails', async () => {
      const result = await service.execute({ gcs: 15 });
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
