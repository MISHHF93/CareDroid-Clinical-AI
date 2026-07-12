/**
 * ICH Score Calculator Service Unit Tests
 */

import { Test, TestingModule } from '@nestjs/testing';
import { IchScoreService } from '../src/modules/medical-control-plane/tool-orchestrator/services/ich-score.service';

describe('IchScoreService', () => {
  let service: IchScoreService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [IchScoreService],
    }).compile();

    service = module.get<IchScoreService>(IchScoreService);
  });

  describe('getMetadata', () => {
    it('returns valid metadata', () => {
      expect(service.getMetadata().id).toBe('ich-score');
    });
  });

  describe('validate', () => {
    it('rejects missing required fields', () => {
      const result = service.validate({ age: 65 });
      expect(result.valid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
    });
  });

  describe('execute — component points and banding', () => {
    it('calculates a normal-severity score (age 65, GCS 10, 20mL, no IVH, no infratentorial -> 1)', async () => {
      const result = await service.execute({
        age: 65,
        gcs: 10,
        volumeMl: 20,
        intraventricularHemorrhage: 'no',
        infratentorialOrigin: 'no',
      });
      expect(result.data.score).toBe(1);
      expect(result.data.components).toEqual({
        gcsPoints: 1,
        volumePoints: 0,
        ivhPoints: 0,
        infratentorialPoints: 0,
        agePoints: 0,
      });
      expect(result.data.severity).toBe('normal');
    });

    it('calculates a warning-severity score (2 points)', async () => {
      const result = await service.execute({
        age: 50,
        gcs: 10,
        volumeMl: 35,
        intraventricularHemorrhage: 'no',
        infratentorialOrigin: 'no',
      });
      expect(result.data.score).toBe(2);
      expect(result.data.severity).toBe('warning');
    });

    it('calculates a critical-severity score for the worst-coded inputs (6 points)', async () => {
      const result = await service.execute({
        age: 85,
        gcs: 3,
        volumeMl: 40,
        intraventricularHemorrhage: 'yes',
        infratentorialOrigin: 'yes',
      });
      expect(result.data.score).toBe(6);
      expect(result.data.components).toEqual({
        gcsPoints: 2,
        volumePoints: 1,
        ivhPoints: 1,
        infratentorialPoints: 1,
        agePoints: 1,
      });
      expect(result.data.severity).toBe('critical');
    });

    it('populates interpretation, citation, and disclaimer', async () => {
      const result = await service.execute({
        age: 65,
        gcs: 10,
        volumeMl: 20,
        intraventricularHemorrhage: 'no',
        infratentorialOrigin: 'no',
      });
      expect(result.interpretation).toContain('spontaneous intracerebral hemorrhage');
      expect(result.citations?.[0]?.reference).toContain('Hemphill JC III');
      expect(result.disclaimer).toContain('Do not delay emergency stroke activation');
    });

    it('fails execution when validation fails', async () => {
      const result = await service.execute({ age: 65 });
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
