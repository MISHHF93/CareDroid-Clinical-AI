/**
 * HEART Score Calculator Service Unit Tests
 *
 * Covers chest-pain risk stratification scoring, validation, and
 * risk-category interpretation banding.
 */

import { Test, TestingModule } from '@nestjs/testing';
import { HeartScoreService } from '../src/modules/medical-control-plane/tool-orchestrator/services/heart-score.service';

describe('HeartScoreService', () => {
  let service: HeartScoreService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [HeartScoreService],
    }).compile();

    service = module.get<HeartScoreService>(HeartScoreService);
  });

  describe('getMetadata', () => {
    it('returns valid HEART score metadata', () => {
      const metadata = service.getMetadata();
      expect(metadata.id).toBe('heart-score');
      expect(metadata.name).toBe('HEART Score');
      expect(metadata.category).toBe('calculator');
      expect(metadata.version).toBe('1.0.0');
      expect(metadata.references?.length).toBeGreaterThan(0);
    });
  });

  describe('getSchema', () => {
    it('returns all 5 HEART dimensions, all required, 0-2 range', () => {
      const schema = service.getSchema();
      expect(schema).toHaveLength(5);
      const names = schema.map((p) => p.name);
      expect(names).toEqual(['history', 'ecg', 'age', 'riskFactors', 'troponin']);
      expect(schema.every((p) => p.required)).toBe(true);
      expect(schema.every((p) => p.validation?.min === 0 && p.validation?.max === 2)).toBe(true);
    });
  });

  describe('validate', () => {
    it('accepts all dimensions at 0', () => {
      const result = service.validate({ history: 0, ecg: 0, age: 0, riskFactors: 0, troponin: 0 });
      expect(result.valid).toBe(true);
      expect(result.errors).toEqual([]);
    });

    it('accepts all dimensions at 2', () => {
      const result = service.validate({ history: 2, ecg: 2, age: 2, riskFactors: 2, troponin: 2 });
      expect(result.valid).toBe(true);
    });

    it('rejects missing dimensions', () => {
      const result = service.validate({ history: 1, ecg: 1, age: 1, riskFactors: 1 });
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('troponin must be a score of 0, 1, or 2');
    });

    it('rejects out-of-range values (negative)', () => {
      const result = service.validate({ history: -1, ecg: 0, age: 0, riskFactors: 0, troponin: 0 });
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('history must be a score of 0, 1, or 2');
    });

    it('rejects out-of-range values (> 2)', () => {
      const result = service.validate({ history: 0, ecg: 3, age: 0, riskFactors: 0, troponin: 0 });
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('ecg must be a score of 0, 1, or 2');
    });

    it('rejects non-numeric values', () => {
      const result = service.validate({
        history: 'high',
        ecg: 0,
        age: 0,
        riskFactors: 0,
        troponin: 0,
      });
      expect(result.valid).toBe(false);
    });
  });

  describe('execute — scoring and risk bands', () => {
    it('sums all 5 dimensions correctly (score 0)', async () => {
      const result = await service.execute({
        history: 0,
        ecg: 0,
        age: 0,
        riskFactors: 0,
        troponin: 0,
      });
      expect(result.success).toBe(true);
      expect(result.data.totalScore).toBe(0);
      expect(result.data.riskCategory).toBe('low');
    });

    it('sums all 5 dimensions correctly (score 10, max)', async () => {
      const result = await service.execute({
        history: 2,
        ecg: 2,
        age: 2,
        riskFactors: 2,
        troponin: 2,
      });
      expect(result.data.totalScore).toBe(10);
      expect(result.data.riskCategory).toBe('high');
    });

    it('classifies score 3 as low risk (boundary)', async () => {
      const result = await service.execute({
        history: 1,
        ecg: 1,
        age: 1,
        riskFactors: 0,
        troponin: 0,
      });
      expect(result.data.totalScore).toBe(3);
      expect(result.data.riskCategory).toBe('low');
    });

    it('classifies score 4 as intermediate risk (boundary)', async () => {
      const result = await service.execute({
        history: 1,
        ecg: 1,
        age: 1,
        riskFactors: 1,
        troponin: 0,
      });
      expect(result.data.totalScore).toBe(4);
      expect(result.data.riskCategory).toBe('intermediate');
    });

    it('classifies score 6 as intermediate risk (boundary)', async () => {
      const result = await service.execute({
        history: 2,
        ecg: 1,
        age: 1,
        riskFactors: 1,
        troponin: 1,
      });
      expect(result.data.totalScore).toBe(6);
      expect(result.data.riskCategory).toBe('intermediate');
    });

    it('classifies score 7 as high risk (boundary)', async () => {
      const result = await service.execute({
        history: 2,
        ecg: 2,
        age: 1,
        riskFactors: 1,
        troponin: 1,
      });
      expect(result.data.totalScore).toBe(7);
      expect(result.data.riskCategory).toBe('high');
    });

    it('populates interpretation, citations, and disclaimer', async () => {
      const result = await service.execute({
        history: 2,
        ecg: 2,
        age: 2,
        riskFactors: 2,
        troponin: 2,
      });
      expect(result.interpretation).toContain('high-risk stratum');
      expect(result.citations?.[0]?.reference).toContain('Six AJ');
      expect(result.disclaimer).toContain('Clinical decision support only');
      expect(result.timestamp).toBeInstanceOf(Date);
    });

    it('fails execution with validation errors when inputs are invalid', async () => {
      const result = await service.execute({
        history: 5,
        ecg: 0,
        age: 0,
        riskFactors: 0,
        troponin: 0,
      });
      expect(result.success).toBe(false);
      expect(result.errors?.length).toBeGreaterThan(0);
      expect(result.data).toEqual({});
    });
  });

  describe('getExample', () => {
    it('returns a valid example payload', () => {
      const example = service.getExample?.();
      expect(example).toBeDefined();
      const validation = service.validate(example!);
      expect(validation.valid).toBe(true);
    });
  });
});
