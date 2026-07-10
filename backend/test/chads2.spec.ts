/**
 * CHADS2 Calculator Service Unit Tests
 */

import { Test, TestingModule } from '@nestjs/testing';
import { Chads2Service } from '../src/modules/medical-control-plane/tool-orchestrator/services/chads2.service';

describe('Chads2Service', () => {
  let service: Chads2Service;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [Chads2Service],
    }).compile();

    service = module.get<Chads2Service>(Chads2Service);
  });

  describe('getMetadata', () => {
    it('returns valid metadata', () => {
      expect(service.getMetadata().id).toBe('chads2');
    });
  });

  describe('getSchema', () => {
    it('returns all 5 criteria as optional booleans', () => {
      const schema = service.getSchema();
      expect(schema).toHaveLength(5);
      expect(schema.every((p) => p.type === 'boolean' && !p.required)).toBe(true);
    });
  });

  describe('validate', () => {
    it('accepts an empty payload', () => {
      expect(service.validate({}).valid).toBe(true);
    });
  });

  describe('execute — scoring table', () => {
    it('scores 0 with no criteria present', async () => {
      const result = await service.execute({});
      expect(result.data.score).toBe(0);
      expect(result.data.riskBand).toBe('0 points');
    });

    it('congestiveHeartFailure/hypertension/age75OrOlder/diabetes each contribute 1 point', async () => {
      const result = await service.execute({ congestiveHeartFailure: true });
      expect(result.data.score).toBe(1);
      expect(result.data.riskBand).toBe('1-2 points');
    });

    it('strokeTia contributes 2 points', async () => {
      const result = await service.execute({ strokeTia: true });
      expect(result.data.score).toBe(2);
      expect(result.data.riskBand).toBe('1-2 points');
    });

    it('classifies score of 3 as higher risk band (boundary)', async () => {
      const result = await service.execute({ strokeTia: true, hypertension: true });
      expect(result.data.score).toBe(3);
      expect(result.data.riskBand).toBe('3-6 points');
    });

    it('reaches the maximum score of 6 with all criteria present', async () => {
      const result = await service.execute({
        congestiveHeartFailure: true,
        hypertension: true,
        age75OrOlder: true,
        diabetes: true,
        strokeTia: true,
      });
      expect(result.data.score).toBe(6);
      expect(result.data.riskBand).toBe('3-6 points');
    });

    it('populates a per-criterion breakdown', async () => {
      const result = await service.execute({ strokeTia: true });
      expect(result.data.breakdown.strokeTia).toBe(2);
      expect(result.data.breakdown.hypertension).toBe(0);
    });

    it('populates interpretation, citation, and disclaimer', async () => {
      const result = await service.execute({});
      expect(result.interpretation).toContain('lower risk in the original cohort');
      expect(result.citations?.[0]?.reference).toContain('Gage BF');
      expect(result.disclaimer).toContain('older AF stroke-risk score');
    });
  });

  describe('getExample', () => {
    it('returns a valid example payload', () => {
      const example = service.getExample?.();
      expect(service.validate(example!).valid).toBe(true);
    });
  });
});
