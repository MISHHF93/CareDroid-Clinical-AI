/**
 * Wells PE Calculator Service Unit Tests
 */

import { Test, TestingModule } from '@nestjs/testing';
import { WellsPeService } from '../src/modules/medical-control-plane/tool-orchestrator/services/wells-pe.service';

const ALL_FALSE = {
  clinicalDvtSigns: false,
  peMostLikelyDiagnosis: false,
  heartRateOver100: false,
  immobilizationOrSurgery: false,
  previousDvtOrPe: false,
  hemoptysis: false,
  malignancy: false,
};

describe('WellsPeService', () => {
  let service: WellsPeService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [WellsPeService],
    }).compile();

    service = module.get<WellsPeService>(WellsPeService);
  });

  describe('getMetadata', () => {
    it('returns valid metadata', () => {
      const metadata = service.getMetadata();
      expect(metadata.id).toBe('wells-pe');
      expect(metadata.references?.length).toBe(2);
    });
  });

  describe('getSchema', () => {
    it('returns all 7 criteria as required booleans', () => {
      const schema = service.getSchema();
      expect(schema).toHaveLength(7);
      expect(schema.every((p) => p.type === 'boolean' && p.required)).toBe(true);
    });
  });

  describe('validate', () => {
    it('accepts all-false payload', () => {
      expect(service.validate(ALL_FALSE).valid).toBe(true);
    });

    it('rejects missing criteria', () => {
      const { clinicalDvtSigns: _clinicalDvtSigns, ...rest } = ALL_FALSE;
      const result = service.validate(rest);
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('clinicalDvtSigns must be a boolean');
    });

    it('rejects non-boolean values', () => {
      const result = service.validate({ ...ALL_FALSE, hemoptysis: 'yes' });
      expect(result.valid).toBe(false);
    });
  });

  describe('execute — scoring table', () => {
    it('scores 0 with no criteria present', async () => {
      const result = await service.execute(ALL_FALSE);
      expect(result.data.score).toBe(0);
      expect(result.data.probabilityBand).toBe('Low probability');
    });

    it('scores 3 for clinicalDvtSigns alone', async () => {
      const result = await service.execute({ ...ALL_FALSE, clinicalDvtSigns: true });
      expect(result.data.score).toBe(3);
    });

    it('scores 3 for peMostLikelyDiagnosis alone', async () => {
      const result = await service.execute({ ...ALL_FALSE, peMostLikelyDiagnosis: true });
      expect(result.data.score).toBe(3);
    });

    it('scores 1.5 for heartRateOver100 alone', async () => {
      const result = await service.execute({ ...ALL_FALSE, heartRateOver100: true });
      expect(result.data.score).toBe(1.5);
    });

    it('scores 1 for hemoptysis or malignancy alone', async () => {
      const result = await service.execute({ ...ALL_FALSE, hemoptysis: true });
      expect(result.data.score).toBe(1);
    });

    it('classifies score of exactly 4 as low probability (boundary is exclusive)', async () => {
      const result = await service.execute({
        ...ALL_FALSE,
        hemoptysis: true,
        heartRateOver100: true,
        immobilizationOrSurgery: true,
      });
      expect(result.data.score).toBe(4);
      expect(result.data.probabilityBand).toBe('Low probability');
    });

    it('classifies score of 4.5 as intermediate probability', async () => {
      const result = await service.execute({
        ...ALL_FALSE,
        heartRateOver100: true,
        immobilizationOrSurgery: true,
        previousDvtOrPe: true,
      });
      expect(result.data.score).toBe(4.5);
      expect(result.data.probabilityBand).toBe('Intermediate probability');
    });

    it('classifies score above 6 as high probability', async () => {
      const result = await service.execute({
        ...ALL_FALSE,
        clinicalDvtSigns: true,
        peMostLikelyDiagnosis: true,
        heartRateOver100: true,
      });
      expect(result.data.score).toBe(7.5);
      expect(result.data.probabilityBand).toBe('High probability');
    });

    it('reaches the maximum score of 12.5 with all criteria present', async () => {
      const result = await service.execute({
        clinicalDvtSigns: true,
        peMostLikelyDiagnosis: true,
        heartRateOver100: true,
        immobilizationOrSurgery: true,
        previousDvtOrPe: true,
        hemoptysis: true,
        malignancy: true,
      });
      expect(result.data.score).toBe(12.5);
      expect(result.data.probabilityBand).toBe('High probability');
    });

    it('populates a per-criterion breakdown', async () => {
      const result = await service.execute({ ...ALL_FALSE, hemoptysis: true });
      expect(result.data.breakdown.hemoptysis).toBe(1);
      expect(result.data.breakdown.malignancy).toBe(0);
    });

    it('populates citations and the diagnostic disclaimer', async () => {
      const result = await service.execute(ALL_FALSE);
      expect(result.citations).toHaveLength(2);
      expect(result.disclaimer).toContain('does not rule in or rule out pulmonary embolism');
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
