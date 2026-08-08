import { Injectable, Logger, NotFoundException, OnModuleInit } from '@nestjs/common';
import { existsSync, readFileSync } from 'fs';
import { join } from 'path';
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
} from './training.types';
import {
  isEvaluationMetricProvenance,
  isPromotionEligibleEvaluationProvenance,
} from '../../../../lib/ai/provenanceContract';

// Demo/bootstrap-only defaults. NEVER treat as measured production quality
// -- mirrors evaluation.service.ts's own DEFAULT_METRICS disclaimer, which
// this module structurally duplicates.
const DEFAULT_METRICS: TrainingEvaluationMetrics = {
  accuracy: 0.91,
  hallucinationRate: 0.04,
  precision: 0.88,
  latencyMs: 820,
  costUsd: 12.45,
};

@Injectable()
export class TrainingService implements OnModuleInit {
  private readonly logger = new Logger(TrainingService.name);
  private readonly runs: TrainingRun[] = [
    {
      id: 'training-run-baseline',
      modelName: 'caredroid-nlu-intent-classifier',
      datasetName: 'ml-services/models/nlu',
      currentStage: 'deployment',
      status: 'completed',
      metrics: DEFAULT_METRICS,
      capabilities: ['prompt_engineering', 'moe_routing'],
      createdAt: new Date(Date.now() - 86_400_000).toISOString(),
      updatedAt: new Date(Date.now() - 3_600_000).toISOString(),
      deploymentTarget: 'intent-classifier',
      modelType: 'classifier',
      // Overwritten to MEASURED by syncHeadMetrics() at boot if a real
      // ml-services/models/nlu/metrics.json is found; SYNTHETIC (these
      // hardcoded literals) until then.
      provenance: 'SYNTHETIC',
    },
    {
      id: 'training-run-artifact-router',
      modelName: 'caredroid-artifact-router',
      datasetName: 'ml-services/models/artifact-router',
      currentStage: 'deployment',
      status: 'completed',
      metrics: { ...DEFAULT_METRICS, accuracy: 0.88, latencyMs: 10 },
      capabilities: ['prompt_engineering', 'moe_routing'],
      createdAt: new Date(Date.now() - 86_400_000).toISOString(),
      updatedAt: new Date(Date.now() - 3_600_000).toISOString(),
      deploymentTarget: 'unified-ai-node',
      modelType: 'classifier',
      provenance: 'SYNTHETIC',
    },
  ];

  constructor(private readonly moeRouter: MoERouterService) {}

  onModuleInit(): void {
    this.syncUnifiedModelMetricsFromDisk();
  }

  private syncUnifiedModelMetricsFromDisk(): void {
    this.syncHeadMetrics('nlu', 'training-run-baseline');
    this.syncHeadMetrics('artifact-router', 'training-run-artifact-router');
  }

