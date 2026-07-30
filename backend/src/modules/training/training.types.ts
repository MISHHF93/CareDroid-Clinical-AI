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
}

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
}

import { IsArray, IsIn, IsNumber, IsOptional, IsString, MaxLength, Min } from 'class-validator';

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
  }>;
}
