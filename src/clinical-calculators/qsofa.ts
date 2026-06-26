import {
  calculateQsofaScore,
  interpretQsofaScore,
  qsofaCriteriaFromInputs,
  validateQsofaInputs,
} from '../utils/qsofaCalculator';
import type { AnyCalculatorResult, CalculatorValidationResult } from './types';

export const QSOFA_META = {
  id: 'qsofa' as const,
  label: 'qSOFA',
  sourceLabel: 'Singer M, et al. JAMA. 2016;315(8):801-810 (Sepsis-3)',
  disclaimer:
    'Clinical decision support only. qSOFA does not diagnose sepsis or septic shock and must not delay infection workup or escalation when clinically indicated.',
};

export type QsofaInput = {
  respiratoryRate: number | string;
  systolicBloodPressure: number | string;
  alteredMentation: boolean;
  gcs?: number | string;
};

export function validateQsofa(input: QsofaInput): CalculatorValidationResult {
  return validateQsofaInputs({
    ...input,
    gcs: input.gcs ?? '',
  });
}

export function computeQsofa(input: QsofaInput): AnyCalculatorResult {
  const validation = validateQsofa(input);
  if (!validation.ok) {
    return {
      ok: false,
      calculatorId: QSOFA_META.id,
      calculatorLabel: QSOFA_META.label,
      errors: validation.errors,
      disclaimer: QSOFA_META.disclaimer,
    };
  }

  const criteria = qsofaCriteriaFromInputs({ ...input, gcs: input.gcs ?? '' });
  const score = calculateQsofaScore(criteria);
  const interpreted = interpretQsofaScore(score);

  return {
    ok: true,
    calculatorId: QSOFA_META.id,
    calculatorLabel: QSOFA_META.label,
    score,
    riskCategory: score >= 2 ? 'qSOFA-positive (≥2)' : score === 1 ? 'one criterion' : 'none',
    interpretation: interpreted.interpretation,
    disclaimer: QSOFA_META.disclaimer,
    referenceLine: interpreted.referenceLine,
    severity: interpreted.severity,
    inputs: { ...input, criteria },
    breakdown: {
      respiratoryRateGte22: criteria.respiratoryRateGte22 ? 1 : 0,
      systolicBpLte100: criteria.systolicBpLte100 ? 1 : 0,
      alteredMentationOrGcsLt15: criteria.alteredMentationOrGcsLt15 ? 1 : 0,
    },
  };
}