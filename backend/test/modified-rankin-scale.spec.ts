/**
 * Modified Rankin Scale Calculator Service Unit Tests
 */

import { Test, TestingModule } from '@nestjs/testing';
import { ModifiedRankinScaleService } from '../src/modules/medical-control-plane/tool-orchestrator/services/modified-rankin-scale.service';

describe('ModifiedRankinScaleService', () => {
  let service: ModifiedRankinScaleService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [ModifiedRankinScaleService],
    }).compile();

    service = module.get<ModifiedRankinScaleService>(ModifiedRankinScaleService);
  });

  describe('getMetadata', () => {
    it('returns valid metadata', () => {
      expect(service.getMetadata().id).toBe('modified-rankin-scale');
    });
  });

  describe('validate', () => {
    it('rejects a missing score', () => {
      const result = service.validate({});
      expect(result.valid).toBe(false);
    });

    it('rejects an out-of-range score', () => {
      const result = service.validate({ score: '9' });
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('score must be one of 0, 1, 2, 3, 4, 5, 6');
    });
  });

  describe('execute — level-to-severity banding', () => {
    it('score 0 is normal severity', async () => {
      const result = await service.execute({ score: '0' });
      expect(result.data.score).toBe(0);
      expect(result.data.severity).toBe('normal');
      expect(result.data.label).toBe('mRS 0');
    });

    it('score 1 is still normal severity (below the warning threshold)', async () => {
      const result = await service.execute({ score: '1' });
      expect(result.data.severity).toBe('normal');
    });

    it('score 2 is warning severity', async () => {
      const result = await service.execute({ score: '2' });
      expect(result.data.severity).toBe('warning');
    });

    it('score 4 is critical severity', async () => {
      const result = await service.execute({ score: '4' });
      expect(result.data.severity).toBe('critical');
    });

    it('score 6 (death) is critical severity', async () => {
      const result = await service.execute({ score: '6' });
      expect(result.data.score).toBe(6);
      expect(result.data.severity).toBe('critical');
    });

    it('populates interpretation, citation, and disclaimer', async () => {
      const result = await service.execute({ score: '1' });
      expect(result.interpretation).toContain('global disability after stroke');
      expect(result.citations?.[0]?.reference).toContain('Rankin J');
      expect(result.disclaimer).toContain('Do not delay emergency stroke activation');
    });

    it('fails execution when validation fails', async () => {
      const result = await service.execute({});
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
