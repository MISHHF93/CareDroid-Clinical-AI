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
   * When true, metrics are demo seeds — not measured offline/live eval.
   * Prefer seedOnly=false runs (e.g. ai-eval-run harness) for promotion decisions.
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

export interface CreateEvaluationRunDto {
  modelName?: string;
  promptName?: string;
  agentName?: string;
  ragStrategy?: string;
  datasetName?: string;
  status?: 'completed' | 'failed';
  sampleCount?: number;
  metrics?: Partial<EvaluationMetrics>;
  rawScores?: EvaluationRawScores;
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
