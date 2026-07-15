/**
 * Arterial Blood Gas (ABG) Interpreter Service Unit Tests
 */

import { Test, TestingModule } from '@nestjs/testing';
import { AbgInterpreterService } from '../src/modules/medical-control-plane/tool-orchestrator/services/abg-interpreter.service';

describe('AbgInterpreterService', () => {
  let service: AbgInterpreterService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [AbgInterpreterService],
    }).compile();

    service = module.get<AbgInterpreterService>(AbgInterpreterService);
  });

  describe('getMetadata', () => {
    it('returns valid metadata', () => {
      expect(service.getMetadata().id).toBe('abg-interpreter');
    });
  });

  describe('validate', () => {
    it('rejects missing required fields', () => {
      const result = service.validate({ pH: 7.4 });
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('paco2 must be a number');
      expect(result.errors).toContain('hco3 must be a number');
    });

    it('warns (does not error) on a physiologically implausible but numeric pH', () => {
      const result = service.validate({ pH: 8.0, paco2: 40, hco3: 24 });
      expect(result.valid).toBe(true);
      expect(result.warnings.some((w) => w.includes('pH is outside'))).toBe(true);
    });

    it('rejects an fio2 outside the 0-1 fraction range', () => {
      const result = service.validate({ pH: 7.4, paco2: 40, hco3: 24, fio2: 1.5 });
      expect(result.valid).toBe(false);
      expect(result.errors).toContain(
        'fio2 must be a fraction between 0 and 1 (e.g. 0.21 for room air)',
      );
    });
  });

  describe('execute — primary disorder classification', () => {
    it('classifies normal acid-base status', async () => {
      const result = await service.execute({ pH: 7.4, paco2: 40, hco3: 24 });
      expect(result.data.primaryDisorder).toBe('normal');
      expect(result.data.primaryDisorderLabel).toBe('Normal acid-base status');
      expect(result.data.compensation).toBeNull();
    });

    it('classifies a high-anion-gap metabolic acidosis with appropriate respiratory compensation', async () => {
      // DKA-like picture; also this service's own getExample() payload.
      const result = await service.execute({
        pH: 7.28,
        paco2: 30,
        hco3: 14,
        sodium: 138,
        chloride: 100,
      });
      expect(result.data.primaryDisorder).toBe('metabolic_acidosis');
      expect(result.data.compensation).toMatchObject({
        expectedRange: [27, 31],
        assessment: 'Respiratory compensation is appropriate for the degree of metabolic acidosis.',
      });
      expect(result.data.anionGap).toMatchObject({ anionGap: 24, category: 'high_anion_gap' });
    });

    it('flags inadequate respiratory compensation for metabolic acidosis as a mixed picture', async () => {
      // Winter's formula expects PaCO2 27-31 for HCO3=14; 38 is well above that.
      const result = await service.execute({ pH: 7.3, paco2: 38, hco3: 14 });
      expect(result.data.primaryDisorder).toBe('metabolic_acidosis');
      expect(result.data.compensation.assessment).toContain(
        'concurrent (mixed) respiratory acidosis',
      );
    });

    it('classifies metabolic alkalosis with appropriate compensation', async () => {
      const result = await service.execute({ pH: 7.5, paco2: 44, hco3: 32 });
      expect(result.data.primaryDisorder).toBe('metabolic_alkalosis');
      expect(result.data.compensation).toMatchObject({ expectedRange: [37.4, 47.4] });
      expect(result.data.compensation.assessment).toContain('appropriate');
    });

    it('classifies acute respiratory acidosis', async () => {
      const result = await service.execute({ pH: 7.25, paco2: 60, hco3: 25 });
      expect(result.data.primaryDisorder).toBe('respiratory_acidosis');
      expect(result.data.compensation).toMatchObject({
        acuteExpectedHco3: 26,
        chronicExpectedHco3: 31,
      });
      expect(result.data.compensation.assessment).toContain('acute');
    });

    it('classifies acute respiratory alkalosis', async () => {
      const result = await service.execute({ pH: 7.5, paco2: 25, hco3: 22 });
      expect(result.data.primaryDisorder).toBe('respiratory_alkalosis');
      expect(result.data.compensation).toMatchObject({
        acuteExpectedHco3: 21,
        chronicExpectedHco3: 16.5,
      });
      expect(result.data.compensation.assessment).toContain('acute');
    });

    it('classifies a mixed acidosis (high PaCO2 with low HCO3 at acidemic pH)', async () => {
      const result = await service.execute({ pH: 7.15, paco2: 60, hco3: 12 });
      expect(result.data.primaryDisorder).toBe('mixed_acidosis');
      expect(result.data.compensation).toBeNull();
    });

    it('classifies a mixed alkalosis (low PaCO2 with high HCO3 at alkalemic pH)', async () => {
      const result = await service.execute({ pH: 7.55, paco2: 25, hco3: 30 });
      expect(result.data.primaryDisorder).toBe('mixed_alkalosis');
      expect(result.data.compensation).toBeNull();
    });

    it('classifies an indeterminate/fully-compensated picture (normal pH, abnormal PaCO2/HCO3)', async () => {
      const result = await service.execute({ pH: 7.4, paco2: 55, hco3: 33 });
      expect(result.data.primaryDisorder).toBe('indeterminate_compensated');
    });
  });

  describe('execute — anion gap (optional)', () => {
    it('omits anion gap when sodium/chloride are not supplied', async () => {
      const result = await service.execute({ pH: 7.4, paco2: 40, hco3: 24 });
      expect(result.data.anionGap).toBeNull();
    });

    it('flags a low anion gap', async () => {
      const result = await service.execute({
        pH: 7.4,
        paco2: 40,
        hco3: 25,
        sodium: 130,
        chloride: 100,
      });
      expect(result.data.anionGap).toMatchObject({ anionGap: 5, category: 'low_anion_gap' });
    });

    it('flags a normal anion gap', async () => {
      const result = await service.execute({
        pH: 7.4,
        paco2: 40,
        hco3: 30,
        sodium: 140,
        chloride: 100,
      });
      expect(result.data.anionGap).toMatchObject({ anionGap: 10, category: 'normal_anion_gap' });
    });
  });

  describe('execute — oxygenation (optional)', () => {
    it('omits oxygenation when pao2 is not supplied', async () => {
      const result = await service.execute({ pH: 7.4, paco2: 40, hco3: 24 });
      expect(result.data.oxygenation).toBeNull();
    });

    it('flags hypoxemia from PaO2 alone when fio2 is not supplied', async () => {
      const result = await service.execute({ pH: 7.4, paco2: 40, hco3: 24, pao2: 70 });
      expect(result.data.oxygenation).toMatchObject({ hypoxemia: true });
    });

    it('bands a severe P/F ratio', async () => {
      const result = await service.execute({
        pH: 7.4,
        paco2: 40,
        hco3: 24,
        pao2: 80,
        fio2: 1,
      });
      expect(result.data.oxygenation).toMatchObject({ pfRatio: 80, band: 'severe' });
    });

    it('bands a normal (at-threshold) P/F ratio', async () => {
      const result = await service.execute({
        pH: 7.4,
        paco2: 40,
        hco3: 24,
        pao2: 90,
        fio2: 0.3,
      });
      expect(result.data.oxygenation).toMatchObject({ pfRatio: 300, band: 'normal' });
    });
  });

  describe('metadata and safety text', () => {
    it('populates interpretation, citations, and disclaimer', async () => {
      const result = await service.execute({ pH: 7.28, paco2: 30, hco3: 14 });
      expect(result.interpretation).toContain('Primary metabolic acidosis');
      expect(result.citations?.[0]?.title).toContain("Winter's Formula");
      expect(result.disclaimer).toContain('Does not diagnose the underlying cause');
    });

    it('fails execution when validation fails', async () => {
      const result = await service.execute({ pH: 7.4 });
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
