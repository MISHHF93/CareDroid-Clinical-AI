import { describe, expect, it } from 'vitest';
import {
  CLINICAL_CALCULATOR_REGISTRY,
  computeGcs,
  computeHeart,
  computeNews2,
  computeNihssPlaceholder,
  computeQsofa,
  computeWellsPe,
  MVP_CALCULATOR_IDS,
} from './index';

describe('clinical-calculators MVP registry', () => {
  it('registers all MVP calculator metadata with disclaimers', () => {
    for (const id of MVP_CALCULATOR_IDS) {
      const meta = CLINICAL_CALCULATOR_REGISTRY[id];
      expect(meta.id).toBe(id);
      expect(meta.label.length).toBeGreaterThan(0);
      expect(meta.disclaimer).toMatch(/clinical decision support/i);
      expect(meta.sourceLabel.length).toBeGreaterThan(0);
    }
  });
});

describe('qSOFA', () => {
  it('scores Sepsis-3 criteria deterministically', () => {
    const result = computeQsofa({
      respiratoryRate: 24,
      systolicBloodPressure: 95,
      alteredMentation: true,
    });
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.score).toBe(3);
      expect(result.severity).toBe('critical');
    }
  });
});

describe('HEART', () => {
  it('returns low-risk band for minimum inputs', () => {
    const result = computeHeart({
      history: 0,
      ecg: 0,
      age: 0,
      riskFactors: 0,
      troponin: 0,
    });
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.score).toBe(0);
      expect(result.riskCategory).toBe('low');
    }
  });
});

describe('Wells PE', () => {
  it('classifies high probability above 6 points', () => {
    const result = computeWellsPe({
      clinicalDvtSigns: true,
      peMostLikelyDiagnosis: true,
      heartRateOver100: true,
      immobilizationOrSurgery: false,
      previousDvtOrPe: false,
      hemoptysis: false,
      malignancy: false,
    });
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.score).toBeGreaterThan(6);
      expect(result.riskCategory).toBe('High probability');
    }
  });
});

describe('GCS', () => {
  it('sums eye, verbal, and motor components', () => {
    const result = computeGcs({ eye: 4, verbal: 5, motor: 6 });
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.score).toBe(15);
      expect(result.riskCategory).toBe('mild');
    }
  });
});

describe('NEWS2', () => {
  it('scores stable vitals in low band', () => {
    const result = computeNews2({
      rr: 16,
      spo2_scale1: 98,
      air: 'Air',
      sbp: 120,
      hr: 72,
      consciousness: 'Alert (A)',
      temp: 36.8,
    });
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.score).toBe(0);
      expect(result.riskCategory).toBe('Low');
    }
  });
});

describe('NIHSS placeholder', () => {
  it('fails closed with guidance', () => {
    const result = computeNihssPlaceholder();
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.errors[0]).toMatch(/not available/i);
    }
  });
});