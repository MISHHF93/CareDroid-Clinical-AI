/**
 * Calculated Serum Osmolality Service Unit Tests
 */

import { Test, TestingModule } from '@nestjs/testing';
import { SerumOsmolalityService } from '../src/modules/medical-control-plane/tool-orchestrator/services/serum-osmolality.service';

describe('SerumOsmolalityService', () => {
  let service: SerumOsmolalityService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [SerumOsmolalityService],
    }).compile();

    service = module.get<SerumOsmolalityService>(SerumOsmolalityService);
  });

  describe('getMetadata', () => {
    it('returns valid metadata', () => {
      expect(service.getMetadata().id).toBe('serum-osmolality');
    });
  });

  describe('validate', () => {
    it('rejects missing required fields', () => {
      const result = service.validate({ sodium: 140 });
      expect(result.valid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
    });
  });

  describe('execute — calculation and banding', () => {
    it('calculates a normal osmolality (Na 140, glucose 100, BUN 14 -> 290.6)', async () => {
      const result = await service.execute({ sodium: 140, glucoseMgDl: 100, bunMgDl: 14 });
      expect(result.data.calculatedOsmolality).toBe(290.6);
      expect(result.data.severity).toBe('normal');
    });

    it('flags a warning-band low osmolality (< 275)', async () => {
      const result = await service.execute({ sodium: 125, glucoseMgDl: 100, bunMgDl: 14 });
      expect(result.data.calculatedOsmolality).toBe(260.6);
      expect(result.data.severity).toBe('warning');
    });

    it('populates interpretation, citation, and disclaimer', async () => {
      const result = await service.execute({ sodium: 140, glucoseMgDl: 100, bunMgDl: 14 });
      expect(result.interpretation).toContain('Calculated serum osmolality estimates osmoles');
      expect(result.citations?.[0]?.reference).toContain('2 x Na + glucose/18');
      expect(result.disclaimer).toContain('Does not diagnose hyperosmolar states');
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
