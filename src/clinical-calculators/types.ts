export type CalculatorSeverity = 'normal' | 'warning' | 'critical';

export function asCalculatorSeverity(value: string | undefined): CalculatorSeverity {
  if (value === 'critical') return 'critical';
  if (value === 'warning') return 'warning';
  return 'normal';
}

export type CalculatorValidationResult = {
  ok: boolean;
  errors: string[];
};

export type CalculatorResult = {
  ok: true;
  calculatorId: string;
  calculatorLabel: string;
  score: number | string;
  riskCategory: string;
  interpretation: string;
  disclaimer: string;
  referenceLine: string;
  severity: CalculatorSeverity;
  inputs: Record<string, unknown>;
  breakdown?: Record<string, number>;
  warnings?: string[];
};

export type CalculatorErrorResult = {
  ok: false;
  calculatorId: string;
  calculatorLabel: string;
  errors: string[];
  disclaimer: string;
};

export type AnyCalculatorResult = CalculatorResult | CalculatorErrorResult;

export type ClinicalCalculatorId = 'qsofa' | 'heart' | 'wells-pe' | 'gcs' | 'news2' | 'nihss';

export type ClinicalCalculatorMeta = {
  id: ClinicalCalculatorId;
  label: string;
  sourceLabel: string;
  disclaimer: string;
};