  private syncHeadMetrics(head: 'nlu' | 'artifact-router', runId: string): void {
    const unifiedMetrics = join(process.cwd(), 'ml-services', 'models', head, 'metrics.json');
    const legacyMetrics = join(
      process.cwd(),
      'ml-services',
      head === 'nlu' ? 'nlu' : 'artifact-router',
      'metrics.json',
    );
    const metricsPath = existsSync(unifiedMetrics) ? unifiedMetrics : legacyMetrics;
    if (!existsSync(metricsPath)) return;

    try {
      const raw = JSON.parse(readFileSync(metricsPath, 'utf8')) as {
        accuracy?: number;
        macroPrecision?: number;
        macroF1?: number;
        macroRecall?: number;
        latencyMs?: { mean?: number; p50?: number };
        testSetSize?: number;
        architecture?: string;
        targetMode?: string;
      };

      const run = this.runs.find((item) => item.id === runId);
      if (!run) return;

      run.metrics = {
        accuracy: raw.accuracy ?? run.metrics.accuracy,
        precision: raw.macroPrecision ?? raw.macroF1 ?? run.metrics.precision,
        // Classifiers (NLU intent routing, artifact-type routing) have no
        // free-text generation step, so "hallucination rate" isn't a
        // meaningful measurement for them at all -- this used to compute
        // `1 - macroF1`, a category error (reusing a routing-accuracy score
        // as a hallucination proxy), not just an imprecise estimate. Left
        // unchanged here; buildQualityGates() marks this gate inapplicable
        // for classifier-only aggregates instead of showing a fabricated
        // pass/fail.
        hallucinationRate: run.metrics.hallucinationRate,
        latencyMs: raw.latencyMs?.p50 ?? raw.latencyMs?.mean ?? run.metrics.latencyMs,
        costUsd: 0,
        // Real macro-recall from the same held-out test-set run, when the
        // evaluator reports it (artifact-router's does not, so this stays
        // undefined for that head rather than fabricating a value).
        recall: raw.macroRecall ?? run.metrics.recall,
      };
      run.datasetName = `${head}-test-${raw.testSetSize ?? 'unknown'}${raw.targetMode ? `-${raw.targetMode}` : ''}`;
      run.updatedAt = new Date().toISOString();
      // accuracy/precision above are now real held-out test-set metrics
      // read from ml-services/models/<head>/metrics.json, not literals.
      run.provenance = 'MEASURED';
      this.logger.log(
        `Synced ${head} metrics (accuracy=${run.metrics.accuracy}, latencyMs=${run.metrics.latencyMs})`,
      );
    } catch (error) {
      this.logger.warn(
        `Unable to read ${head} metrics.json: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }

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
        id: 'intent_routing',
        name: 'Intent Routing',
        description:
          'Retrain the in-process NLU intent classifier (Xenova embeddings + MLP) for medical control-plane routing.',
        status: 'completed',
        inputs: ['labeled intent examples', 'ml-services/nlu/data/*.jsonl'],
        outputs: ['classifier.json', 'metrics.json'],
        supportedCapabilities: ['prompt_engineering', 'moe_routing'],
      },
      {
        id: 'evaluation',
        name: 'Evaluation',
        description:
          'Score LLM output quality (hallucination rate, citation relevance), NLU routing accuracy, latency, and cost.',
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
    const scoredRuns = runs.filter((run) => run.metrics.accuracy > 0);
    const eligibleRuns = scoredRuns.filter((run) =>
      isPromotionEligibleEvaluationProvenance(run.provenance),
    );
    // Prefer promotion-eligible (MEASURED/HUMAN_REVIEWED) runs for the
    // aggregate, exactly like EvaluationService.getDashboard() -- fall back
    // to every scored run only when none are eligible, so the dashboard
    // isn't simply empty, but never silently blend unmeasured numbers into
    // an aggregate that otherwise has real evidence behind it.
    const aggregateSource = eligibleRuns.length ? eligibleRuns : scoredRuns;
    const aggregateMetrics = this.aggregateMetrics(aggregateSource);
    // hallucinationRate is only a meaningful gate when at least one
    // contributing run is actually generative (free-text) -- see
    // TrainingModelType's doc comment.
    const hallucinationRateApplicable = aggregateSource.some(
      (run) => run.modelType === 'generative',
    );

    return {
      generatedAt: new Date().toISOString(),
      pipeline: this.getPipeline(),
      capabilities: this.getCapabilities(),
      runs,
      aggregateMetrics,
      qualityGates: this.buildQualityGates(aggregateMetrics, hallucinationRateApplicable),
      honesty: {
        aggregateIsPromotionEligible: eligibleRuns.length > 0,
        promotionEligibleRunCount: eligibleRuns.length,
        otherRunCount: scoredRuns.length - eligibleRuns.length,
        guidance:
          eligibleRuns.length > 0
            ? 'Aggregate metrics and quality gates prefer MEASURED/HUMAN_REVIEWED runs. Other runs remain listed for context but are excluded from the aggregate.'
            : 'No promotion-eligible (MEASURED/HUMAN_REVIEWED) runs exist yet -- this aggregate and its quality gates reflect seed/synthetic/heuristic/unknown data only and must not be used for model promotion decisions.',
      },
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
      // New training runs queued via this endpoint are prompt/RAG/LoRA/MoE
      // training for the generative clinical assistant, not a classifier.
      modelType: 'generative',
      // No evaluation has happened yet -- evaluateRun() resolves the real
      // provenance once results come in.
      provenance: 'UNKNOWN',
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
    // This endpoint accepts caller-supplied numbers with no way to verify
    // them -- an authenticated caller's claim alone must never resolve to
    // MEASURED. An unrecognized or omitted dto.provenance resolves to
    // UNKNOWN, which getDashboard() then excludes from the
    // promotion-eligible aggregate. See EvaluateTrainingRunDto.provenance.
    run.provenance = isEvaluationMetricProvenance(dto.provenance) ? dto.provenance : 'UNKNOWN';
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

  private buildQualityGates(
    metrics: TrainingEvaluationMetrics,
    hallucinationRateApplicable: boolean,
  ) {
    return [
      {
        id: 'accuracy',
        label: 'Accuracy',
        passed: metrics.accuracy >= 0.9,
        threshold: '>= 90%',
        observed: `${Math.round(metrics.accuracy * 100)}%`,
        applicable: true,
      },
      {
        id: 'hallucination-rate',
        label: 'Hallucination Rate',
        passed: metrics.hallucinationRate <= 0.05,
        threshold: '<= 5%',
        observed: hallucinationRateApplicable
          ? `${Math.round(metrics.hallucinationRate * 100)}%`
          : 'not applicable (classifier-only runs; no free-text generation)',
        applicable: hallucinationRateApplicable,
      },
      {
        id: 'precision',
        label: 'Precision',
        passed: metrics.precision >= 0.85,
        threshold: '>= 85%',
        observed: `${Math.round(metrics.precision * 100)}%`,
        applicable: true,
      },
      {
        id: 'latency',
        label: 'Latency',
        passed: metrics.latencyMs <= 1200,
        threshold: '<= 1200ms',
        observed: `${metrics.latencyMs}ms`,
        applicable: true,
      },
      {
        id: 'cost',
        label: 'Cost',
        passed: metrics.costUsd <= 25,
        threshold: '<= $25/run',
        observed: `$${metrics.costUsd.toFixed(2)}`,
        applicable: true,
      },
    ];
  }

  private round(value: number): number {
    return Math.round(value * 1000) / 1000;
  }
}
