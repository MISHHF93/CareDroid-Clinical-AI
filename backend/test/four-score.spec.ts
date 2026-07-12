/**
 * FOUR Score Calculator Service Unit Tests
 */

import { Test, TestingModule } from '@nestjs/testing';
import { FourScoreService } from '../src/modules/medical-control-plane/tool-orchestrator/services/four-score.service';

describe('FourScoreService', () => {
  let service: FourScoreService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [FourScoreService],
    }).compile();

    service = module.get<FourScoreService>(FourScoreService);
  });

  describe('getMetadata', () => {
    it('returns valid metadata', () => {
      expect(service.getMetadata().id).toBe('four-score');
    });
  });

  describe('validate', () => {
    it('rejects missing components', () => {
      const result = service.validate({ eye: '4' });
      expect(result.valid).toBe(false);
      expect(result.errors.length).toBe(3);
    });
  });

  describe('execute — component sum and banding', () => {
    it('calculates the maximum score as normal severity (16/16)', async () => {
      const result = await service.execute({
        eye: '4',
        motor: '4',
        brainstem: '4',
        respiration: '4',
      });
      expect(result.data.score).toBe(16);
      expect(result.data.severity).toBe('normal');
      expect(result.data.label).toBe('FOUR score 16/16');
    });

    it('calculates the minimum score as critical severity (0/16)', async () => {
      const result = await service.execute({
        eye: '0',
        motor: '0',
        brainstem: '0',
        respiration: '0',
      });
      expect(result.data.score).toBe(0);
      expect(result.data.severity).toBe('critical');
    });

    it('calculates a warning-band score (10/16)', async () => {
      const result = await service.execute({
        eye: '2',
        motor: '2',
        brainstem: '3',
        respiration: '3',
      });
      expect(result.data.score).toBe(10);
      expect(result.data.severity).toBe('warning');
      expect(result.data.components).toEqual({ eye: 2, motor: 2, brainstem: 3, respiration: 3 });
    });

    it('populates interpretation, citation, and disclaimer', async () => {
      const result = await service.execute({
        eye: '4',
        motor: '4',
        brainstem: '4',
        respiration: '4',
      });
      expect(result.interpretation).toContain('eye, motor, brainstem reflex');
      expect(result.citations?.[0]?.reference).toContain('Wijdicks EFM');
      expect(result.disclaimer).toContain('Do not delay emergency stroke activation');
    });

    it('fails execution when validation fails', async () => {
      const result = await service.execute({ eye: '4' });
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
