/**
 * HAS-BLED Calculator Service Unit Tests
 */

import { Test, TestingModule } from '@nestjs/testing';
import { HasBledService } from '../src/modules/medical-control-plane/tool-orchestrator/services/has-bled.service';

const ALL_FALSE = {
  hypertension: false,
  renalDysfunction: false,
  liverDysfunction: false,
  strokeHistory: false,
  bleedingHistory: false,
  labileInr: false,
  ageOver65: false,
  bleedingPredisposingDrugs: false,
  alcoholUse: false,
};

describe('HasBledService', () => {
  let service: HasBledService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [HasBledService],
    }).compile();

    service = module.get<HasBledService>(HasBledService);
  });

  describe('getMetadata', () => {
    it('returns valid metadata', () => {
      expect(service.getMetadata().id).toBe('has-bled');
    });
  });

  describe('getSchema', () => {
    it('returns all 9 criteria as required booleans', () => {
      const schema = service.getSchema();
      expect(schema).toHaveLength(9);
      expect(schema.every((p) => p.type === 'boolean' && p.required)).toBe(true);
    });
  });

  describe('validate', () => {
    it('accepts an all-false payload', () => {
      expect(service.validate(ALL_FALSE).valid).toBe(true);
    });

    it('rejects missing criteria', () => {
      const { hypertension: _hypertension, ...rest } = ALL_FALSE;
      const result = service.validate(rest);
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('hypertension must be a boolean');
    });
  });

  describe('execute — scoring and elevated-risk threshold', () => {
    it('scores 0 with no criteria present', async () => {
      const result = await service.execute(ALL_FALSE);
      expect(result.data.total).toBe(0);
      expect(result.data.elevated).toBe(false);
    });

    it('each criterion contributes exactly 1 point', async () => {
      const result = await service.execute({ ...ALL_FALSE, hypertension: true });
      expect(result.data.total).toBe(1);
      expect(result.data.breakdown.hypertension).toBe(1);
    });

    it('classifies a score of 2 as not elevated (boundary)', async () => {
      const result = await service.execute({ ...ALL_FALSE, hypertension: true, ageOver65: true });
      expect(result.data.total).toBe(2);
      expect(result.data.elevated).toBe(false);
    });

    it('classifies a score of 3 as elevated (boundary)', async () => {
      const result = await service.execute({
        ...ALL_FALSE,
        hypertension: true,
        ageOver65: true,
        alcoholUse: true,
      });
      expect(result.data.total).toBe(3);
      expect(result.data.elevated).toBe(true);
    });

    it('reaches the maximum score of 9 with all criteria present', async () => {
      const result = await service.execute({
        hypertension: true,
        renalDysfunction: true,
        liverDysfunction: true,
        strokeHistory: true,
        bleedingHistory: true,
        labileInr: true,
        ageOver65: true,
        bleedingPredisposingDrugs: true,
        alcoholUse: true,
      });
      expect(result.data.total).toBe(9);
      expect(result.data.elevated).toBe(true);
    });

    it('populates interpretation, citation, and disclaimer', async () => {
      const result = await service.execute(ALL_FALSE);
      expect(result.interpretation).toContain('lower bleeding risk');
      expect(result.citations?.[0]?.reference).toContain('Pisters R');
      expect(result.disclaimer).toContain('Bleeding-risk documentation only');
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
