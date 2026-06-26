import {
  NEWS2_ITEMS,
  scoreNews2,
  news2Response,
  type NEWS2Values,
} from '../utils/news2';
import type { AnyCalculatorResult, CalculatorValidationResult } from './types';

export const NEWS2_META = {
  id: 'news2' as const,
  label: 'NEWS2',
  sourceLabel: 'Royal College of Physicians. NEWS2 Chart. 2017',
  disclaimer:
    'Clinical decision support only. NEWS2 supports escalation review — it does not diagnose deterioration or replace clinical assessment.',
};

export function validateNews2(input: NEWS2Values): CalculatorValidationResult {
  const errors: string[] = [];
  for (const item of NEWS2_ITEMS) {
    if (item.input === 'number') {
      const value = input[item.id];
      if (value === undefined || Number.isNaN(Number(value))) {
        errors.push(`Enter ${item.label}.`);
      }
    } else {
      const value = input[item.id];
      if (!value || !item.options.some((option) => option.label === value)) {
        errors.push(`Select ${item.label}.`);
      }
    }
  }
  return { ok: errors.length === 0, errors };
}

export function computeNews2(input: NEWS2Values): AnyCalculatorResult {
  const validation = validateNews2(input);
  if (!validation.ok) {
    return {
      ok: false,
      calculatorId: NEWS2_META.id,
      calculatorLabel: NEWS2_META.label,
      errors: validation.errors,
      disclaimer: NEWS2_META.disclaimer,
    };
  }

  const scored = scoreNews2(input);
  const response = news2Response(scored.total, scored.hasSingleRed);
  const severity =
    response.alertSeverity === 'Critical'
      ? 'critical'
      : response.alertSeverity === 'Warning'
        ? 'warning'
        : 'normal';

  return {
    ok: true,
    calculatorId: NEWS2_META.id,
    calculatorLabel: NEWS2_META.label,
    score: scored.total,
    riskCategory: response.band,
    interpretation: response.recommendation,
    disclaimer: NEWS2_META.disclaimer,
    referenceLine: NEWS2_META.sourceLabel,
    severity,
    inputs: { ...input },
    breakdown: scored.itemScores,
    warnings: scored.hasSingleRed
      ? ['A single parameter scored 3 — urgent review may be indicated per NEWS2 protocol.']
      : undefined,
  };
}