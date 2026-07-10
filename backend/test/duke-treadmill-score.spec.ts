/**
 * Duke Treadmill Score Calculator Service Unit Tests
 */

import { Test, TestingModule } from '@nestjs/testing';
import { DukeTreadmillScoreService } from '../src/modules/medical-control-plane/tool-orchestrator/services/duke-treadmill-score.service';

describe('DukeTreadmillScoreService', () => {
  let service: DukeTreadmillScoreService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [DukeTreadmillScoreService],
    }).compile();

    service = module.get<DukeTreadmillScoreService>(DukeTreadmillScoreService);
  });

  describe('getMetadata', () => {
    it('returns valid metadata', () => {
      expect(service.getMetadata().id).toBe('duke-treadmill-score');
    });
  });

  describe('validate', () => {
    it('accepts a valid payload', () => {
      expect(
        service.validate({ exerciseMinutes: 10, stDeviationMm: 1, anginaIndex: 0 }).valid,
      ).toBe(true);
    });

    it('rejects an out-of-range anginaIndex', () => {
      const result = service.validate({ exerciseMinutes: 10, stDeviationMm: 1, anginaIndex: 3 });
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('anginaIndex must be 0, 1, or 2');
    });

    it('rejects missing fields', () => {
      expect(service.validate({}).valid).toBe(false);
    });
  });

  describe('execute — formula and bands', () => {
    it('computes score = exerciseMinutes - 5*stDeviation - 4*anginaIndex', async () => {
      const result = await service.execute({
        exerciseMinutes: 12,
        stDeviationMm: 1,
        anginaIndex: 1,
      });
      expect(result.data.score).toBe(3);
    });

    it('classifies score <= -11 as high risk', async () => {
      const result = await service.execute({
        exerciseMinutes: 0,
        stDeviationMm: 3,
        anginaIndex: 0,
      });
      expect(result.data.score).toBe(-15);
      expect(result.data.riskBand).toBe('<= -11');
    });

    it('classifies score of -10 as intermediate risk (boundary)', async () => {
      const result = await service.execute({
        exerciseMinutes: 0,
        stDeviationMm: 2,
        anginaIndex: 0,
      });
      expect(result.data.score).toBe(-10);
      expect(result.data.riskBand).toBe('-10 to +4');
    });

    it('classifies score of 5 as lower risk (boundary)', async () => {
      const result = await service.execute({
        exerciseMinutes: 5,
        stDeviationMm: 0,
        anginaIndex: 0,
      });
      expect(result.data.score).toBe(5);
      expect(result.data.riskBand).toBe('>= +5');
    });

    it('populates interpretation, citation, and disclaimer', async () => {
      const result = await service.execute({
        exerciseMinutes: 10,
        stDeviationMm: 0,
        anginaIndex: 0,
      });
      expect(result.interpretation).toContain('lower risk');
      expect(result.citations?.[0]?.reference).toContain('Mark DB');
      expect(result.disclaimer).toContain('interpretable exercise treadmill testing');
    });

    it('fails execution when validation fails', async () => {
      const result = await service.execute({
        exerciseMinutes: -1,
        stDeviationMm: 1,
        anginaIndex: 0,
      });
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
