import { Injectable, Logger, OnModuleInit, Optional } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import type { Repository } from 'typeorm';
import { randomUUID } from 'crypto';
import { existsSync, readFileSync } from 'fs';
import { join } from 'path';
import { EvaluationRunEntity } from './entities/evaluation-run.entity';
import {
  CreateEvaluationRunDto,
  EvaluationBenchmark,
  EvaluationComparisonDimension,
  EvaluationComparisonSummary,
  EvaluationDashboard,
  EvaluationMetricDefinition,
  EvaluationMetricId,
  EvaluationMetrics,
  EvaluationRawScores,
  EvaluationRun,
  EvaluationTrendPoint,
} from './evaluation.types';
import {
  isEvaluationMetricProvenance,
  isPromotionEligibleEvaluationProvenance,
  type EvaluationMetricProvenance,
} from '../../../../lib/ai/provenanceContract';

const METRIC_DEFINITIONS: EvaluationMetricDefinition[] = [
  {
    id: 'modelQuality',
    label: 'Model quality',
    description:
      'Composite quality score across correctness, retrieval, tools, workflows, safety, latency, and cost.',
    unit: 'percent',
    direction: 'higher_is_better',
    benchmark: 0.9,
    benchmarkLabel: '>= 90%',
  },
  {
    id: 'hallucinationRate',
    label: 'Hallucination rate',
    description: 'Unsupported factual claims divided by total factual claims.',
    unit: 'percent',
    direction: 'lower_is_better',
    benchmark: 0.05,
    benchmarkLabel: '<= 5%',
  },
  {
    id: 'accuracy',
    label: 'Accuracy',
    description: 'Clinically correct answers divided by scored answers.',
    unit: 'percent',
    direction: 'higher_is_better',
    benchmark: 0.9,
    benchmarkLabel: '>= 90%',
  },
  {
    id: 'latencyMs',
    label: 'Latency',
    description: 'Median end-to-end response latency in milliseconds.',
    unit: 'milliseconds',
    direction: 'lower_is_better',
    benchmark: 1200,
    benchmarkLabel: '<= 1200ms',
  },
  {
    id: 'retrievalPrecision',
    label: 'Retrieval precision',
    description: 'Relevant retrieved chunks divided by all retrieved chunks.',
    unit: 'percent',
    direction: 'higher_is_better',
    benchmark: 0.85,
    benchmarkLabel: '>= 85%',
  },
  {
    id: 'toolExecutionSuccess',
    label: 'Tool execution success',
    description: 'Successful tool calls divided by attempted tool calls.',
    unit: 'percent',
    direction: 'higher_is_better',
    benchmark: 0.98,
    benchmarkLabel: '>= 98%',
  },
  {
    id: 'workflowSuccess',
    label: 'Workflow success',
    description: 'Completed AI-assisted workflows divided by attempted workflows.',
    unit: 'percent',
    direction: 'higher_is_better',
    benchmark: 0.92,
    benchmarkLabel: '>= 92%',
  },
  {
    id: 'userSatisfaction',
    label: 'User satisfaction',
    description: 'Average clinician satisfaction score on a 1-5 scale.',
    unit: 'score',
    direction: 'higher_is_better',
    benchmark: 4.4,
    benchmarkLabel: '>= 4.4/5',
  },
  {
    id: 'costUsd',
    label: 'Cost',
    description: 'Average inference and retrieval cost per evaluation run.',
    unit: 'usd',
    direction: 'lower_is_better',
    benchmark: 18,
    benchmarkLabel: '<= $18/run',
  },
];

/**
 * Demo-only defaults. NEVER treat as measured production quality.
 * Measured series come from `npm run ai:eval` → qa/ai-eval/results/.
 */
const DEFAULT_METRICS: EvaluationMetrics = {
  modelQuality: 0.912,
  hallucinationRate: 0.038,
  accuracy: 0.924,
  latencyMs: 860,
  retrievalPrecision: 0.887,
  toolExecutionSuccess: 0.991,
  workflowSuccess: 0.943,
  userSatisfaction: 4.55,
  costUsd: 12.8,
};

const METRIC_IDS: EvaluationMetricId[] = METRIC_DEFINITIONS.map((metric) => metric.id);

