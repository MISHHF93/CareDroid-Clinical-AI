import {
  calculateHeartScore,
  interpretHeartScore,
  validateHeartScoreInputs,
} from '../utils/heartScoreCalculator';
import {
  asCalculatorSeverity,
  type AnyCalculatorResult,
  type CalculatorValidationResult,
} from './types';

export const HEART_META = {
  id: 'heart' as const,
  label: 'HEART Score',
  sourceLabel: 'Six AJ, et al. Chest. 2008;134(6):1157–1164',
  disclaimer:
    'Clinical decision support only. Does not diagnose acute coronary syndrome, rule out myocardial infarction, or recommend treatment or disposition.',
};

export type HeartInput = {
  history: 0 | 1 | 2;
  ecg: 0 | 1 | 2;
  age: 0 | 1 | 2;
  riskFactors: 0 | 1 | 2;
  troponin: 0 | 1 | 2;
};

export function validateHeart(input: Record<string, unknown>): CalculatorValidationResult {
  const result = validateHeartScoreInputs(input);
  return { ok: result.valid, errors: result.errors };
}

export function computeHeart(input: HeartInput): AnyCalculatorResult {
  const validation = validateHeart(input);
  if (!validation.ok) {
    return {
      ok: false,
      calculatorId: HEART_META.id,
      calculatorLabel: HEART_META.label,
      errors: validation.errors,
      disclaimer: HEART_META.disclaimer,
    };
  }

  const score = calculateHeartScore(input);
  if (score === null) {
    return {
      ok: false,
      calculatorId: HEART_META.id,
      calculatorLabel: HEART_META.label,
      errors: ['Unable to compute HEART score from inputs.'],
      disclaimer: HEART_META.disclaimer,
    };
  }

  const interpreted = interpretHeartScore(score);
  if (!interpreted) {
    return {
      ok: false,
      calculatorId: HEART_META.id,
      calculatorLabel: HEART_META.label,
      errors: ['Unable to interpret HEART score.'],
      disclaimer: HEART_META.disclaimer,
    };
  }

  return {
    ok: true,
    calculatorId: HEART_META.id,
    calculatorLabel: HEART_META.label,
    score,
    riskCategory: interpreted.riskCategory,
    interpretation: interpreted.interpretation,
    disclaimer: HEART_META.disclaimer,
    referenceLine: HEART_META.sourceLabel,
    severity: asCalculatorSeverity(interpreted.severity),
    inputs: { ...input },
    breakdown: { ...input },
  };
}
