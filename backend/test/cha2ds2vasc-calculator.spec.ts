/**
 * CHA2DS2-VASc Calculator Service Unit Tests
 */

import { Test, TestingModule } from '@nestjs/testing';
import { Cha2ds2VascCalculatorService } from '../src/modules/medical-control-plane/tool-orchestrator/services/cha2ds2vasc-calculator.service';

describe('Cha2ds2VascCalculatorService', () => {
  let service: Cha2ds2VascCalculatorService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [Cha2ds2VascCalculatorService],
    }).compile();

    service = module.get<Cha2ds2VascCalculatorService>(Cha2ds2VascCalculatorService);
  });

  describe('getMetadata', () => {
    it('returns valid metadata', () => {
      const metadata = service.getMetadata();
      expect(metadata.id).toBe('cha2ds2vasc-calculator');
      expect(metadata.category).toBe('calculator');
      expect(metadata.references?.length).toBeGreaterThan(0);
    });
  });

  describe('getSchema', () => {
    it('marks age and sex as required, others optional', () => {
      const schema = service.getSchema();
      const byName = Object.fromEntries(schema.map((p) => [p.name, p]));
      expect(byName.age.required).toBe(true);
      expect(byName.sex.required).toBe(true);
      expect(byName.chf.required).toBe(false);
    });
  });

  describe('validate', () => {
    it('accepts a minimal valid payload', () => {
      const result = service.validate({ age: 50, sex: 'male' });
      expect(result.valid).toBe(true);
    });

    it('rejects missing age', () => {
      const result = service.validate({ sex: 'male' });
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('age must be a valid number');
    });

    it('rejects invalid sex', () => {
      const result = service.validate({ age: 50, sex: 'unknown' });
      expect(result.valid).toBe(false);
      expect(result.errors).toContain("sex must be 'male' or 'female'");
    });
  });

  describe('execute — scoring table', () => {
    it('scores 0 for a low-risk young male with no risk factors', async () => {
      const result = await service.execute({ age: 40, sex: 'male' });
      expect(result.data.score).toBe(0);
      expect(result.interpretation).toContain('Low estimated stroke risk');
    });

    it('female sex alone contributes 1 point', async () => {
      const result = await service.execute({ age: 40, sex: 'female' });
      expect(result.data.score).toBe(1);
    });

    it('age 65-74 contributes 1 point', async () => {
      const result = await service.execute({ age: 70, sex: 'male' });
      expect(result.data.score).toBe(1);
    });

    it('age >=75 contributes 2 points', async () => {
      const result = await service.execute({ age: 80, sex: 'male' });
      expect(result.data.score).toBe(2);
    });

    it('prior stroke contributes 2 points', async () => {
      const result = await service.execute({ age: 40, sex: 'male', stroke: true });
      expect(result.data.score).toBe(2);
    });

    it('CHF, hypertension, diabetes, vascular disease each contribute 1 point', async () => {
      const result = await service.execute({
        age: 40,
        sex: 'male',
        chf: true,
        hypertension: true,
        diabetes: true,
        vascular: true,
      });
      expect(result.data.score).toBe(4);
    });

    it('full risk-factor combination reaches the maximum score of 9', async () => {
      const result = await service.execute({
        age: 80,
        sex: 'female',
        chf: true,
        hypertension: true,
        diabetes: true,
        stroke: true,
        vascular: true,
      });
      expect(result.data.score).toBe(9);
      expect(result.interpretation).toContain('High estimated stroke risk');
      expect(result.data.severity).toBe('critical');
    });

    it('score of 2 is classified as moderate/warning', async () => {
      const result = await service.execute({
        age: 40,
        sex: 'male',
        hypertension: true,
        diabetes: true,
      });
      expect(result.data.score).toBe(2);
      expect(result.interpretation).toContain('Moderate estimated stroke risk');
      expect(result.data.severity).toBe('warning');
    });

    it('populates citations and disclaimer', async () => {
      const result = await service.execute({ age: 40, sex: 'male' });
      expect(result.citations?.[0]?.reference).toContain('Lip GY');
      expect(result.disclaimer).toContain('does not recommend for or against anticoagulation');
    });

    it('fails execution when validation fails', async () => {
      const result = await service.execute({ sex: 'male' });
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