@Injectable()
export class EvaluationService implements OnModuleInit {
  private readonly logger = new Logger(EvaluationService.name);
  private readonly runs: EvaluationRun[] = this.bootstrapRuns();

  constructor(
    @Optional()
    @InjectRepository(EvaluationRunEntity)
    private readonly runRepository?: Repository<EvaluationRunEntity>,
  ) {}

  /**
   * Load durable evaluation runs from TypeORM so a real run recorded from a
   * live ED Copilot conversation (ChatService.recordEvaluationRun()) survives
   * a process restart instead of silently disappearing, taking its carefully
   * -tracked provenance with it. Prepended in front of the seed/demo runs
   * bootstrapRuns() already populated, matching createRun()'s own unshift()
   * ordering (newest/most-real first).
   */
  async onModuleInit(): Promise<void> {
    if (!this.runRepository) return;
    try {
      const rows = await this.runRepository.find({ order: { createdAt: 'DESC' } });
      for (const row of rows) {
        try {
          const run = JSON.parse(row.runJson) as EvaluationRun;
          if (this.runs.some((existing) => existing.id === run.id)) continue;
          this.runs.unshift(run);
        } catch (parseError) {
          this.logger.warn(`Failed to parse persisted evaluation run ${row.id}: ${parseError}`);
        }
      }
    } catch (error) {
      this.logger.warn(`Failed to rehydrate evaluation runs from database: ${error}`);
    }
  }

  private persistRunToDatabase(run: EvaluationRun): void {
    if (!this.runRepository) return;
    const entity = this.runRepository.create({ id: run.id, runJson: JSON.stringify(run) });
    this.runRepository.save(entity).catch((error) => {
      this.logger.warn(`Failed to persist evaluation run ${run.id} to database: ${error}`);
    });
  }

  getMetricDefinitions(): EvaluationMetricDefinition[] {
    return METRIC_DEFINITIONS.map((metric) => ({ ...metric }));
  }

  getRuns(): EvaluationRun[] {
    return [...this.runs].sort(
      (a, b) => new Date(b.evaluatedAt).getTime() - new Date(a.evaluatedAt).getTime(),
    );
  }

  getDashboard(): EvaluationDashboard {
    const runs = this.getRuns();
    const measuredRuns = runs.filter((run) => !run.seedOnly && run.status === 'completed');
    const seedRuns = runs.filter((run) => run.seedOnly);
    // Prefer measured offline/live runs for aggregates when present
    const aggregateSource = measuredRuns.length ? measuredRuns : runs;
    const aggregateMetrics = this.aggregateMetrics(aggregateSource);
    const measuredSource = measuredRuns.find((run) => run.measuredSource)?.measuredSource;

    return {
      generatedAt: new Date().toISOString(),
      metricDefinitions: this.getMetricDefinitions(),
      aggregateMetrics,
      trends: this.buildTrends(runs),
      benchmarks: this.buildBenchmarks(aggregateMetrics),
      runs,
      comparisons: this.buildComparisons(runs),
      honesty: {
        aggregateIsSeedOnly: measuredRuns.length === 0,
        measuredRunCount: measuredRuns.length,
        seedRunCount: seedRuns.length,
        measuredSource,
        guidance:
          measuredRuns.length > 0
            ? 'Aggregates prefer measured runs (ai-eval harness). Seed runs remain listed for UI demos only.'
            : 'Aggregates are SEED-ONLY demo values. Run `npm run ai:eval` and reload to attach measured offline results. Do not use for model promotion.',
      },
    };
  }

  createRun(dto: CreateEvaluationRunDto = {}): EvaluationRun {
    const rawMetrics = this.metricsFromRawScores(dto.rawScores);
    const metrics = this.normalizeMetrics({
      ...DEFAULT_METRICS,
      ...rawMetrics,
      ...(dto.metrics || {}),
    });
    const provenance = this.resolveProvenance(dto, Boolean(dto.rawScores));

    const run: EvaluationRun = {
      id: randomUUID(),
      modelName: dto.modelName || 'caredroid-clinical-assistant',
      promptName: dto.promptName || 'clinical-system-prompt-v1',
      agentName: dto.agentName || 'clinical-assistant-agent',
      ragStrategy: dto.ragStrategy || 'guideline-rag',
      datasetName: dto.datasetName || 'clinical-ai-eval-suite',
      status: dto.status || 'completed',
      sampleCount: Math.max(0, Math.round(dto.sampleCount ?? 100)),
      metrics,
      evaluatedAt: new Date().toISOString(),
      notes: dto.notes,
      provenance,
      // Derived from provenance, kept for backward compat -- see
      // isPromotionEligibleEvaluationProvenance().
      seedOnly: !isPromotionEligibleEvaluationProvenance(provenance),
    };

    this.runs.unshift(run);
    this.persistRunToDatabase(run);
    return run;
  }

