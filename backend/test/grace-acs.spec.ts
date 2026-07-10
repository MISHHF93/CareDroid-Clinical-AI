/**
 * GRACE ACS Calculator Service Unit Tests
 */

import { Test, TestingModule } from '@nestjs/testing';
import { GraceAcsService } from '../src/modules/medical-control-plane/tool-orchestrator/services/grace-acs.service';

const BASE = {
  ageYears: 60,
  heartRateBpm: 80,
  systolicBpMmHg: 130,
  creatinineMgDl: 1.0,
  killipClass: 'I',
  cardiacArrestAtAdmission: false,
  stSegmentDeviation: false,
  elevatedCardiacEnzymes: false,
};

describe('GraceAcsService', () => {
  let service: GraceAcsService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [GraceAcsService],
    }).compile();

    service = module.get<GraceAcsService>(GraceAcsService);
  });

  describe('getMetadata', () => {
    it('returns valid metadata', () => {
      expect(service.getMetadata().id).toBe('grace-acs');
    });
  });

  describe('validate', () => {
    it('accepts a valid payload', () => {
      expect(service.validate(BASE).valid).toBe(true);
    });

    it('rejects an invalid killipClass', () => {
      const result = service.validate({ ...BASE, killipClass: 'V' });
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('killipClass must be I, II, III, or IV');
    });

    it('rejects a non-positive creatinine', () => {
      const result = service.validate({ ...BASE, creatinineMgDl: 0 });
      expect(result.valid).toBe(false);
    });
  });

  describe('execute — logistic model', () => {
    it('matches a precise hand-computed value for a known input set', async () => {
      const result = await service.execute({
        ageYears: 65,
        heartRateBpm: 90,
        systolicBpMmHg: 130,
        creatinineMgDl: 1.1,
        killipClass: 'I',
        cardiacArrestAtAdmission: false,
        stSegmentDeviation: true,
        elevatedCardiacEnzymes: true,
      });
      // xb = -4.3602 + 0.0529*65 + 0.0053*90 - 0.0147*130 + 0.2144*1.1 + 0.632*1 + 0.389 + 0.833 = -0.26586
      // probability = e^xb / (1 + e^xb) * 100
      expect(result.data.inHospitalMortalityPct).toBeCloseTo(43.4, 0);
    });

    it('higher Killip class increases both mortality estimates', async () => {
      const killipI = await service.execute({ ...BASE, killipClass: 'I' });
      const killipIV = await service.execute({ ...BASE, killipClass: 'IV' });
      expect(killipIV.data.inHospitalMortalityPct).toBeGreaterThan(
        killipI.data.inHospitalMortalityPct,
      );
      expect(killipIV.data.sixMonthMortalityPct).toBeGreaterThan(killipI.data.sixMonthMortalityPct);
    });

    it('cardiac arrest at admission increases mortality estimates', async () => {
      const withoutArrest = await service.execute(BASE);
      const withArrest = await service.execute({ ...BASE, cardiacArrestAtAdmission: true });
      expect(withArrest.data.inHospitalMortalityPct).toBeGreaterThan(
        withoutArrest.data.inHospitalMortalityPct,
      );
    });

    it('classifies 6-month mortality < 3% as low risk', async () => {
      const result = await service.execute({
        ageYears: 40,
        heartRateBpm: 70,
        systolicBpMmHg: 140,
        creatinineMgDl: 0.8,
        killipClass: 'I',
        cardiacArrestAtAdmission: false,
        stSegmentDeviation: false,
        elevatedCardiacEnzymes: false,
      });
      expect(result.data.sixMonthMortalityPct).toBeLessThan(3);
      expect(result.data.sixMonthRiskCategory).toBe('low');
    });

    it('classifies a high-burden profile as high risk', async () => {
      const result = await service.execute({
        ageYears: 85,
        heartRateBpm: 120,
        systolicBpMmHg: 90,
        creatinineMgDl: 3,
        killipClass: 'IV',
        cardiacArrestAtAdmission: true,
        stSegmentDeviation: true,
        elevatedCardiacEnzymes: true,
      });
      expect(result.data.sixMonthMortalityPct).toBeGreaterThan(8);
      expect(result.data.sixMonthRiskCategory).toBe('high');
    });

    it('populates interpretation, citation, and safety disclaimer', async () => {
      const result = await service.execute(BASE);
      expect(result.interpretation).toContain('Estimated in-hospital mortality');
      expect(result.citations?.[0]?.reference).toContain('Fox KAA');
      expect(result.disclaimer).toContain('does not confirm or exclude acute coronary syndrome');
    });

    it('fails execution when validation fails', async () => {
      const result = await service.execute({ ...BASE, killipClass: 'bad' });
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
