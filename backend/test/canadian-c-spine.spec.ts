/**
 * Canadian C-Spine Rule Calculator Service Unit Tests
 */

import { Test, TestingModule } from '@nestjs/testing';
import { CanadianCSpineService } from '../src/modules/medical-control-plane/tool-orchestrator/services/canadian-c-spine.service';

const ALL_LOW_RISK_MET = {
  simpleRearEndMvc: true,
  sittingInEd: true,
  ambulatoryAtAnyTime: true,
  delayedNeckPainOnset: true,
  noMidlineCervicalTenderness: true,
  noDistractingPainfulInjury: true,
};

describe('CanadianCSpineService', () => {
  let service: CanadianCSpineService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [CanadianCSpineService],
    }).compile();

    service = module.get<CanadianCSpineService>(CanadianCSpineService);
  });

  describe('getMetadata', () => {
    it('returns valid metadata', () => {
      expect(service.getMetadata().id).toBe('canadian-c-spine');
    });
  });

  describe('validate', () => {
    it('accepts an empty payload (all booleans optional)', () => {
      expect(service.validate({}).valid).toBe(true);
    });
  });

  describe('execute — 3-tier branch logic', () => {
    it('indicates imaging when any high-risk factor is present', async () => {
      const result = await service.execute({
        age65OrOlder: true,
        ...ALL_LOW_RISK_MET,
        activeRotationLeft45: true,
        activeRotationRight45: true,
      });
      expect(result.data.branch).toBe('high-risk');
      expect(result.data.imagingIndicatedByRule).toBe(true);
      expect(result.data.romAssessed).toBe(false);
    });

    it('indicates imaging when not all low-risk criteria are met', async () => {
      const { simpleRearEndMvc: _simpleRearEndMvc, ...partialLowRisk } = ALL_LOW_RISK_MET;
      const result = await service.execute(partialLowRisk);
      expect(result.data.branch).toBe('not-all-low-risk');
      expect(result.data.imagingIndicatedByRule).toBe(true);
      expect(result.data.romAssessed).toBe(false);
    });

    it('indicates imaging when low-risk criteria are met but ROM fails', async () => {
      const result = await service.execute({
        ...ALL_LOW_RISK_MET,
        activeRotationLeft45: true,
        activeRotationRight45: false,
      });
      expect(result.data.branch).toBe('rom-fail');
      expect(result.data.imagingIndicatedByRule).toBe(true);
      expect(result.data.romAssessed).toBe(true);
    });

    it('does not indicate imaging when low-risk criteria are met and ROM passes', async () => {
      const result = await service.execute({
        ...ALL_LOW_RISK_MET,
        activeRotationLeft45: true,
        activeRotationRight45: true,
      });
      expect(result.data.branch).toBe('rom-pass');
      expect(result.data.imagingIndicatedByRule).toBe(false);
      expect(result.data.romAssessed).toBe(true);
    });

    it('high-risk takes precedence over low-risk/ROM evaluation', async () => {
      const result = await service.execute({
        dangerousMechanism: true,
        ...ALL_LOW_RISK_MET,
        activeRotationLeft45: true,
        activeRotationRight45: true,
      });
      expect(result.data.branch).toBe('high-risk');
    });

    it('populates per-factor breakdowns', async () => {
      const result = await service.execute({ paresthesiasInExtremities: true });
      expect(result.data.highRiskFactors.paresthesiasInExtremities).toBe(true);
      expect(result.data.highRiskFactors.age65OrOlder).toBe(false);
    });

    it('populates interpretation, citation, and disclaimer', async () => {
      const result = await service.execute({
        ...ALL_LOW_RISK_MET,
        activeRotationLeft45: true,
        activeRotationRight45: true,
      });
      expect(result.interpretation).toContain('imaging is not indicated');
      expect(result.citations?.[0]?.reference).toContain('Stiell IG');
      expect(result.disclaimer).toContain('does not clear the cervical spine');
    });
  });

  describe('getExample', () => {
    it('returns a valid example payload', () => {
      const example = service.getExample?.();
      expect(service.validate(example!).valid).toBe(true);
    });
  });
});
