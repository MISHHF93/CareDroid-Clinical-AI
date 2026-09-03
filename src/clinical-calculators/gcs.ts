import {
  calculateGcsScore,
  interpretGcsScore,
  validateRequiredSelections,
} from '../utils/emergencyCriticalCareCalculators';
import {
  asCalculatorSeverity,
  type AnyCalculatorResult,
  type CalculatorValidationResult,
} from './types';

export const GCS_META = {
  id: 'gcs' as const,
  label: 'Glasgow Coma Scale (GCS)',
  sourceLabel: 'Teasdale G, Jennett B. Lancet. 1974;2:81-84',
  disclaimer:
    'Clinical decision support only. GCS does not diagnose cause of altered consciousness and must not delay airway, trauma, or neurologic emergency care.',
};

export type GcsInput = {
  eye: 1 | 2 | 3 | 4;
  verbal: 1 | 2 | 3 | 4 | 5;
  motor: 1 | 2 | 3 | 4 | 5 | 6;
};

const GCS_LABELS: Record<string, string> = {
  eye: 'eye opening',
  verbal: 'verbal response',
  motor: 'motor response',
};

export function validateGcs(input: Record<string, unknown>): CalculatorValidationResult {
  const result = validateRequiredSelections(input, ['eye', 'verbal', 'motor'], GCS_LABELS);
  return { ok: result.ok, errors: result.errors };
}

export function computeGcs(input: GcsInput): AnyCalculatorResult {
  const validation = validateGcs(input);
  if (!validation.ok) {
    return {
      ok: false,
      calculatorId: GCS_META.id,
      calculatorLabel: GCS_META.label,
      errors: validation.errors,
      disclaimer: GCS_META.disclaimer,
    };
  }

  const rawScore = calculateGcsScore(input);
  if (!Number.isFinite(rawScore)) {
    return {
      ok: false,
      calculatorId: GCS_META.id,
      calculatorLabel: GCS_META.label,
      errors: ['Unable to compute GCS score.'],
      disclaimer: GCS_META.disclaimer,
    };
  }
  const score = rawScore as number;
  const interpreted = interpretGcsScore(score);
  if (!interpreted) {
    return {
      ok: false,
      calculatorId: GCS_META.id,
      calculatorLabel: GCS_META.label,
      errors: ['Unable to interpret GCS score.'],
      disclaimer: GCS_META.disclaimer,
    };
  }

  return {
    ok: true,
    calculatorId: GCS_META.id,
    calculatorLabel: GCS_META.label,
    score,
    riskCategory: interpreted.riskCategory,
    interpretation: interpreted.interpretation,
    disclaimer: GCS_META.disclaimer,
    referenceLine: interpreted.referenceLine,
    severity: asCalculatorSeverity(interpreted.severity),
    inputs: { ...input },
    breakdown: { eye: input.eye, verbal: input.verbal, motor: input.motor },
    warnings: interpreted.warnings,
  };
}