  /**
   * Resolves the canonical 7-value provenance for a caller-supplied run.
   * Safe-by-default in every direction: an unrecognized/omitted
   * `dto.provenance` never resolves to MEASURED, and legacy `seedOnly:
   * false` callers only earn MEASURED when they also supplied `rawScores`
   * (real counted numerator/denominator evidence) -- a bare `seedOnly:
   * false` with only opaque `metrics` literals is UNKNOWN, not MEASURED,
   * since nothing was actually verified.
   */
  private resolveProvenance(
    dto: CreateEvaluationRunDto,
    hasRawScores: boolean,
  ): EvaluationMetricProvenance {
    if (isEvaluationMetricProvenance(dto.provenance)) return dto.provenance;
    if (dto.seedOnly === false) return hasRawScores ? 'MEASURED' : 'UNKNOWN';
    if (dto.seedOnly === true) return 'SEED_ONLY';
    return 'UNKNOWN';
  }

  private aggregateMetrics(runs: EvaluationRun[]): EvaluationMetrics {
    const completedRuns = runs.filter((run) => run.status === 'completed');
    if (!completedRuns.length) return { ...DEFAULT_METRICS };

    const totals = completedRuns.reduce(
      (sum, run) => {
        for (const metricId of METRIC_IDS) {
          sum[metricId] += run.metrics[metricId];
        }
        return sum;
      },
      {
        modelQuality: 0,
        hallucinationRate: 0,
        accuracy: 0,
        latencyMs: 0,
        retrievalPrecision: 0,
        toolExecutionSuccess: 0,
        workflowSuccess: 0,
        userSatisfaction: 0,
        costUsd: 0,
      } satisfies EvaluationMetrics,
    );

    return this.normalizeMetrics({
      modelQuality: totals.modelQuality / completedRuns.length,
      hallucinationRate: totals.hallucinationRate / completedRuns.length,
      accuracy: totals.accuracy / completedRuns.length,
      latencyMs: totals.latencyMs / completedRuns.length,
      retrievalPrecision: totals.retrievalPrecision / completedRuns.length,
      toolExecutionSuccess: totals.toolExecutionSuccess / completedRuns.length,
      workflowSuccess: totals.workflowSuccess / completedRuns.length,
      userSatisfaction: totals.userSatisfaction / completedRuns.length,
      costUsd: totals.costUsd / completedRuns.length,
    });
  }

  private buildTrends(runs: EvaluationRun[]): EvaluationTrendPoint[] {
    return runs
      .filter((run) => run.status === 'completed')
      .slice(0, 8)
      .reverse()
      .map((run) => ({
        label: this.formatTrendLabel(run.evaluatedAt),
        runId: run.id,
        evaluatedAt: run.evaluatedAt,
        metrics: run.metrics,
      }));
  }

  private buildBenchmarks(metrics: EvaluationMetrics): EvaluationBenchmark[] {
    return METRIC_DEFINITIONS.map((definition) => {
      const observed = metrics[definition.id];
      const delta =
        definition.direction === 'higher_is_better'
          ? observed - definition.benchmark
          : definition.benchmark - observed;

      return {
        id: definition.id,
        label: definition.label,
        observed,
        observedLabel: this.formatMetric(definition, observed),
        benchmark: definition.benchmark,
        benchmarkLabel: definition.benchmarkLabel,
        passed: delta >= 0,
        delta,
        direction: definition.direction,
      };
    });
  }

  private buildComparisons(
    runs: EvaluationRun[],
  ): Record<EvaluationComparisonDimension, EvaluationComparisonSummary[]> {
    return {
      models: this.buildComparisonRows(runs, 'models', (run) => run.modelName),
      prompts: this.buildComparisonRows(runs, 'prompts', (run) => run.promptName),
      agents: this.buildComparisonRows(runs, 'agents', (run) => run.agentName),
      ragStrategies: this.buildComparisonRows(runs, 'ragStrategies', (run) => run.ragStrategy),
    };
  }

