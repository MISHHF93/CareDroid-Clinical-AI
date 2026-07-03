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

export interface CreateTrainingRunDto {
  modelName?: string;
  datasetName?: string;
  capabilities?: TrainingCapabilityId[];
  deploymentTarget?: string;
}

export interface EvaluateTrainingRunDto {
  accuracy?: number;
  hallucinationRate?: number;
  precision?: number;
  latencyMs?: number;
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
