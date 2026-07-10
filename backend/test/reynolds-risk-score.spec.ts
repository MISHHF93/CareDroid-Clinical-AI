/**
 * Reynolds Risk Score Calculator Service Unit Tests
 */

import { Test, TestingModule } from '@nestjs/testing';
import { ReynoldsRiskScoreService } from '../src/modules/medical-control-plane/tool-orchestrator/services/reynolds-risk-score.service';

const BASE = {
  ageYears: 50,
  sex: 'female',
  systolicBpMmHg: 110,
  totalCholesterolMgDl: 180,
  hdlCholesterolMgDl: 60,
  hsCrpMgL: 0.5,
  smoker: false,
  parentalMiBefore60: false,
  diabetes: false,
};

describe('ReynoldsRiskScoreService', () => {
  let service: ReynoldsRiskScoreService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [ReynoldsRiskScoreService],
    }).compile();

    service = module.get<ReynoldsRiskScoreService>(ReynoldsRiskScoreService);
  });

  describe('getMetadata', () => {
    it('returns valid metadata', () => {
      expect(service.getMetadata().id).toBe('reynolds-risk-score');
    });
  });

  describe('validate', () => {
    it('accepts a minimal valid payload', () => {
      expect(service.validate(BASE).valid).toBe(true);
    });

    it('rejects age outside 45-80', () => {
      const result = service.validate({ ...BASE, ageYears: 30 });
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('ageYears must be between 45 and 80');
    });

    it('requires hba1cPct when diabetes is true', () => {
      const result = service.validate({ ...BASE, diabetes: true });
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('hba1cPct must be between 4 and 15 when diabetes is true');
    });

    it('accepts diabetes with a valid hba1cPct', () => {
      const result = service.validate({ ...BASE, diabetes: true, hba1cPct: 6.5 });
      expect(result.valid).toBe(true);
    });
  });

  describe('execute — points and risk category', () => {
    it('scores a low-risk profile as low', async () => {
      const result = await service.execute(BASE);
      expect(result.data.riskCategory).toBe('low');
    });

    it('age >=65 contributes 3 points, age 55-64 contributes 2, else 1', async () => {
      const young = await service.execute({ ...BASE, ageYears: 50 });
      const mid = await service.execute({ ...BASE, ageYears: 60 });
      const old = await service.execute({ ...BASE, ageYears: 70 });
      expect(young.data.points).toBeLessThan(mid.data.points);
      expect(mid.data.points).toBeLessThan(old.data.points);
    });

    it('male sex contributes 1 point over otherwise-identical female profile', async () => {
      const female = await service.execute(BASE);
      const male = await service.execute({ ...BASE, sex: 'male' });
      expect(male.data.points).toBe(female.data.points + 1);
    });

    it('smoker contributes 2 points', async () => {
      const result = await service.execute({ ...BASE, smoker: true });
      const baseline = await service.execute(BASE);
      expect(result.data.points).toBe(baseline.data.points + 2);
    });

    it('a high-burden profile classifies as high risk', async () => {
      const result = await service.execute({
        ageYears: 70,
        sex: 'male',
        systolicBpMmHg: 165,
        totalCholesterolMgDl: 300,
        hdlCholesterolMgDl: 40,
        hsCrpMgL: 5,
        smoker: true,
        parentalMiBefore60: true,
        diabetes: true,
        hba1cPct: 8,
      });
      expect(result.data.riskCategory).toBe('high');
    });

    it('populates interpretation, citation, and disclaimer', async () => {
      const result = await service.execute(BASE);
      expect(result.interpretation).toContain('lower Reynolds helper band');
      expect(result.citations?.[0]?.reference).toContain('Ridker PM');
      expect(result.disclaimer).toContain(
        'not a replacement for a jurisdiction-approved Reynolds calculator',
      );
    });

    it('fails execution when validation fails', async () => {
      const result = await service.execute({ ...BASE, ageYears: 10 });
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
