export type TrainingStageId =
  | 'data'
  | 'cleaning'
  | 'labeling'
  | 'embeddings'
  | 'intent_routing'
  | 'lora_tuning'
  | 'evaluation'
  | 'deployment';

export type TrainingCapabilityId = 'prompt_engineering' | 'rag' | 'lora' | 'moe_routing';

export type TrainingStageStatus = 'ready' | 'running' | 'completed' | 'blocked';

export interface TrainingEvaluationMetrics {
  accuracy: number;
  hallucinationRate: number;
  precision: number;
  latencyMs: number;
  costUsd: number;
  /**
   * Real macro-recall from a classifier's held-out test-set evaluation
   * (ml-services/models/<head>/metrics.json's `macroRecall`). Added
   * 2026-08-08: this value was already being computed from real TP/FN
   * counts by ml-services/nlu/scripts/evaluate.ts but was silently dropped
   * before reaching this type -- never fabricated, just never surfaced.
   * Optional because not every classifier's metrics.json reports it (the
   * artifact-router evaluator currently only emits accuracy).
   */
  recall?: number;
}

/**
 * Distinguishes real trained classifiers (NLU intent classifier,
 * artifact-type router) from generative/LLM-based training runs. Added
 * 2026-08-08: a classifier has no free-text generation step, so
 * "hallucination rate" is not a meaningful concept for it at all --
 * previously computed via `1 - macroF1`, a category error (reusing a
 * routing-accuracy metric as if it measured hallucination), not just an
 * imprecise estimate. Quality-gate scoring skips the hallucination-rate
 * gate entirely for `classifier` runs rather than showing a fabricated
 * pass/fail.
 */
export type TrainingModelType = 'classifier' | 'generative';

export interface TrainingPipelineStage {
  id: TrainingStageId;
  name: string;
  description: string;
  status: TrainingStageStatus;
  inputs: string[];
  outputs: string[];
  supportedCapabilities: TrainingCapabilityId[];
}

export interface TrainingCapability {
  id: TrainingCapabilityId;
  name: string;
  description: string;
  status: 'enabled' | 'planned';
}

export interface TrainingRun {
  id: string;
  modelName: string;
  datasetName: string;
  currentStage: TrainingStageId;
  status: 'queued' | 'running' | 'completed' | 'failed';
  metrics: TrainingEvaluationMetrics;
  capabilities: TrainingCapabilityId[];
  createdAt: string;
  updatedAt: string;
  deploymentTarget?: string;
  modelType: TrainingModelType;
  /**
   * The canonical AI Core Node evaluation-metric taxonomy
   * (lib/ai/provenanceContract.ts). Added 2026-08-08: this module is a
   * structural sibling of backend/src/modules/evaluation/ and had the exact
   * same fabricated-metrics-treated-as-measured bug that module's own
   * `seedOnly` field was added to fix, except unfixed here until now --
   * `evaluateRun()` let any authenticated caller inject arbitrary
   * accuracy/hallucinationRate/precision/latencyMs/costUsd values straight
   * into the "Quality Gates" pass/fail display with no provenance concept
   * at all.
   */
  provenance: EvaluationMetricProvenance;
}

import { IsArray, IsIn, IsNumber, IsOptional, IsString, MaxLength, Min } from 'class-validator';
import {
  EVALUATION_METRIC_PROVENANCE_VALUES,
  type EvaluationMetricProvenance,
} from '../../../../lib/ai/provenanceContract';

const TRAINING_CAPABILITY_IDS: TrainingCapabilityId[] = [
  'prompt_engineering',
  'rag',
  'lora',
  'moe_routing',
];

export class CreateTrainingRunDto {
  @IsOptional()
  @IsString()
  @MaxLength(200)
  modelName?: string;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  datasetName?: string;

  @IsOptional()
  @IsArray()
  @IsIn(TRAINING_CAPABILITY_IDS, { each: true })
  capabilities?: TrainingCapabilityId[];

  @IsOptional()
  @IsString()
  @MaxLength(200)
  deploymentTarget?: string;
}

export class EvaluateTrainingRunDto {
  @IsOptional()
  @IsNumber()
  @Min(0)
  accuracy?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  hallucinationRate?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  precision?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  latencyMs?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  costUsd?: number;

  // Added 2026-08-08: previously this endpoint had no provenance concept at
  // all, so any authenticated caller's numbers landed in aggregateMetrics/
  // Quality Gates identically to a real measured run. Omitting this now
  // resolves to UNKNOWN, not MEASURED -- see TrainingService.evaluateRun().
  @IsOptional()
  @IsIn(EVALUATION_METRIC_PROVENANCE_VALUES)
  provenance?: EvaluationMetricProvenance;
}

export interface TrainingDashboard {
  generatedAt: string;
  pipeline: TrainingPipelineStage[];
  capabilities: TrainingCapability[];
  runs: TrainingRun[];
  aggregateMetrics: TrainingEvaluationMetrics;
  qualityGates: Array<{
    id: string;
    label: string;
    passed: boolean;
    threshold: string;
    observed: string;
    /** False when this run type can't produce a meaningful value for this gate (e.g. hallucinationRate on a classifier). */
    applicable: boolean;
  }>;
  /** Mirrors EvaluationDashboard.honesty -- never treat a seed/unknown-only aggregate as measured production quality. */
  honesty: {
    aggregateIsPromotionEligible: boolean;
    promotionEligibleRunCount: number;
    otherRunCount: number;
    guidance: string;
  };
}