  private buildComparisonRows(
    runs: EvaluationRun[],
    dimension: EvaluationComparisonDimension,
    labelForRun: (run: EvaluationRun) => string,
  ): EvaluationComparisonSummary[] {
    const groups = runs
      .filter((run) => run.status === 'completed')
      .reduce((map, run) => {
        const label = labelForRun(run) || 'Unspecified';
        const current = map.get(label) || [];
        current.push(run);
        map.set(label, current);
        return map;
      }, new Map<string, EvaluationRun[]>());

    return [...groups.entries()]
      .map(([label, groupRuns]) => {
        const metrics = this.aggregateMetrics(groupRuns);
        const benchmarks = this.buildBenchmarks(metrics);
        return {
          id: `${dimension}-${label.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`,
          dimension,
          label,
          runCount: groupRuns.length,
          sampleCount: groupRuns.reduce((total, run) => total + run.sampleCount, 0),
          metrics,
          benchmarkPassRate: this.round(
            benchmarks.filter((benchmark) => benchmark.passed).length / benchmarks.length,
            4,
          ),
        };
      })
      .sort((a, b) => b.metrics.modelQuality - a.metrics.modelQuality || b.runCount - a.runCount);
  }

  private metricsFromRawScores(rawScores?: EvaluationRawScores): Partial<EvaluationMetrics> {
    if (!rawScores) return {};

    const metrics: Partial<EvaluationMetrics> = {};
    this.assignIfDefined(metrics, 'modelQuality', rawScores.modelQuality);
    this.assignIfDefined(
      metrics,
      'hallucinationRate',
      this.safeRate(rawScores.unsupportedClaims, rawScores.factualClaims),
    );
    this.assignIfDefined(
      metrics,
      'accuracy',
      this.safeRate(rawScores.correctAnswers, rawScores.totalAnswers),
    );
    this.assignIfDefined(
      metrics,
      'retrievalPrecision',
      this.safeRate(rawScores.retrievalRelevantResults, rawScores.retrievalRetrievedResults),
    );
    this.assignIfDefined(
      metrics,
      'toolExecutionSuccess',
      this.safeRate(rawScores.toolExecutionsSucceeded, rawScores.toolExecutionsTotal),
    );
    this.assignIfDefined(
      metrics,
      'workflowSuccess',
      this.safeRate(rawScores.workflowsSucceeded, rawScores.workflowsTotal),
    );
    this.assignIfDefined(
      metrics,
      'userSatisfaction',
      this.safeRate(rawScores.userSatisfactionTotal, rawScores.userSatisfactionResponses),
    );
    this.assignIfDefined(metrics, 'latencyMs', rawScores.latencyMs);
    this.assignIfDefined(metrics, 'costUsd', rawScores.costUsd);
    return metrics;
  }

  private normalizeMetrics(metrics: Partial<EvaluationMetrics>): EvaluationMetrics {
    const normalized = {
      hallucinationRate: this.round(
        this.clamp(metrics.hallucinationRate ?? DEFAULT_METRICS.hallucinationRate, 0, 1),
        4,
      ),
      accuracy: this.round(this.clamp(metrics.accuracy ?? DEFAULT_METRICS.accuracy, 0, 1), 4),
      latencyMs: Math.max(0, Math.round(metrics.latencyMs ?? DEFAULT_METRICS.latencyMs)),
      retrievalPrecision: this.round(
        this.clamp(metrics.retrievalPrecision ?? DEFAULT_METRICS.retrievalPrecision, 0, 1),
        4,
      ),
      toolExecutionSuccess: this.round(
        this.clamp(metrics.toolExecutionSuccess ?? DEFAULT_METRICS.toolExecutionSuccess, 0, 1),
        4,
      ),
      workflowSuccess: this.round(
        this.clamp(metrics.workflowSuccess ?? DEFAULT_METRICS.workflowSuccess, 0, 1),
        4,
      ),
      userSatisfaction: this.round(
        this.clamp(metrics.userSatisfaction ?? DEFAULT_METRICS.userSatisfaction, 0, 5),
        2,
      ),
      costUsd: this.round(Math.max(0, metrics.costUsd ?? DEFAULT_METRICS.costUsd), 2),
    };

    return {
      modelQuality: this.round(
        this.clamp(metrics.modelQuality ?? this.deriveModelQuality(normalized), 0, 1),
        4,
      ),
      ...normalized,
    };
  }

