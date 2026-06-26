import type { AnyCalculatorResult } from './types';

export const NIHSS_META = {
  id: 'nihss' as const,
  label: 'NIHSS (placeholder)',
  sourceLabel: 'Brott T, et al. Stroke. 1989;20(7):864-870',
  disclaimer:
    'Clinical decision support only. Full NIHSS scoring is not implemented in this MVP build. Use institutional stroke protocols and certified NIHSS assessment tools.',
};

export function computeNihssPlaceholder(): AnyCalculatorResult {
  return {
    ok: false,
    calculatorId: NIHSS_META.id,
    calculatorLabel: NIHSS_META.label,
    errors: [
      'Full NIHSS scoring is not available in this MVP. Launch your institution’s certified NIHSS workflow or stroke activation protocol.',
    ],
    disclaimer: NIHSS_META.disclaimer,
  };
}