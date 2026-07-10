/**
 * Framingham Risk Score Calculator Service Unit Tests
 */

import { Test, TestingModule } from '@nestjs/testing';
import { FraminghamRiskService } from '../src/modules/medical-control-plane/tool-orchestrator/services/framingham-risk.service';

const BASE = {
  ageYears: 40,
  sex: 'male',
  totalCholesterolMgDl: 180,
  hdlCholesterolMgDl: 60,
  systolicBpMmHg: 110,
  onHypertensionTreatment: false,
  smoker: false,
};

describe('FraminghamRiskService', () => {
  let service: FraminghamRiskService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [FraminghamRiskService],
    }).compile();

    service = module.get<FraminghamRiskService>(FraminghamRiskService);
  });

  describe('getMetadata', () => {
    it('returns valid metadata', () => {
      expect(service.getMetadata().id).toBe('framingham-risk');
    });
  });

  describe('validate', () => {
    it('accepts a valid payload', () => {
      expect(service.validate(BASE).valid).toBe(true);
    });

    it('rejects age outside 30-74', () => {
      const result = service.validate({ ...BASE, ageYears: 20 });
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('ageYears must be 30-74 for this Framingham table');
    });

    it('rejects an invalid sex', () => {
      expect(service.validate({ ...BASE, sex: 'other' }).valid).toBe(false);
    });
  });

  describe('execute — point tables and risk category', () => {
    it('computes a low-risk profile as < 10%', async () => {
      const result = await service.execute(BASE);
      expect(result.data.tenYearRiskPct).toBeLessThan(10);
      expect(result.data.riskBand).toBe('< 10% 10-year hard CHD risk');
    });

    it('matches the known male example (age 55, TC 213, HDL 50, SBP 130 untreated -> 11 points, 8% risk)', async () => {
      const result = await service.execute({
        ageYears: 55,
        sex: 'male',
        totalCholesterolMgDl: 213,
        hdlCholesterolMgDl: 50,
        systolicBpMmHg: 130,
        onHypertensionTreatment: false,
        smoker: false,
      });
      expect(result.data.totalPoints).toBe(11);
      expect(result.data.tenYearRiskPct).toBe(8);
    });

    it('HDL >= 60 contributes -1 points (protective)', async () => {
      const withHighHdl = await service.execute({ ...BASE, hdlCholesterolMgDl: 65 });
      const withLowerHdl = await service.execute({ ...BASE, hdlCholesterolMgDl: 45 });
      expect(withHighHdl.data.breakdown.hdl).toBe(-1);
      expect(withLowerHdl.data.breakdown.hdl).toBe(1);
      expect(withHighHdl.data.totalPoints).toBeLessThan(withLowerHdl.data.totalPoints);
    });

    it('smoking contributes 2 points', async () => {
      const smoker = await service.execute({ ...BASE, smoker: true });
      const nonSmoker = await service.execute(BASE);
      expect(smoker.data.totalPoints).toBe(nonSmoker.data.totalPoints + 2);
    });

    it('a high-burden older profile reaches the >= 20% high-risk band', async () => {
      const result = await service.execute({
        ageYears: 70,
        sex: 'male',
        totalCholesterolMgDl: 280,
        hdlCholesterolMgDl: 30,
        systolicBpMmHg: 170,
        onHypertensionTreatment: true,
        smoker: true,
      });
      expect(result.data.tenYearRiskPct).toBeGreaterThanOrEqual(20);
      expect(result.data.riskBand).toBe('>= 20% 10-year hard CHD risk');
    });

    it('populates interpretation, citation, and disclaimer', async () => {
      const result = await service.execute(BASE);
      expect(result.interpretation).toContain('Lower 10-year hard CHD risk');
      expect(result.citations?.[0]?.reference).toContain('Wilson PWF');
      expect(result.disclaimer).toContain('not full ASCVD PCE');
    });

    it('fails execution when validation fails', async () => {
      const result = await service.execute({ ...BASE, ageYears: 100 });
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
