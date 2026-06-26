import {
  calculateWellsPeScore,
  computeWellsPeBreakdown,
  interpretWellsPe,
  WELLS_PE_CRITERIA_META,
} from '../utils/wellsPeCalculator';
import { asCalculatorSeverity, type AnyCalculatorResult, type CalculatorValidationResult } from './types';

export const WELLS_PE_META = {
  id: 'wells-pe' as const,
  label: 'Wells PE',
  sourceLabel: 'Wells PS et al. Thromb Haemost. 2000; Ann Intern Med. 2001',
  disclaimer:
    'Clinical decision support only. Estimates pre-test clinical probability — does not rule in or rule out pulmonary embolism.',
};

export type WellsPeInput = {
  clinicalDvtSigns: boolean;
  peMostLikelyDiagnosis: boolean;
  heartRateOver100: boolean;
  immobilizationOrSurgery: boolean;
  previousDvtOrPe: boolean;
  hemoptysis: boolean;
  malignancy: boolean;
};

export function validateWellsPe(input: WellsPeInput): CalculatorValidationResult {
  const keys = WELLS_PE_CRITERIA_META.map((row) => row.key);
  const errors: string[] = [];
  for (const key of keys) {
    if (typeof input[key as keyof WellsPeInput] !== 'boolean') {
      errors.push(`Indicate yes/no for ${key}.`);
    }
  }
  return { ok: errors.length === 0, errors };
}

export function computeWellsPe(input: WellsPeInput): AnyCalculatorResult {
  const validation = validateWellsPe(input);
  if (!validation.ok) {
    return {
      ok: false,
      calculatorId: WELLS_PE_META.id,
      calculatorLabel: WELLS_PE_META.label,
      errors: validation.errors,
      disclaimer: WELLS_PE_META.disclaimer,
    };
  }

  const breakdown = computeWellsPeBreakdown(input);
  const score = calculateWellsPeScore(input);
  if (score === null) {
    return {
      ok: false,
      calculatorId: WELLS_PE_META.id,
      calculatorLabel: WELLS_PE_META.label,
      errors: ['Unable to compute Wells PE score.'],
      disclaimer: WELLS_PE_META.disclaimer,
    };
  }

  const interpreted = interpretWellsPe(score);
  if (!interpreted) {
    return {
      ok: false,
      calculatorId: WELLS_PE_META.id,
      calculatorLabel: WELLS_PE_META.label,
      errors: ['Score out of valid Wells PE range.'],
      disclaimer: WELLS_PE_META.disclaimer,
    };
  }

  return {
    ok: true,
    calculatorId: WELLS_PE_META.id,
    calculatorLabel: WELLS_PE_META.label,
    score,
    riskCategory: interpreted.probabilityBand,
    interpretation: interpreted.interpretation,
    disclaimer: WELLS_PE_META.disclaimer,
    referenceLine: interpreted.referenceLine,
    severity: asCalculatorSeverity(interpreted.severity),
    inputs: { ...input },
    breakdown,
    warnings: [interpreted.diagnosticDisclaimer],
  };
}