/**
 * PECARN Pediatric Head Injury Rule Service Unit Tests
 */

import { Test, TestingModule } from '@nestjs/testing';
import { PecarnHeadService } from '../src/modules/medical-control-plane/tool-orchestrator/services/pecarn-head.service';

describe('PecarnHeadService', () => {
  let service: PecarnHeadService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [PecarnHeadService],
    }).compile();

    service = module.get<PecarnHeadService>(PecarnHeadService);
  });

  describe('getMetadata', () => {
    it('returns valid metadata', () => {
      expect(service.getMetadata().id).toBe('pecarn-head');
    });
  });

  describe('validate', () => {
    it('rejects a missing/invalid ageCategory', () => {
      const result = service.validate({});
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('ageCategory must be "under_2" or "two_plus"');
    });
  });

  describe('execute — age-stratified criteria', () => {
    it('two_plus with no criteria is lower risk', async () => {
      const result = await service.execute({ ageCategory: 'two_plus' });
      expect(result.data.ruleCriteriaMet).toBe(false);
      expect(result.data.riskStratum).toBe('lower');
      expect(result.data.severity).toBe('normal');
      expect(result.data.triggeredCriteria).toEqual([]);
    });

    it('two_plus with vomiting is higher risk', async () => {
      const result = await service.execute({ ageCategory: 'two_plus', vomiting: true });
      expect(result.data.ruleCriteriaMet).toBe(true);
      expect(result.data.riskStratum).toBe('higher');
      expect(result.data.severity).toBe('warning');
      expect(result.data.triggeredCriteria).toEqual(['Vomiting']);
    });

    it('under_2 with loss of consciousness is higher risk', async () => {
      const result = await service.execute({ ageCategory: 'under_2', lossOfConsciousness: true });
      expect(result.data.ruleCriteriaMet).toBe(true);
      expect(result.data.riskStratum).toBe('higher');
      expect(result.data.triggeredCriteria).toEqual([
        'Loss of consciousness (>5 seconds in PECARN <2 years cohort)',
      ]);
    });

    it('under_2 does not check vomiting (age-stratified criteria are not shared)', async () => {
      const result = await service.execute({ ageCategory: 'under_2', vomiting: true });
      expect(result.data.ruleCriteriaMet).toBe(false);
      expect(result.data.riskStratum).toBe('lower');
    });

    it('two_plus does not check lossOfConsciousness (age-stratified criteria are not shared)', async () => {
      const result = await service.execute({ ageCategory: 'two_plus', lossOfConsciousness: true });
      expect(result.data.ruleCriteriaMet).toBe(false);
      expect(result.data.riskStratum).toBe('lower');
    });

    it('altered mental status triggers higher risk regardless of age category', async () => {
      const under2 = await service.execute({ ageCategory: 'under_2', alteredMentalStatus: true });
      const twoPlus = await service.execute({ ageCategory: 'two_plus', alteredMentalStatus: true });
      expect(under2.data.ruleCriteriaMet).toBe(true);
      expect(twoPlus.data.ruleCriteriaMet).toBe(true);
    });

    it('populates interpretation, citation, and disclaimer', async () => {
      const result = await service.execute({ ageCategory: 'two_plus', vomiting: true });
      expect(result.interpretation).toContain('PECARN age group');
      expect(result.citations?.[0]?.reference).toContain('Kuppermann N');
      expect(result.disclaimer).toContain('Does not recommend for or against head CT');
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
