/**
 * Anion Gap Calculator Service Unit Tests
 */

import { Test, TestingModule } from '@nestjs/testing';
import { AnionGapService } from '../src/modules/medical-control-plane/tool-orchestrator/services/anion-gap.service';

describe('AnionGapService', () => {
  let service: AnionGapService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [AnionGapService],
    }).compile();

    service = module.get<AnionGapService>(AnionGapService);
  });

  describe('getMetadata', () => {
    it('returns valid metadata', () => {
      expect(service.getMetadata().id).toBe('anion-gap');
    });
  });

  describe('validate', () => {
    it('accepts sodium/chloride/bicarbonate without albumin', () => {
      expect(service.validate({ sodium: 140, chloride: 100, bicarbonate: 24 }).valid).toBe(true);
    });

    it('rejects missing required fields', () => {
      const result = service.validate({ sodium: 140 });
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('chloride must be a valid number');
      expect(result.errors).toContain('bicarbonate must be a valid number');
    });
  });

  describe('execute — calculation and banding', () => {
    it('calculates a normal anion gap (Na 140, Cl 104, HCO3 24 -> 12)', async () => {
      const result = await service.execute({ sodium: 140, chloride: 104, bicarbonate: 24 });
      expect(result.data.anionGap).toBe(12);
      expect(result.data.riskCategory).toBe('normal');
    });

    it('calculates a high anion gap (> 12)', async () => {
      const result = await service.execute({ sodium: 140, chloride: 95, bicarbonate: 15 });
      expect(result.data.anionGap).toBe(30);
      expect(result.data.riskCategory).toBe('high');
    });

    it('calculates a low anion gap (< 8)', async () => {
      const result = await service.execute({ sodium: 140, chloride: 110, bicarbonate: 26 });
      expect(result.data.anionGap).toBe(4);
      expect(result.data.riskCategory).toBe('low');
    });

    it('does not compute a corrected anion gap when albumin is absent', async () => {
      const result = await service.execute({ sodium: 140, chloride: 104, bicarbonate: 24 });
      expect(result.data.correctedAnionGap).toBeNull();
    });

    it('computes a corrected anion gap when albumin is provided (low albumin raises corrected AG)', async () => {
      const result = await service.execute({
        sodium: 140,
        chloride: 104,
        bicarbonate: 24,
        albumin: 2,
      });
      // AG = 12; corrected = 12 + 2.5*(4-2) = 17
      expect(result.data.anionGap).toBe(12);
      expect(result.data.correctedAnionGap).toBe(17);
    });

    it('populates interpretation, citation, and disclaimer', async () => {
      const result = await service.execute({ sodium: 140, chloride: 95, bicarbonate: 15 });
      expect(result.interpretation).toContain('above the common adult reference range');
      expect(result.citations?.[0]?.reference).toContain('Na - (Cl + HCO3)');
      expect(result.disclaimer).toContain('Acid-base calculation support');
    });

    it('fails execution when validation fails', async () => {
      const result = await service.execute({ sodium: 140 });
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
