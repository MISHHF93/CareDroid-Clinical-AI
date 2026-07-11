/**
 * Osmolal Gap Calculator Service Unit Tests
 */

import { Test, TestingModule } from '@nestjs/testing';
import { OsmolalGapService } from '../src/modules/medical-control-plane/tool-orchestrator/services/osmolal-gap.service';

describe('OsmolalGapService', () => {
  let service: OsmolalGapService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [OsmolalGapService],
    }).compile();

    service = module.get<OsmolalGapService>(OsmolalGapService);
  });

  describe('getMetadata', () => {
    it('returns valid metadata', () => {
      expect(service.getMetadata().id).toBe('osmolal-gap');
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
    it('calculates a normal osmolal gap (<= 10)', async () => {
      const result = await service.execute({
        sodium: 140,
        glucoseMgDl: 100,
        bunMgDl: 14,
        measuredOsmolality: 295,
      });
      expect(result.data.calculatedOsmolality).toBe(290.6);
      expect(result.data.osmolalGap).toBe(4.4);
      expect(result.data.severity).toBe('normal');
    });

    it('calculates a warning osmolal gap (10-20)', async () => {
      const result = await service.execute({
        sodium: 140,
        glucoseMgDl: 100,
        bunMgDl: 14,
        measuredOsmolality: 305,
      });
      expect(result.data.osmolalGap).toBe(14.4);
      expect(result.data.severity).toBe('warning');
    });

    it('calculates a critical osmolal gap (> 20)', async () => {
      const result = await service.execute({
        sodium: 140,
        glucoseMgDl: 100,
        bunMgDl: 14,
        measuredOsmolality: 320,
      });
      expect(result.data.osmolalGap).toBe(29.4);
      expect(result.data.severity).toBe('critical');
    });

    it('populates interpretation, citation, and disclaimer', async () => {
      const result = await service.execute({
        sodium: 140,
        glucoseMgDl: 100,
        bunMgDl: 14,
        measuredOsmolality: 320,
      });
      expect(result.interpretation).toContain('measured and calculated serum osmolality');
      expect(result.citations?.[0]?.reference).toContain('2 x Na + glucose/18');
      expect(result.disclaimer).toContain('Does not diagnose toxic alcohol ingestion');
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
