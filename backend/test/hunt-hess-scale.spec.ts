/**
 * Hunt-Hess Scale Calculator Service Unit Tests
 */

import { Test, TestingModule } from '@nestjs/testing';
import { HuntHessScaleService } from '../src/modules/medical-control-plane/tool-orchestrator/services/hunt-hess-scale.service';

describe('HuntHessScaleService', () => {
  let service: HuntHessScaleService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [HuntHessScaleService],
    }).compile();

    service = module.get<HuntHessScaleService>(HuntHessScaleService);
  });

  describe('getMetadata', () => {
    it('returns valid metadata', () => {
      expect(service.getMetadata().id).toBe('hunt-hess-scale');
    });
  });

  describe('validate', () => {
    it('rejects a missing grade', () => {
      const result = service.validate({});
      expect(result.valid).toBe(false);
    });

    it('rejects an out-of-range grade', () => {
      const result = service.validate({ grade: '9' });
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('grade must be one of 1, 2, 3, 4, 5');
    });
  });

  describe('execute — grade-to-severity banding', () => {
    it('grade 1 is normal severity', async () => {
      const result = await service.execute({ grade: '1' });
      expect(result.data.grade).toBe(1);
      expect(result.data.severity).toBe('normal');
    });

    it('grade 3 is warning severity', async () => {
      const result = await service.execute({ grade: '3' });
      expect(result.data.grade).toBe(3);
      expect(result.data.severity).toBe('warning');
      expect(result.data.label).toBe('Hunt-Hess grade 3');
    });

    it('grade 4 is critical severity', async () => {
      const result = await service.execute({ grade: '4' });
      expect(result.data.severity).toBe('critical');
    });

    it('grade 5 is critical severity', async () => {
      const result = await service.execute({ grade: '5' });
      expect(result.data.severity).toBe('critical');
    });

    it('populates interpretation, citation, and disclaimer', async () => {
      const result = await service.execute({ grade: '3' });
      expect(result.interpretation).toContain('aneurysmal subarachnoid hemorrhage');
      expect(result.citations?.[0]?.reference).toContain('Hunt WE, Hess RM');
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
