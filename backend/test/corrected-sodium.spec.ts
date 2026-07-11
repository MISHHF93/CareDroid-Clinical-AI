/**
 * Corrected Sodium Calculator Service Unit Tests
 */

import { Test, TestingModule } from '@nestjs/testing';
import { CorrectedSodiumService } from '../src/modules/medical-control-plane/tool-orchestrator/services/corrected-sodium.service';

describe('CorrectedSodiumService', () => {
  let service: CorrectedSodiumService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [CorrectedSodiumService],
    }).compile();

    service = module.get<CorrectedSodiumService>(CorrectedSodiumService);
  });

  describe('getMetadata', () => {
    it('returns valid metadata', () => {
      expect(service.getMetadata().id).toBe('corrected-sodium');
    });
  });

  describe('validate', () => {
    it('rejects missing required fields', () => {
      const result = service.validate({ sodium: 130 });
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('glucoseMgDl must be between 20 and 2000');
    });
  });

  describe('execute — calculation and banding', () => {
    it('defaults to a 1.6 correction factor (Na 130, glucose 600 -> 138)', async () => {
      const result = await service.execute({ sodium: 130, glucoseMgDl: 600 });
      expect(result.data.correctedSodium).toBe(138);
      expect(result.data.severity).toBe('normal');
    });

    it('applies the 2.4 correction factor when requested', async () => {
      const result = await service.execute({
        sodium: 130,
        glucoseMgDl: 600,
        correctionFactor: '2.4',
      });
      expect(result.data.correctedSodium).toBe(142);
    });

    it('flags critical low corrected sodium (< 125)', async () => {
      const result = await service.execute({ sodium: 120, glucoseMgDl: 100 });
      expect(result.data.correctedSodium).toBe(120);
      expect(result.data.severity).toBe('critical');
    });

    it('populates interpretation, citation, and disclaimer', async () => {
      const result = await service.execute({ sodium: 130, glucoseMgDl: 600 });
      expect(result.interpretation).toContain('hyperglycemia-related water shift');
      expect(result.citations?.[0]?.reference).toContain('1.6 or 2.4 mEq/L');
      expect(result.disclaimer).toContain('Does not recommend hypertonic saline');
    });

    it('fails execution when validation fails', async () => {
      const result = await service.execute({ sodium: 130 });
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
