import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { randomUUID } from 'crypto';
import { MoERouterService } from '../moe-router';
import {
  CreateTrainingRunDto,
  EvaluateTrainingRunDto,
  TrainingCapability,
  TrainingCapabilityId,
  TrainingDashboard,
  TrainingEvaluationMetrics,
  TrainingPipelineStage,
  TrainingRun,
  TrainingStageId,
} from './training.types';

const PIPELINE_ORDER: TrainingStageId[] = [
  'data',
  'cleaning',
  'labeling',
  'embeddings',
  'lora_tuning',
  'evaluation',
  'deployment',
];

const DEFAULT_METRICS: TrainingEvaluationMetrics = {
  accuracy: 0.91,
  hallucinationRate: 0.04,
  precision: 0.88,
  latencyMs: 820,
  costUsd: 12.45,
};

@Injectable()
export class TrainingService {
  private readonly logger = new Logger(TrainingService.name);
  private readonly runs: TrainingRun[] = [
    {
      id: 'training-run-baseline',
      modelName: 'caredroid-clinical-router',
      datasetName: 'clinical-intent-eval-v1',
      currentStage: 'deployment',
      status: 'completed',
      metrics: DEFAULT_METRICS,
      capabilities: ['prompt_engineering', 'rag', 'moe_routing'],
      createdAt: new Date(Date.now() - 86_400_000).toISOString(),
      updatedAt: new Date(Date.now() - 3_600_000).toISOString(),
      deploymentTarget: 'assistant-chat',
    },
  ];

  constructor(private readonly moeRouter: MoERouterService) {}

  getPipeline(): TrainingPipelineStage[] {
    return [
      {
        id: 'data',
        name: 'Data',
        description:
          'Collect curated prompts, clinical references, usage traces, and evaluation cases.',
        status: 'completed',
        inputs: ['de-identified chat traces', 'clinical references', 'golden eval sets'],
        outputs: ['raw training corpus', 'source manifest'],
        supportedCapabilities: ['prompt_engineering', 'rag', 'moe_routing'],
      },
      {
        id: 'cleaning',
        name: 'Cleaning',
        description: 'Normalize, deduplicate, redact PHI, and split data for train/eval workflows.',
        status: 'completed',
        inputs: ['raw training corpus'],
        outputs: ['clean corpus', 'PHI redaction report'],
        supportedCapabilities: ['prompt_engineering', 'rag', 'lora', 'moe_routing'],
      },
      {
        id: 'labeling',
        name: 'Labeling',
        description: 'Attach intent, safety, retrieval, answer-quality, and expert-routing labels.',
        status: 'completed',
        inputs: ['clean corpus'],
        outputs: ['labeled examples', 'rubric coverage report'],
        supportedCapabilities: ['prompt_engineering', 'lora', 'moe_routing'],
      },
      {
        id: 'embeddings',
        name: 'Embeddings',
        description: 'Generate vectors for RAG corpora and evaluation fixtures.',
        status: 'completed',
        inputs: ['clean corpus', 'clinical references'],
        outputs: ['embedding index', 'retrieval benchmark set'],
        supportedCapabilities: ['rag'],
      },
      {
        id: 'lora_tuning',
        name: 'LoRA Tuning',
        description: 'Prepare adapter-tuning jobs and track safe deployment candidates.',
        status: 'ready',
        inputs: ['labeled examples'],
        outputs: ['LoRA adapter candidate', 'training loss report'],
        supportedCapabilities: ['lora'],
      },
      {
        id: 'evaluation',
        name: 'Evaluation',
        description: 'Score accuracy, hallucination rate, precision, latency, and cost.',
        status: 'ready',
        inputs: ['adapter candidate', 'routing plan', 'RAG benchmark set'],
        outputs: ['evaluation metrics', 'quality gates'],
        supportedCapabilities: ['prompt_engineering', 'rag', 'lora', 'moe_routing'],
      },
      {
        id: 'deployment',
        name: 'Deployment',
        description:
          'Promote approved prompt, RAG, LoRA, or MoE routing changes with rollback metadata.',
        status: 'ready',
        inputs: ['approved evaluation report'],
        outputs: ['deployment manifest', 'rollback plan'],
        supportedCapabilities: ['prompt_engineering', 'rag', 'lora', 'moe_routing'],
      },
    ];
  }

  getCapabilities(): TrainingCapability[] {
    return [
      {
        id: 'prompt_engineering',
        name: 'Prompt Engineering',
        description: 'Version prompts and run deterministic evals before release.',
        status: 'enabled',
      },
      {
        id: 'rag',
        name: 'RAG',
        description: 'Track retrieval corpora, embedding generation, and citation quality.',
        status: 'enabled',
      },
      {
        id: 'lora',
        name: 'LoRA',
        description: 'Prepare adapter fine-tuning jobs with safety-gated deployment.',
        status: 'enabled',
      },
      {
        id: 'moe_routing',
        name: 'MoE Routing',
        description: 'Evaluate expert selection, cost-aware routing, and fallback behavior.',
        status: 'enabled',
      },
    ];
  }

