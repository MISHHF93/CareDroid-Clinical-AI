import { recordClinicalCalculatorResult } from './emergencyOsApi';
import { CLINICAL_CALCULATOR_REGISTRY, type ClinicalCalculatorId } from '../clinical-calculators';
import logger from '../utils/logger';

const SCORE_ID_ALIASES: Record<string, ClinicalCalculatorId> = {
  qsofa: 'qsofa',
  'heart-score': 'heart',
  heart: 'heart',
  'wells-pe': 'wells-pe',
  wells: 'wells-pe',
  gcs: 'gcs',
  news2: 'news2',
  nihss: 'nihss',
};

export type PersistCalculatorResultInput = {
  scoreId: string;
  patientId?: string;
  inputs?: Record<string, unknown>;
  score: number | string;
  riskCategory: string;
  interpretation?: string;
};

function resolveCalculatorId(scoreId: string): ClinicalCalculatorId | null {
  const normalized = String(scoreId || '').toLowerCase();
  return SCORE_ID_ALIASES[normalized] ?? null;
}

export function persistClinicalCalculatorResultSafely(input: PersistCalculatorResultInput): void {
  const calculatorId = resolveCalculatorId(input.scoreId);
  if (!calculatorId) return;

  const meta = CLINICAL_CALCULATOR_REGISTRY[calculatorId];
  void recordClinicalCalculatorResult({
    calculatorId,
    patientId: input.patientId,
    inputs: input.inputs || {},
    score: input.score,
    riskCategory: input.riskCategory,
    interpretation: input.interpretation || input.riskCategory,
    disclaimer: meta.disclaimer,
    referenceLine: meta.sourceLabel,
  }).catch((error) => {
    logger.warn('Failed to persist clinical calculator result', {
      calculatorId,
      patientId: input.patientId,
      error: error instanceof Error ? error.message : String(error),
    });
  });
}