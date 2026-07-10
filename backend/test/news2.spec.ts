/**
 * NEWS2 Calculator Service Unit Tests
 */

import { Test, TestingModule } from '@nestjs/testing';
import { News2Service } from '../src/modules/medical-control-plane/tool-orchestrator/services/news2.service';

const NORMAL = {
  respiratoryRate: 18,
  spo2: 97,
  spo2Scale: '1',
  supplementalOxygen: false,
  systolicBp: 120,
  pulse: 80,
  newConfusion: false,
  temperature: 37,
};

describe('News2Service', () => {
  let service: News2Service;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [News2Service],
    }).compile();

    service = module.get<News2Service>(News2Service);
  });

  describe('getMetadata', () => {
    it('returns valid metadata', () => {
      expect(service.getMetadata().id).toBe('news2');
    });
  });

  describe('validate', () => {
    it('accepts a fully normal observation set', () => {
      expect(service.validate(NORMAL).valid).toBe(true);
    });

    it('rejects an invalid spo2Scale', () => {
      const result = service.validate({ ...NORMAL, spo2Scale: '3' });
      expect(result.valid).toBe(false);
      expect(result.errors).toContain("spo2Scale must be '1' or '2'");
    });

    it('rejects out-of-range respiratory rate', () => {
      const result = service.validate({ ...NORMAL, respiratoryRate: 100 });
      expect(result.valid).toBe(false);
    });

    it('rejects missing required fields', () => {
      const { pulse: _pulse, ...rest } = NORMAL;
      const result = service.validate(rest);
      expect(result.valid).toBe(false);
    });
  });

  describe('execute — per-parameter scoring (Scale 1)', () => {
    it('scores all normal parameters as 0', async () => {
      const result = await service.execute(NORMAL);
      expect(result.data.total).toBe(0);
      expect(result.data.riskBand).toBe('low');
    });

    it.each([
      [8, 3],
      [9, 1],
      [11, 1],
      [12, 0],
      [20, 0],
      [21, 2],
      [24, 2],
      [25, 3],
    ])('respiratory rate %d -> score %d', async (rr, expected) => {
      const result = await service.execute({ ...NORMAL, respiratoryRate: rr });
      expect(result.data.breakdown.respiratoryRate).toBe(expected);
    });

    it.each([
      [91, 3],
      [93, 2],
      [95, 1],
      [96, 0],
    ])('SpO2 Scale 1 value %d -> score %d', async (spo2, expected) => {
      const result = await service.execute({ ...NORMAL, spo2 });
      expect(result.data.breakdown.spo2).toBe(expected);
    });

    it('supplemental oxygen adds 2 points', async () => {
      const result = await service.execute({ ...NORMAL, supplementalOxygen: true });
      expect(result.data.breakdown.supplementalOxygen).toBe(2);
      expect(result.data.total).toBe(2);
    });

    it.each([
      [90, 3],
      [100, 2],
      [110, 1],
      [219, 0],
      [220, 3],
    ])('systolic BP %d -> score %d', async (sbp, expected) => {
      const result = await service.execute({ ...NORMAL, systolicBp: sbp });
      expect(result.data.breakdown.systolicBp).toBe(expected);
    });

    it.each([
      [40, 3],
      [50, 1],
      [90, 0],
      [110, 1],
      [130, 2],
      [131, 3],
    ])('pulse %d -> score %d', async (pulse, expected) => {
      const result = await service.execute({ ...NORMAL, pulse });
      expect(result.data.breakdown.pulse).toBe(expected);
    });

    it('new confusion scores 3', async () => {
      const result = await service.execute({ ...NORMAL, newConfusion: true });
      expect(result.data.breakdown.consciousness).toBe(3);
    });

    it.each([
      [35.0, 3],
      [36.0, 1],
      [38.0, 0],
      [39.0, 1],
      [39.1, 2],
    ])('temperature %d -> score %d', async (temp, expected) => {
      const result = await service.execute({ ...NORMAL, temperature: temp });
      expect(result.data.breakdown.temperature).toBe(expected);
    });
  });

  describe('execute — SpO2 Scale 2', () => {
    it('scores 0 for 88-92% without supplemental oxygen', async () => {
      const result = await service.execute({
        ...NORMAL,
        spo2Scale: '2',
        spo2: 90,
        supplementalOxygen: false,
      });
      expect(result.data.breakdown.spo2).toBe(0);
    });

    it('scores 3 for <=83% regardless of oxygen', async () => {
      const result = await service.execute({ ...NORMAL, spo2Scale: '2', spo2: 82 });
      expect(result.data.breakdown.spo2).toBe(3);
    });

    it('scores higher for >92% while on supplemental oxygen (target-range breach)', async () => {
      const result = await service.execute({
        ...NORMAL,
        spo2Scale: '2',
        spo2: 97,
        supplementalOxygen: true,
      });
      expect(result.data.breakdown.spo2).toBe(3);
    });
  });

  describe('execute — risk banding', () => {
    it('classifies aggregate >=7 as high risk', async () => {
      const result = await service.execute({
        ...NORMAL,
        respiratoryRate: 25,
        systolicBp: 90,
        pulse: 135,
      });
      expect(result.data.total).toBeGreaterThanOrEqual(7);
      expect(result.data.riskBand).toBe('high');
    });

    it('classifies aggregate 5-6 as medium risk', async () => {
      const result = await service.execute({ ...NORMAL, respiratoryRate: 21, pulse: 131 });
      expect(result.data.total).toBe(5);
      expect(result.data.riskBand).toBe('medium');
    });

    it('flags a single red (score-3) parameter even with a low aggregate', async () => {
      const result = await service.execute({ ...NORMAL, newConfusion: true });
      expect(result.data.total).toBe(3);
      expect(result.data.riskBand).toBe('low_medium_red');
      expect(result.data.hasRed).toBe(true);
    });

    it('populates citation and disclaimer', async () => {
      const result = await service.execute(NORMAL);
      expect(result.citations?.[0]?.reference).toContain('Royal College of Physicians');
      expect(result.disclaimer).toContain('does not replace physician judgment');
    });

    it('fails execution when validation fails', async () => {
      const result = await service.execute({ ...NORMAL, spo2Scale: 'bad' });
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
