/**
 * ROX Index Calculator Service Unit Tests
 */

import { Test, TestingModule } from '@nestjs/testing';
import { RoxIndexService } from '../src/modules/medical-control-plane/tool-orchestrator/services/rox-index.service';

describe('RoxIndexService', () => {
  let service: RoxIndexService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [RoxIndexService],
    }).compile();

    service = module.get<RoxIndexService>(RoxIndexService);
  });

  describe('getMetadata', () => {
    it('returns valid metadata', () => {
      expect(service.getMetadata().id).toBe('rox-index');
    });
  });

  describe('validate', () => {
    it('rejects missing required fields', () => {
      const result = service.validate({ spo2Pct: 95 });
      expect(result.valid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
    });
  });

  describe('execute — calculation and banding', () => {
    it('calculates a reassuring ROX index (>= 4.88)', async () => {
      const result = await service.execute({ spo2Pct: 95, fio2Pct: 40, respiratoryRate: 22 });
      expect(result.data.roxIndex).toBe(10.8);
      expect(result.data.riskBand).toBe('reassuring');
      expect(result.data.severity).toBe('normal');
    });

    it('calculates an indeterminate ROX index (3.85-4.88)', async () => {
      const result = await service.execute({ spo2Pct: 90, fio2Pct: 60, respiratoryRate: 32 });
      expect(result.data.roxIndex).toBe(4.69);
      expect(result.data.riskBand).toBe('indeterminate');
      expect(result.data.severity).toBe('warning');
    });

    it('calculates a concerning ROX index (< 3.85)', async () => {
      const result = await service.execute({ spo2Pct: 90, fio2Pct: 80, respiratoryRate: 35 });
      expect(result.data.roxIndex).toBe(3.21);
      expect(result.data.riskBand).toBe('concerning');
      expect(result.data.severity).toBe('critical');
    });

    it('populates interpretation, citation, and disclaimer', async () => {
      const result = await service.execute({ spo2Pct: 95, fio2Pct: 40, respiratoryRate: 22 });
      expect(result.interpretation).toContain('high-flow nasal cannula monitoring adjunct');
      expect(result.citations?.[0]?.reference).toContain('Roca O');
      expect(result.disclaimer).toContain('Does not determine intubation');
    });

    it('fails execution when validation fails', async () => {
      const result = await service.execute({ spo2Pct: 95 });
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