  private deriveModelQuality(metrics: Omit<EvaluationMetrics, 'modelQuality'>): number {
    const latencyScore = 1 - this.clamp(metrics.latencyMs / 2000, 0, 1);
    const costScore = 1 - this.clamp(metrics.costUsd / 30, 0, 1);
    return (
      metrics.accuracy * 0.24 +
      metrics.retrievalPrecision * 0.16 +
      metrics.toolExecutionSuccess * 0.16 +
      metrics.workflowSuccess * 0.16 +
      (1 - metrics.hallucinationRate) * 0.16 +
      latencyScore * 0.06 +
      costScore * 0.06
    );
  }

  private safeRate(numerator?: number, denominator?: number): number | undefined {
    if (numerator === undefined || denominator === undefined || denominator <= 0) return undefined;
    return numerator / denominator;
  }

  private assignIfDefined(
    metrics: Partial<EvaluationMetrics>,
    metricId: EvaluationMetricId,
    value?: number,
  ): void {
    if (value !== undefined) {
      metrics[metricId] = value;
    }
  }

  private clamp(value = 0, min: number, max: number): number {
    return Math.min(max, Math.max(min, value));
  }

  private round(value: number, decimals: number): number {
    const factor = 10 ** decimals;
    return Math.round(value * factor) / factor;
  }

  private formatMetric(definition: EvaluationMetricDefinition, value: number): string {
    if (definition.unit === 'percent') return `${Math.round(value * 100)}%`;
    if (definition.unit === 'milliseconds') return `${Math.round(value)}ms`;
    if (definition.unit === 'usd') return `$${value.toFixed(2)}`;
    return `${value.toFixed(2)}/5`;
  }

