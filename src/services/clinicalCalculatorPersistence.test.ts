import { beforeEach, describe, expect, it, vi } from 'vitest';

const recordClinicalCalculatorResult = vi.hoisted(() => vi.fn());

vi.mock('./emergencyOsApi', () => ({
  recordClinicalCalculatorResult,
}));

import { persistClinicalCalculatorResultSafely } from './clinicalCalculatorPersistence';

describe('clinicalCalculatorPersistence', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    recordClinicalCalculatorResult.mockResolvedValue({ data: { id: 'calc-1' } });
  });

  it('persists MVP calculator results to the backend facade', () => {
    persistClinicalCalculatorResultSafely({
      scoreId: 'qsofa',
      patientId: 'p1',
      inputs: { respiratoryRate: 24 },
      score: 2,
      riskCategory: 'qSOFA-positive (≥2)',
      interpretation: 'Higher risk context',
    });

    expect(recordClinicalCalculatorResult).toHaveBeenCalledWith(
      expect.objectContaining({
        calculatorId: 'qsofa',
        patientId: 'p1',
        score: 2,
        disclaimer: expect.stringMatching(/clinical decision support/i),
      }),
    );
  });

  it('skips unknown calculator ids', () => {
    persistClinicalCalculatorResultSafely({
      scoreId: 'unknown-tool',
      patientId: 'p1',
      score: 1,
      riskCategory: 'n/a',
    });

    expect(recordClinicalCalculatorResult).not.toHaveBeenCalled();
  });
});