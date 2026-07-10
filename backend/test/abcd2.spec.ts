/**
 * ABCD2 Score Calculator Service Unit Tests
 */

import { Test, TestingModule } from '@nestjs/testing';
import { Abcd2Service } from '../src/modules/medical-control-plane/tool-orchestrator/services/abcd2.service';

const BASE = {
  age60OrOlder: false,
  systolicBpMmHg: 120,
  diastolicBpMmHg: 80,
  clinicalFeature: 'other',
  durationBand: 'under_10',
  diabetes: false,
};

describe('Abcd2Service', () => {
  let service: Abcd2Service;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [Abcd2Service],
    }).compile();

    service = module.get<Abcd2Service>(Abcd2Service);
  });

  describe('getMetadata', () => {
    it('returns valid metadata', () => {
      expect(service.getMetadata().id).toBe('abcd2');
    });
  });

  describe('validate', () => {
    it('accepts a minimal valid payload', () => {
      expect(service.validate(BASE).valid).toBe(true);
    });

    it('rejects an invalid clinicalFeature', () => {
      const result = service.validate({ ...BASE, clinicalFeature: 'unknown' });
      expect(result.valid).toBe(false);
    });

    it('rejects an invalid durationBand', () => {
      const result = service.validate({ ...BASE, durationBand: 'unknown' });
      expect(result.valid).toBe(false);
    });

    it('rejects negative blood pressure values', () => {
      const result = service.validate({ ...BASE, systolicBpMmHg: -5 });
      expect(result.valid).toBe(false);
    });
  });

  describe('execute — scoring table', () => {
    it('scores 0 with no risk factors present', async () => {
      const result = await service.execute(BASE);
      expect(result.data.score).toBe(0);
      expect(result.data.riskCategory).toBe('low');
    });

    it('age >=60 contributes 1 point', async () => {
      const result = await service.execute({ ...BASE, age60OrOlder: true });
      expect(result.data.score).toBe(1);
    });

    it('elevated blood pressure (SBP>=140 or DBP>=90) contributes 1 point', async () => {
      const result = await service.execute({ ...BASE, systolicBpMmHg: 145 });
      expect(result.data.score).toBe(1);
      const result2 = await service.execute({ ...BASE, diastolicBpMmHg: 92 });
      expect(result2.data.score).toBe(1);
    });

    it('speech disturbance contributes 1 point, unilateral weakness contributes 2', async () => {
      const speech = await service.execute({ ...BASE, clinicalFeature: 'speech_disturbance' });
      expect(speech.data.score).toBe(1);
      const weakness = await service.execute({ ...BASE, clinicalFeature: 'unilateral_weakness' });
      expect(weakness.data.score).toBe(2);
    });

    it('duration 10-59 min contributes 1 point, >=60 min contributes 2', async () => {
      const mid = await service.execute({ ...BASE, durationBand: 'ten_to_59' });
      expect(mid.data.score).toBe(1);
      const long = await service.execute({ ...BASE, durationBand: 'sixty_plus' });
      expect(long.data.score).toBe(2);
    });

    it('diabetes contributes 1 point', async () => {
      const result = await service.execute({ ...BASE, diabetes: true });
      expect(result.data.score).toBe(1);
    });

    it('classifies score 3 as low risk (boundary)', async () => {
      const result = await service.execute({
        ...BASE,
        age60OrOlder: true,
        clinicalFeature: 'speech_disturbance',
        durationBand: 'ten_to_59',
      });
      expect(result.data.score).toBe(3);
      expect(result.data.riskCategory).toBe('low');
    });

    it('classifies score 4 as moderate risk (boundary)', async () => {
      const result = await service.execute({
        ...BASE,
        age60OrOlder: true,
        diabetes: true,
        clinicalFeature: 'speech_disturbance',
        durationBand: 'ten_to_59',
      });
      expect(result.data.score).toBe(4);
      expect(result.data.riskCategory).toBe('moderate');
    });

    it('classifies score 6 as high risk (boundary)', async () => {
      const result = await service.execute({
        age60OrOlder: true,
        systolicBpMmHg: 150,
        diastolicBpMmHg: 95,
        clinicalFeature: 'unilateral_weakness',
        durationBand: 'ten_to_59',
        diabetes: true,
      });
      expect(result.data.score).toBe(6);
      expect(result.data.riskCategory).toBe('high');
    });

    it('reaches the maximum score of 7 with every risk factor present', async () => {
      const result = await service.execute({
        age60OrOlder: true,
        systolicBpMmHg: 150,
        diastolicBpMmHg: 95,
        clinicalFeature: 'unilateral_weakness',
        durationBand: 'sixty_plus',
        diabetes: true,
      });
      expect(result.data.score).toBe(7);
      expect(result.data.riskCategory).toBe('high');
      expect(result.data.strokeRiskContext).toContain('~11%');
    });

    it('populates interpretation, citation, and disclaimer', async () => {
      const result = await service.execute(BASE);
      expect(result.interpretation).toContain('lower short-term stroke-risk stratum');
      expect(result.citations?.[0]?.reference).toContain('Johnston SC');
      expect(result.disclaimer).toContain('activate emergency stroke pathways immediately');
    });

    it('fails execution when validation fails', async () => {
      const result = await service.execute({ ...BASE, clinicalFeature: 'bad' });
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