  private formatTrendLabel(isoDate: string): string {
    return new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric' }).format(
      new Date(isoDate),
    );
  }

  private bootstrapRuns(): EvaluationRun[] {
    const seeds = this.createSeedRuns();
    const measured = this.loadMeasuredOfflineRun();
    return measured ? [measured, ...seeds] : seeds;
  }

  /**
   * Load latest offline harness dashboard run if present (repo root relative).
   * Path: qa/ai-eval/results/dashboard-run.latest.json
   */
  private loadMeasuredOfflineRun(): EvaluationRun | null {
    const candidates = [
      join(process.cwd(), 'qa', 'ai-eval', 'results', 'dashboard-run.latest.json'),
      join(process.cwd(), '..', 'qa', 'ai-eval', 'results', 'dashboard-run.latest.json'),
      join(
        __dirname,
        '..',
        '..',
        '..',
        '..',
        'qa',
        'ai-eval',
        'results',
        'dashboard-run.latest.json',
      ),
    ];
    for (const filePath of candidates) {
      try {
        if (!existsSync(filePath)) continue;
        const raw = JSON.parse(readFileSync(filePath, 'utf8')) as Partial<EvaluationRun> & {
          metrics?: Partial<EvaluationMetrics> & { userSatisfaction?: number | null };
        };
        if (!raw?.metrics || !raw.evaluatedAt) continue;
        const metrics = this.normalizeMetrics({
          ...raw.metrics,
          // harness may emit null satisfaction
          userSatisfaction:
            raw.metrics.userSatisfaction === null || raw.metrics.userSatisfaction === undefined
              ? 0
              : raw.metrics.userSatisfaction,
        });
        return {
          id: String(raw.id || randomUUID()),
          modelName: String(raw.modelName || 'offline-fixture-harness'),
          promptName: String(raw.promptName || 'n/a-fixture'),
          agentName: String(raw.agentName || 'ai-eval-run-v1'),
          ragStrategy: String(raw.ragStrategy || 'knowledge-registry-keyword-proxy'),
          datasetName: String(raw.datasetName || 'caredroid-ai-eval-v1'),
          status: raw.status === 'failed' ? 'failed' : 'completed',
          sampleCount: Math.max(0, Math.round(Number(raw.sampleCount) || 0)),
          metrics,
          evaluatedAt: String(raw.evaluatedAt),
          notes: String(
            raw.notes ||
              'Measured offline fixtures from npm run ai:eval — not seeded DEFAULT_METRICS',
          ),
          provenance: 'MEASURED',
          seedOnly: false,
          measuredSource: 'qa/ai-eval/results/dashboard-run.latest.json',
        };
      } catch {
        // try next path
      }
    }
    return null;
  }

  private createSeedRuns(): EvaluationRun[] {
    const now = Date.now();
    const day = 24 * 60 * 60 * 1000;
    const seeds: Array<
      Pick<
        EvaluationRun,
        'modelName' | 'promptName' | 'agentName' | 'ragStrategy' | 'datasetName' | 'sampleCount'
      > & {
        metrics: Partial<EvaluationMetrics>;
      }
    > = [
      {
        modelName: 'caredroid-clinical-assistant',
        promptName: 'clinical-system-prompt-v1',
        agentName: 'clinical-assistant-agent',
        ragStrategy: 'guideline-rag',
        datasetName: 'clinical-ai-eval-suite-v1',
        sampleCount: 120,
        metrics: {
          hallucinationRate: 0.052,
          accuracy: 0.884,
          latencyMs: 1040,
          retrievalPrecision: 0.823,
          toolExecutionSuccess: 0.972,
          workflowSuccess: 0.901,
          userSatisfaction: 4.21,
          costUsd: 16.4,
        },
      },
      {
        modelName: 'caredroid-clinical-assistant',
        promptName: 'clinical-system-prompt-v2',
        agentName: 'clinical-assistant-agent',
        ragStrategy: 'guideline-rag',
        datasetName: 'clinical-ai-eval-suite-v1',
        sampleCount: 140,
        metrics: {
          hallucinationRate: 0.047,
          accuracy: 0.901,
          latencyMs: 990,
          retrievalPrecision: 0.846,
          toolExecutionSuccess: 0.981,
          workflowSuccess: 0.918,
          userSatisfaction: 4.32,
          costUsd: 15.1,
        },
      },
      {
        modelName: 'caredroid-rag-router',
        promptName: 'citation-first-prompt-v2',
        agentName: 'retrieval-routing-agent',
        ragStrategy: 'hybrid-guideline-rag',
        datasetName: 'rag-retrieval-benchmark-v2',
        sampleCount: 160,
        metrics: {
          hallucinationRate: 0.041,
          accuracy: 0.918,
          latencyMs: 910,
          retrievalPrecision: 0.872,
          toolExecutionSuccess: 0.988,
          workflowSuccess: 0.936,
          userSatisfaction: 4.47,
          costUsd: 13.7,
        },
      },
      {
        modelName: 'caredroid-rag-router',
        promptName: 'citation-first-prompt-v2',
        agentName: 'retrieval-routing-agent',
        ragStrategy: 'hybrid-guideline-rag',
        datasetName: 'rag-retrieval-benchmark-v2',
        sampleCount: 180,
        metrics: {
          hallucinationRate: 0.037,
          accuracy: 0.929,
          latencyMs: 860,
          retrievalPrecision: 0.891,
          toolExecutionSuccess: 0.993,
          workflowSuccess: 0.951,
          userSatisfaction: 4.58,
          costUsd: 12.5,
        },
      },
      {
        modelName: 'caredroid-moe-clinical-router',
        promptName: 'tool-calling-system-prompt-v3',
        agentName: 'command-center-agent',
        ragStrategy: 'memory-augmented-rag',
        datasetName: 'tool-calling-eval-v2',
        sampleCount: 200,
        metrics: {
          hallucinationRate: 0.033,
          accuracy: 0.936,
          latencyMs: 820,
          retrievalPrecision: 0.902,
          toolExecutionSuccess: 0.996,
          workflowSuccess: 0.962,
          userSatisfaction: 4.66,
          costUsd: 11.8,
        },
      },
    ];

    return seeds.reverse().map((seed, index) => ({
      id: `evaluation-run-${seeds.length - index}`,
      ...seed,
      metrics: this.normalizeMetrics(seed.metrics),
      status: 'completed' as const,
      evaluatedAt: new Date(now - index * 7 * day).toISOString(),
      notes:
        'SEED ONLY — demo trend data. Not measured. Use npm run ai:eval for authoritative offline safety metrics.',
      provenance: 'SEED_ONLY' as const,
      seedOnly: true,
    }));
  }
}
