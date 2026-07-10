/**
 * TIMI UA/NSTEMI Calculator Service Unit Tests
 */

import { Test, TestingModule } from '@nestjs/testing';
import { TimiUaNstemiService } from '../src/modules/medical-control-plane/tool-orchestrator/services/timi-ua-nstemi.service';

const ALL_FALSE = {
  age65OrOlder: false,
  threeOrMoreCadRiskFactors: false,
  knownCadStenosis50: false,
  aspirinLast7Days: false,
  severeAngina: false,
  stDeviation: false,
  elevatedCardiacMarkers: false,
};

describe('TimiUaNstemiService', () => {
  let service: TimiUaNstemiService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [TimiUaNstemiService],
    }).compile();

    service = module.get<TimiUaNstemiService>(TimiUaNstemiService);
  });

  describe('getMetadata', () => {
    it('returns valid metadata', () => {
      expect(service.getMetadata().id).toBe('timi-ua-nstemi');
    });
  });

  describe('validate', () => {
    it('accepts an all-false payload', () => {
      expect(service.validate(ALL_FALSE).valid).toBe(true);
    });

    it('rejects missing criteria', () => {
      const { age65OrOlder: _age65OrOlder, ...rest } = ALL_FALSE;
      const result = service.validate(rest);
      expect(result.valid).toBe(false);
    });
  });

  describe('execute — scoring and bands', () => {
    it('scores 0 with no criteria present', async () => {
      const result = await service.execute(ALL_FALSE);
      expect(result.data.score).toBe(0);
      expect(result.data.riskBand).toBe('0-2 points');
    });

    it('classifies score of 3 as intermediate (boundary)', async () => {
      const result = await service.execute({
        ...ALL_FALSE,
        age65OrOlder: true,
        aspirinLast7Days: true,
        severeAngina: true,
      });
      expect(result.data.score).toBe(3);
      expect(result.data.riskBand).toBe('3-4 points');
    });

    it('classifies score of 5 as high (boundary)', async () => {
      const result = await service.execute({
        ...ALL_FALSE,
        age65OrOlder: true,
        aspirinLast7Days: true,
        severeAngina: true,
        stDeviation: true,
        elevatedCardiacMarkers: true,
      });
      expect(result.data.score).toBe(5);
      expect(result.data.riskBand).toBe('5-7 points');
    });

    it('reaches the maximum score of 7 with all criteria present', async () => {
      const result = await service.execute({
        age65OrOlder: true,
        threeOrMoreCadRiskFactors: true,
        knownCadStenosis50: true,
        aspirinLast7Days: true,
        severeAngina: true,
        stDeviation: true,
        elevatedCardiacMarkers: true,
      });
      expect(result.data.score).toBe(7);
      expect(result.data.riskBand).toBe('5-7 points');
    });

    it('populates interpretation, citation, and the ACS-specific disclaimer', async () => {
      const result = await service.execute(ALL_FALSE);
      expect(result.interpretation).toContain('lower 14-day event rates');
      expect(result.citations?.[0]?.reference).toContain('Antman EM');
      expect(result.disclaimer).toContain('not for STEMI');
    });

    it('fails execution when validation fails', async () => {
      const result = await service.execute({});
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