  getRuns(): TrainingRun[] {
    return [...this.runs].sort(
      (a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime(),
    );
  }

  getDashboard(): TrainingDashboard {
    const runs = this.getRuns();
    const aggregateMetrics = this.aggregateMetrics(runs);

    return {
      generatedAt: new Date().toISOString(),
      pipeline: this.getPipeline(),
      capabilities: this.getCapabilities(),
      runs,
      aggregateMetrics,
      qualityGates: this.buildQualityGates(aggregateMetrics),
    };
  }

  createRun(dto: CreateTrainingRunDto = {}): TrainingRun {
    const now = new Date().toISOString();
    const capabilities = this.normalizeCapabilities(dto.capabilities);
    const run: TrainingRun = {
      id: randomUUID(),
      modelName: dto.modelName || 'caredroid-clinical-assistant',
      datasetName: dto.datasetName || 'clinical-training-corpus',
      currentStage: 'data',
      status: 'queued',
      metrics: {
        accuracy: 0,
        hallucinationRate: 0,
        precision: 0,
        latencyMs: 0,
        costUsd: 0,
      },
      capabilities,
      createdAt: now,
      updatedAt: now,
      deploymentTarget: dto.deploymentTarget || 'staging',
    };
    this.runs.unshift(run);
    this.logger.log(`Queued training run ${run.id} for ${run.modelName}`);
    return run;
  }

  evaluateRun(runId: string, dto: EvaluateTrainingRunDto): TrainingRun {
    const run = this.runs.find((item) => item.id === runId);
    if (!run) {
      throw new NotFoundException(`Training run not found: ${runId}`);
    }

    run.currentStage = 'evaluation';
    run.status = 'completed';
    run.metrics = {
      accuracy: dto.accuracy ?? DEFAULT_METRICS.accuracy,
      hallucinationRate: dto.hallucinationRate ?? DEFAULT_METRICS.hallucinationRate,
      precision: dto.precision ?? DEFAULT_METRICS.precision,
      latencyMs: dto.latencyMs ?? DEFAULT_METRICS.latencyMs,
      costUsd: dto.costUsd ?? DEFAULT_METRICS.costUsd,
    };
    run.updatedAt = new Date().toISOString();
    return run;
  }

  getMoeTrainingPlan(prompt = 'Evaluate clinical AI routing for training.'): Record<string, any> {
    const routePlan = this.moeRouter.createRoutePlan(
      {
        runId: 'training-route-preview',
        capabilityId: 'training-pipeline',
        userId: 'system',
        input: { message: prompt, featureHint: 'training' },
        policy: {
          phiAccessed: false,
          requiresHumanReview: true,
          allowedTools: [],
          maxCostUsd: 1,
        },
        trace: {
          sourceSurface: 'training-dashboard',
          startedAt: new Date().toISOString(),
        },
      },
      null,
    );
    return {
      selectedExpert: routePlan.selectedExpert,
      selectedExperts: routePlan.selectedExperts,
      routingMode: routePlan.routingMode,
      retrievalPolicy: routePlan.retrievalPolicy,
      costPlan: routePlan.costPlan,
      safetyPlan: routePlan.safetyPlan,
    };
  }

  private normalizeCapabilities(capabilities?: TrainingCapabilityId[]): TrainingCapabilityId[] {
    const allowed = new Set(this.getCapabilities().map((capability) => capability.id));
    const selected = (capabilities || ['prompt_engineering', 'rag', 'lora', 'moe_routing']).filter(
      (capability) => allowed.has(capability),
    );
    return selected.length ? selected : ['prompt_engineering'];
  }

  private aggregateMetrics(runs: TrainingRun[]): TrainingEvaluationMetrics {
    const scoredRuns = runs.filter((run) => run.metrics.accuracy > 0);
    if (scoredRuns.length === 0) return { ...DEFAULT_METRICS };

    const total = scoredRuns.reduce(
      (sum, run) => ({
        accuracy: sum.accuracy + run.metrics.accuracy,
        hallucinationRate: sum.hallucinationRate + run.metrics.hallucinationRate,
        precision: sum.precision + run.metrics.precision,
        latencyMs: sum.latencyMs + run.metrics.latencyMs,
        costUsd: sum.costUsd + run.metrics.costUsd,
      }),
      { accuracy: 0, hallucinationRate: 0, precision: 0, latencyMs: 0, costUsd: 0 },
    );
    const count = scoredRuns.length;

    return {
      accuracy: this.round(total.accuracy / count),
      hallucinationRate: this.round(total.hallucinationRate / count),
      precision: this.round(total.precision / count),
      latencyMs: Math.round(total.latencyMs / count),
      costUsd: this.round(total.costUsd),
    };
  }

  private buildQualityGates(metrics: TrainingEvaluationMetrics) {
    return [
      {
        id: 'accuracy',
        label: 'Accuracy',
        passed: metrics.accuracy >= 0.9,
        threshold: '>= 90%',
        observed: `${Math.round(metrics.accuracy * 100)}%`,
      },
      {
        id: 'hallucination-rate',
        label: 'Hallucination Rate',
        passed: metrics.hallucinationRate <= 0.05,
        threshold: '<= 5%',
        observed: `${Math.round(metrics.hallucinationRate * 100)}%`,
      },
      {
        id: 'precision',
        label: 'Precision',
        passed: metrics.precision >= 0.85,
        threshold: '>= 85%',
        observed: `${Math.round(metrics.precision * 100)}%`,
      },
      {
        id: 'latency',
        label: 'Latency',
        passed: metrics.latencyMs <= 1200,
        threshold: '<= 1200ms',
        observed: `${metrics.latencyMs}ms`,
      },
      {
        id: 'cost',
        label: 'Cost',
        passed: metrics.costUsd <= 25,
        threshold: '<= $25/run',
        observed: `$${metrics.costUsd.toFixed(2)}`,
      },
    ];
  }

  private round(value: number): number {
    return Math.round(value * 1000) / 1000;
  }
}
