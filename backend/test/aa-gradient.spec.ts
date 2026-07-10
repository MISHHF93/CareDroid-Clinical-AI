/**
 * A-a Gradient Calculator Service Unit Tests
 */

import { Test, TestingModule } from '@nestjs/testing';
import { AaGradientService } from '../src/modules/medical-control-plane/tool-orchestrator/services/aa-gradient.service';

describe('AaGradientService', () => {
  let service: AaGradientService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [AaGradientService],
    }).compile();

    service = module.get<AaGradientService>(AaGradientService);
  });

  describe('getMetadata', () => {
    it('returns valid metadata', () => {
      expect(service.getMetadata().id).toBe('aa-gradient');
    });
  });

  describe('validate', () => {
    it('accepts required fields with defaulted atm pressure/RQ', () => {
      const result = service.validate({ ageYears: 40, fio2Pct: 21, pao2MmHg: 90, paco2MmHg: 40 });
      expect(result.valid).toBe(true);
    });

    it('rejects fio2Pct out of range', () => {
      const result = service.validate({ ageYears: 40, fio2Pct: 10, pao2MmHg: 90, paco2MmHg: 40 });
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('fio2Pct must be between 21 and 100');
    });

    it('rejects missing required fields', () => {
      const result = service.validate({ ageYears: 40, fio2Pct: 21 });
      expect(result.valid).toBe(false);
    });
  });

  describe('execute — alveolar gas equation', () => {
    it('calculates room-air gradient for a healthy adult (not elevated)', async () => {
      const result = await service.execute({
        ageYears: 40,
        fio2Pct: 21,
        pao2MmHg: 90,
        paco2MmHg: 40,
      });
      expect(result.data.alveolarOxygen).toBe(99.7);
      expect(result.data.gradient).toBe(9.7);
      expect(result.data.expectedUpperLimit).toBe(14);
      expect(result.data.elevated).toBe(false);
    });

    it('flags an elevated gradient for a hypoxemic patient', async () => {
      const result = await service.execute({
        ageYears: 40,
        fio2Pct: 21,
        pao2MmHg: 60,
        paco2MmHg: 40,
      });
      expect(result.data.gradient).toBe(39.7);
      expect(result.data.elevated).toBe(true);
      expect(result.interpretation).toContain('above the age-adjusted expected upper limit');
    });

    it('uses the default atmospheric pressure of 760 and RQ of 0.8 when omitted', async () => {
      const withDefaults = await service.execute({
        ageYears: 40,
        fio2Pct: 21,
        pao2MmHg: 90,
        paco2MmHg: 40,
      });
      const withExplicit = await service.execute({
        ageYears: 40,
        fio2Pct: 21,
        pao2MmHg: 90,
        paco2MmHg: 40,
        atmosphericPressureMmHg: 760,
        respiratoryQuotient: 0.8,
      });
      expect(withDefaults.data).toEqual(withExplicit.data);
    });

    it('expected upper limit scales with age (age/4 + 4)', async () => {
      const result = await service.execute({
        ageYears: 80,
        fio2Pct: 21,
        pao2MmHg: 90,
        paco2MmHg: 40,
      });
      expect(result.data.expectedUpperLimit).toBe(24);
    });

    it('populates citation and disclaimer', async () => {
      const result = await service.execute({
        ageYears: 40,
        fio2Pct: 21,
        pao2MmHg: 90,
        paco2MmHg: 40,
      });
      expect(result.citations?.[0]?.reference).toContain('PAO2 = FiO2');
      expect(result.disclaimer).toContain('does not diagnose PE, shunt');
    });

    it('fails execution when validation fails', async () => {
      const result = await service.execute({ ageYears: 40, fio2Pct: 21 });
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
