/**
 * APACHE II Calculator Service Unit Tests
 */

import { Test, TestingModule } from '@nestjs/testing';
import { Apache2CalculatorService } from '../src/modules/medical-control-plane/tool-orchestrator/services/apache2-calculator.service';

const ALL_ZERO_COMPONENTS = {
  temperature: 0,
  map: 0,
  heartRate: 0,
  respiratoryRate: 0,
  oxygenation: 0,
  acidBase: 0,
  sodium: 0,
  potassium: 0,
  creatinine: 0,
  hematocrit: 0,
  wbc: 0,
  age: 0,
  chronicHealth: 0,
};

describe('Apache2CalculatorService', () => {
  let service: Apache2CalculatorService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [Apache2CalculatorService],
    }).compile();

    service = module.get<Apache2CalculatorService>(Apache2CalculatorService);
  });

  describe('getMetadata', () => {
    it('returns valid metadata', () => {
      expect(service.getMetadata().id).toBe('apache2-calculator');
    });
  });

  describe('getSchema', () => {
    it('returns 13 required components plus gcs, and an optional acuteRenalFailure flag', () => {
      const schema = service.getSchema();
      const names = schema.map((p) => p.name);
      expect(names).toContain('gcs');
      expect(names).toContain('acuteRenalFailure');
      expect(schema.find((p) => p.name === 'acuteRenalFailure')?.required).toBe(false);
      expect(schema.find((p) => p.name === 'gcs')?.required).toBe(true);
    });
  });

  describe('validate', () => {
    it('accepts all-zero components with a valid GCS', () => {
      const result = service.validate({ ...ALL_ZERO_COMPONENTS, gcs: 15 });
      expect(result.valid).toBe(true);
    });

    it('rejects a GCS outside 3-15', () => {
      const result = service.validate({ ...ALL_ZERO_COMPONENTS, gcs: 2 });
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('gcs must be a number between 3 and 15');
    });

    it('rejects a component point value above its max', () => {
      const result = service.validate({ ...ALL_ZERO_COMPONENTS, age: 7, gcs: 15 });
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('age must be a number between 0 and 6');
    });

    it('rejects missing components', () => {
      const { temperature: _temperature, ...rest } = ALL_ZERO_COMPONENTS;
      const result = service.validate({ ...rest, gcs: 15 });
      expect(result.valid).toBe(false);
    });
  });

  describe('execute — scoring', () => {
    it('scores 0 with all-zero components and a perfect GCS of 15', async () => {
      const result = await service.execute({ ...ALL_ZERO_COMPONENTS, gcs: 15 });
      expect(result.data.total).toBe(0);
      expect(result.data.gcsContribution).toBe(0);
      expect(result.data.riskCategory).toBe('lower');
    });

    it('GCS contribution is 15 minus the GCS total', async () => {
      const result = await service.execute({ ...ALL_ZERO_COMPONENTS, gcs: 10 });
      expect(result.data.gcsContribution).toBe(5);
      expect(result.data.total).toBe(5);
    });

    it('sums component points into the total', async () => {
      const result = await service.execute({
        ...ALL_ZERO_COMPONENTS,
        temperature: 4,
        heartRate: 3,
        gcs: 15,
      });
      expect(result.data.total).toBe(7);
    });

    it('acute renal failure doubles the creatinine point contribution', async () => {
      const withoutRenalFailure = await service.execute({
        ...ALL_ZERO_COMPONENTS,
        creatinine: 3,
        gcs: 15,
      });
      expect(withoutRenalFailure.data.total).toBe(3);
      expect(withoutRenalFailure.data.renalAdjustment).toBe(0);

      const withRenalFailure = await service.execute({
        ...ALL_ZERO_COMPONENTS,
        creatinine: 3,
        gcs: 15,
        acuteRenalFailure: true,
      });
      // base creatinine points (3, already summed into `selected`) + renalAdjustment (3 again) = 6
      expect(withRenalFailure.data.total).toBe(6);
      expect(withRenalFailure.data.renalAdjustment).toBe(3);
    });

    it('acutePhysiology subtracts age and chronicHealth points from the total', async () => {
      const result = await service.execute({
        ...ALL_ZERO_COMPONENTS,
        age: 6,
        chronicHealth: 5,
        gcs: 15,
      });
      expect(result.data.total).toBe(11);
      expect(result.data.acutePhysiology).toBe(0);
    });

    it('classifies score 10 as moderate (boundary)', async () => {
      const result = await service.execute({
        ...ALL_ZERO_COMPONENTS,
        age: 6,
        chronicHealth: 4,
        gcs: 15,
      });
      expect(result.data.total).toBe(10);
      expect(result.data.riskCategory).toBe('moderate');
    });

    it('classifies score 20 as high (boundary)', async () => {
      const result = await service.execute({
        ...ALL_ZERO_COMPONENTS,
        age: 6,
        chronicHealth: 5,
        temperature: 4,
        map: 4,
        heartRate: 1,
        gcs: 15,
      });
      expect(result.data.total).toBe(20);
      expect(result.data.riskCategory).toBe('high');
    });

    it('classifies score 30 as very_high (boundary)', async () => {
      const result = await service.execute({
        temperature: 4,
        map: 4,
        heartRate: 4,
        respiratoryRate: 4,
        oxygenation: 4,
        acidBase: 4,
        sodium: 0,
        potassium: 0,
        creatinine: 0,
        hematocrit: 0,
        wbc: 0,
        age: 6,
        chronicHealth: 0,
        gcs: 15,
      });
      expect(result.data.total).toBe(30);
      expect(result.data.riskCategory).toBe('very_high');
    });

    it('populates interpretation, citation, and warnings', async () => {
      const result = await service.execute({ ...ALL_ZERO_COMPONENTS, gcs: 15 });
      expect(result.interpretation).toContain('lower range');
      expect(result.citations?.[0]?.reference).toContain('Knaus WA');
      expect(result.warnings?.length).toBeGreaterThan(0);
    });

    it('fails execution when validation fails', async () => {
      const result = await service.execute({ ...ALL_ZERO_COMPONENTS, gcs: 1 });
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
