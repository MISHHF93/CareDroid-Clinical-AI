export type EvaluationMetricId =
  | 'modelQuality'
  | 'hallucinationRate'
  | 'accuracy'
  | 'latencyMs'
  | 'retrievalPrecision'
  | 'toolExecutionSuccess'
  | 'workflowSuccess'
  | 'userSatisfaction'
  | 'costUsd';

export type EvaluationMetricDirection = 'higher_is_better' | 'lower_is_better';
export type EvaluationComparisonDimension = 'models' | 'prompts' | 'agents' | 'ragStrategies';

export interface EvaluationMetrics {
  modelQuality: number;
  hallucinationRate: number;
  accuracy: number;
  latencyMs: number;
  retrievalPrecision: number;
  toolExecutionSuccess: number;
  workflowSuccess: number;
  userSatisfaction: number;
  costUsd: number;
}

export interface EvaluationMetricDefinition {
  id: EvaluationMetricId;
  label: string;
  description: string;
  unit: 'percent' | 'milliseconds' | 'score' | 'usd';
  direction: EvaluationMetricDirection;
  benchmark: number;
  benchmarkLabel: string;
}

export interface EvaluationBenchmark {
  id: EvaluationMetricId;
  label: string;
  observed: number;
  observedLabel: string;
  benchmark: number;
  benchmarkLabel: string;
  passed: boolean;
  delta: number;
  direction: EvaluationMetricDirection;
}

export interface EvaluationTrendPoint {
  label: string;
  runId: string;
  evaluatedAt: string;
  metrics: EvaluationMetrics;
}

export interface EvaluationRun {
  id: string;
  modelName: string;
  promptName: string;
  agentName: string;
  ragStrategy: string;
  datasetName: string;
  status: 'completed' | 'failed';
  sampleCount: number;
  metrics: EvaluationMetrics;
  evaluatedAt: string;
  notes?: string;
  /**
   * The canonical AI Core Node evaluation-metric taxonomy
   * (lib/ai/provenanceContract.ts). Added 2026-08-08 as a strict superset of
   * `seedOnly` below -- `seedOnly` is now DERIVED from this field
   * (`!isPromotionEligibleEvaluationProvenance(provenance)`), kept for
   * backward compatibility with existing consumers rather than removed.
   */
  provenance: EvaluationMetricProvenance;
  /**
   * When true, metrics are demo seeds — not measured offline/live eval.
   * Prefer seedOnly=false runs (e.g. ai-eval-run harness) for promotion decisions.
   * @deprecated Derived from `provenance`; read `provenance` directly for new code.
   */
  seedOnly?: boolean;
  /** Path or id of measured source (e.g. qa/ai-eval/results/latest.json) */
  measuredSource?: string;
}

export interface EvaluationRawScores {
  modelQuality?: number;
  factualClaims?: number;
  unsupportedClaims?: number;
  correctAnswers?: number;
  totalAnswers?: number;
  retrievalRelevantResults?: number;
  retrievalRetrievedResults?: number;
  toolExecutionsSucceeded?: number;
  toolExecutionsTotal?: number;
  workflowsSucceeded?: number;
  workflowsTotal?: number;
  userSatisfactionTotal?: number;
  userSatisfactionResponses?: number;
  latencyMs?: number;
  costUsd?: number;
}

import {
  IsBoolean,
  IsIn,
  IsNumber,
  IsObject,
  IsOptional,
  IsString,
  MaxLength,
  Min,
} from 'class-validator';
import {
  EVALUATION_METRIC_PROVENANCE_VALUES,
  type EvaluationMetricProvenance,
} from '../../../../lib/ai/provenanceContract';

export class CreateEvaluationRunDto {
  // Defaults to true in EvaluationService.createRun() -- unlike request DTOs
  // elsewhere in this codebase where "optional" means "has a sensible
  // production default," omitting this one must default to the SAFE
  // (not-measured) state. A caller asserting real, measured data must do so
  // explicitly. Added 2026-08-08 after finding chat.service.ts's live-turn
  // calls (fabricated hallucinationRate/userSatisfaction figures with no
  // real detection/rating behind them) were silently counted as "measured"
  // in getDashboard()'s aggregate/trend/benchmark computations, since this
  // field didn't exist on the DTO at all and createRun() left it undefined
  // -- which getDashboard()'s `!run.seedOnly` filter treats as measured.
  @IsOptional()
  @IsBoolean()
  seedOnly?: boolean;

  // Prefer this over seedOnly for new callers -- the full 7-value taxonomy.
  // Never resolved to MEASURED just because this is omitted; see
  // EvaluationService.resolveProvenance().
  @IsOptional()
  @IsIn(EVALUATION_METRIC_PROVENANCE_VALUES)
  provenance?: EvaluationMetricProvenance;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  modelName?: string;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  promptName?: string;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  agentName?: string;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  ragStrategy?: string;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  datasetName?: string;

  @IsOptional()
  @IsIn(['completed', 'failed'])
  status?: 'completed' | 'failed';

  @IsOptional()
  @IsNumber()
  @Min(0)
  sampleCount?: number;

  // Loosely validated: a partial, per-metric numeric bag whose keys mirror
  // EvaluationMetricId -- deep-validating each optional key isn't worth the
  // ceremony for this internal QA/eval-harness endpoint (JWT-authenticated,
  // no PHI involved), unlike the class DTOs used on clinical write paths.
  @IsOptional()
  @IsObject()
  metrics?: Partial<EvaluationMetrics>;

  @IsOptional()
  @IsObject()
  rawScores?: EvaluationRawScores;

  @IsOptional()
  @IsString()
  @MaxLength(5000)
  notes?: string;
}

export interface EvaluationComparisonSummary {
  id: string;
  dimension: EvaluationComparisonDimension;
  label: string;
  runCount: number;
  sampleCount: number;
  metrics: EvaluationMetrics;
  benchmarkPassRate: number;
}

export interface EvaluationDashboard {
  generatedAt: string;
  metricDefinitions: EvaluationMetricDefinition[];
  aggregateMetrics: EvaluationMetrics;
  trends: EvaluationTrendPoint[];
  benchmarks: EvaluationBenchmark[];
  runs: EvaluationRun[];
  comparisons: Record<EvaluationComparisonDimension, EvaluationComparisonSummary[]>;
  /**
   * Honesty flags for consumers — never treat seed-only aggregates as measured production quality.
   */
  honesty?: {
    aggregateIsSeedOnly: boolean;
    measuredRunCount: number;
    seedRunCount: number;
    measuredSource?: string;
    guidance: string;
  };
}
