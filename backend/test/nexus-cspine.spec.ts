/**
 * NEXUS C-Spine Rule Calculator Service Unit Tests
 */

import { Test, TestingModule } from '@nestjs/testing';
import { NexusCSpineService } from '../src/modules/medical-control-plane/tool-orchestrator/services/nexus-cspine.service';

const LOW_RISK = {
  midlineTenderness: false,
  intoxication: false,
  neurologicDeficit: false,
  distractingInjury: false,
  normalAlertness: true,
};

describe('NexusCSpineService', () => {
  let service: NexusCSpineService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [NexusCSpineService],
    }).compile();

    service = module.get<NexusCSpineService>(NexusCSpineService);
  });

  describe('getMetadata', () => {
    it('returns valid metadata', () => {
      expect(service.getMetadata().id).toBe('nexus-cspine');
    });
  });

  describe('validate', () => {
    it('accepts an empty payload (all booleans optional)', () => {
      expect(service.validate({}).valid).toBe(true);
    });
  });

  describe('execute — low-risk rule', () => {
    it('classifies as low-risk when all 5 criteria are absent', async () => {
      const result = await service.execute(LOW_RISK);
      expect(result.data.lowRiskByRule).toBe(true);
      expect(result.data.imagingIndicatedByRule).toBe(false);
      expect(result.data.triggeredCriteria).toEqual([]);
    });

    it('indicates imaging when midline tenderness is present', async () => {
      const result = await service.execute({ ...LOW_RISK, midlineTenderness: true });
      expect(result.data.imagingIndicatedByRule).toBe(true);
      expect(result.data.triggeredCriteria).toContain('Midline cervical spine tenderness');
    });

    it('indicates imaging when intoxication is present', async () => {
      const result = await service.execute({ ...LOW_RISK, intoxication: true });
      expect(result.data.imagingIndicatedByRule).toBe(true);
      expect(result.data.triggeredCriteria).toContain('Intoxication');
    });

    it('indicates imaging when a focal neurologic deficit is present', async () => {
      const result = await service.execute({ ...LOW_RISK, neurologicDeficit: true });
      expect(result.data.triggeredCriteria).toContain('Focal neurologic deficit');
    });

    it('indicates imaging when a distracting injury is present', async () => {
      const result = await service.execute({ ...LOW_RISK, distractingInjury: true });
      expect(result.data.triggeredCriteria).toContain('Distracting painful injury');
    });

    it('indicates imaging when alertness is not normal', async () => {
      const result = await service.execute({ ...LOW_RISK, normalAlertness: false });
      expect(result.data.triggeredCriteria).toContain('Altered alertness');
    });

    it('accumulates multiple triggered criteria', async () => {
      const result = await service.execute({
        ...LOW_RISK,
        midlineTenderness: true,
        intoxication: true,
      });
      expect(result.data.triggeredCriteria).toHaveLength(2);
    });

    it('populates interpretation, citation, and disclaimer', async () => {
      const result = await service.execute(LOW_RISK);
      expect(result.interpretation).toContain('low-risk stratum');
      expect(result.citations?.[0]?.reference).toContain('Hoffman JR');
      expect(result.disclaimer).toContain('Does not clear the cervical spine');
    });
  });

  describe('getExample', () => {
    it('returns a valid example payload', () => {
      const example = service.getExample?.();
      expect(service.validate(example!).valid).toBe(true);
    });
  });
});
