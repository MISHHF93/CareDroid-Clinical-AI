/**
 * Wells DVT Score Calculator Service Unit Tests
 */

import { Test, TestingModule } from '@nestjs/testing';
import { WellsDvtService } from '../src/modules/medical-control-plane/tool-orchestrator/services/wells-dvt.service';

describe('WellsDvtService', () => {
  let service: WellsDvtService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [WellsDvtService],
    }).compile();

    service = module.get<WellsDvtService>(WellsDvtService);
  });

  describe('getMetadata', () => {
    it('returns valid metadata', () => {
      expect(service.getMetadata().id).toBe('wells-dvt-calculator');
    });
  });

  describe('validate', () => {
    it('rejects missing/non-boolean criteria', () => {
      const result = service.validate({ activeCancer: true });
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('paralysisParesisImmobilization must be a boolean');
      expect(result.errors).toContain('previousDvt must be a boolean');
    });
  });

  const allFalse = {
    activeCancer: false,
    paralysisParesisImmobilization: false,
    recentlyBedriddenOrSurgery: false,
    localizedTenderness: false,
    entireLegSwollen: false,
    calfSwellingOver3cm: false,
    pittingEdema: false,
    collateralSuperficialVeins: false,
    previousDvt: false,
    alternativeDiagnosisAsLikely: false,
  };

  describe('execute — scoring and banding', () => {
    it('scores 0 with all criteria absent (DVT unlikely)', async () => {
      const result = await service.execute(allFalse);
      expect(result.data.score).toBe(0);
      expect(result.data.probabilityBand).toBe('DVT unlikely');
    });

    it('scores 1 with a single +1 criterion (still DVT unlikely)', async () => {
      const result = await service.execute({ ...allFalse, localizedTenderness: true });
      expect(result.data.score).toBe(1);
      expect(result.data.probabilityBand).toBe('DVT unlikely');
    });

    it('scores 2 with two +1 criteria (DVT likely, at the cutoff)', async () => {
      const result = await service.execute({
        ...allFalse,
        recentlyBedriddenOrSurgery: true,
        localizedTenderness: true,
      });
      expect(result.data.score).toBe(2);
      expect(result.data.breakdown).toEqual({
        activeCancer: 0,
        paralysisParesisImmobilization: 0,
        recentlyBedriddenOrSurgery: 1,
        localizedTenderness: 1,
        entireLegSwollen: 0,
        calfSwellingOver3cm: 0,
        pittingEdema: 0,
        collateralSuperficialVeins: 0,
        previousDvt: 0,
        alternativeDiagnosisAsLikely: 0,
      });
      expect(result.data.probabilityBand).toBe('DVT likely');
    });

    it('applies the -2 penalty when an alternative diagnosis is at least as likely', async () => {
      const result = await service.execute({
        ...allFalse,
        activeCancer: true,
        paralysisParesisImmobilization: true,
        recentlyBedriddenOrSurgery: true,
        alternativeDiagnosisAsLikely: true,
      });
      // 3 x (+1) + 1 x (-2) = 1
      expect(result.data.score).toBe(1);
      expect(result.data.breakdown.alternativeDiagnosisAsLikely).toBe(-2);
      expect(result.data.probabilityBand).toBe('DVT unlikely');
    });

    it('allows a negative total score', async () => {
      const result = await service.execute({ ...allFalse, alternativeDiagnosisAsLikely: true });
      expect(result.data.score).toBe(-2);
      expect(result.data.probabilityBand).toBe('DVT unlikely');
    });

    it('populates interpretation, citations, and disclaimer', async () => {
      const result = await service.execute({
        ...allFalse,
        recentlyBedriddenOrSurgery: true,
        localizedTenderness: true,
      });
      expect(result.interpretation).toContain('Compression ultrasound');
      expect(result.citations?.[0]?.reference).toContain('Wells PS');
      expect(result.disclaimer).toContain('does not rule in or rule out deep vein thrombosis');
    });

    it('fails execution when validation fails', async () => {
      const result = await service.execute({ activeCancer: true });
      expect(result.success).toBe(false);
      expect(result.data).toEqual({});
    });
  });

  describe('getExample', () => {
    it('returns a valid example payload', () => {
      const example = service.getExample?.();
      expect(service.validate(example!).valid).toBe(true);
    });

    it('example scores as DVT likely (2 points)', async () => {
      const example = service.getExample!();
      const result = await service.execute(example);
      expect(result.data.score).toBe(2);
      expect(result.data.probabilityBand).toBe('DVT likely');
    });
  });
});
