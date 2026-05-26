import { Injectable } from '@nestjs/common';
import { randomUUID } from 'crypto';
import {
  CreateEvaluationRunDto,
  EvaluationBenchmark,
  EvaluationDashboard,
  EvaluationMetricDefinition,
  EvaluationMetricId,
  EvaluationMetrics,
  EvaluationRawScores,
  EvaluationRun,
  EvaluationTrendPoint,
} from './evaluation.types';

const METRIC_DEFINITIONS: EvaluationMetricDefinition[] = [
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

const DEFAULT_METRICS: EvaluationMetrics = {
  hallucinationRate: 0.038,
  accuracy: 0.924,
  latencyMs: 860,
  retrievalPrecision: 0.887,
  toolExecutionSuccess: 0.991,
  userSatisfaction: 4.55,
  costUsd: 12.8,
};

const METRIC_IDS: EvaluationMetricId[] = METRIC_DEFINITIONS.map((metric) => metric.id);

@Injectable()
export class EvaluationService {
  private readonly runs: EvaluationRun[] = this.createSeedRuns();

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
    const aggregateMetrics = this.aggregateMetrics(runs);

    return {
      generatedAt: new Date().toISOString(),
      metricDefinitions: this.getMetricDefinitions(),
      aggregateMetrics,
      trends: this.buildTrends(runs),
      benchmarks: this.buildBenchmarks(aggregateMetrics),
      runs,
    };
  }

  createRun(dto: CreateEvaluationRunDto = {}): EvaluationRun {
    const rawMetrics = this.metricsFromRawScores(dto.rawScores);
    const metrics = this.normalizeMetrics({
      ...DEFAULT_METRICS,
      ...rawMetrics,
      ...(dto.metrics || {}),
    });

    const run: EvaluationRun = {
      id: randomUUID(),
      modelName: dto.modelName || 'caredroid-clinical-assistant',
      datasetName: dto.datasetName || 'clinical-ai-eval-suite',
      status: dto.status || 'completed',
      sampleCount: Math.max(0, Math.round(dto.sampleCount ?? 100)),
      metrics,
      evaluatedAt: new Date().toISOString(),
      notes: dto.notes,
    };

    this.runs.unshift(run);
    return run;
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
        hallucinationRate: 0,
        accuracy: 0,
        latencyMs: 0,
        retrievalPrecision: 0,
        toolExecutionSuccess: 0,
        userSatisfaction: 0,
        costUsd: 0,
      } satisfies EvaluationMetrics,
    );

    return this.normalizeMetrics({
      hallucinationRate: totals.hallucinationRate / completedRuns.length,
      accuracy: totals.accuracy / completedRuns.length,
      latencyMs: totals.latencyMs / completedRuns.length,
      retrievalPrecision: totals.retrievalPrecision / completedRuns.length,
      toolExecutionSuccess: totals.toolExecutionSuccess / completedRuns.length,
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

  private metricsFromRawScores(rawScores?: EvaluationRawScores): Partial<EvaluationMetrics> {
    if (!rawScores) return {};

    const metrics: Partial<EvaluationMetrics> = {};
    this.assignIfDefined(
      metrics,
      'hallucinationRate',
      this.safeRate(rawScores.unsupportedClaims, rawScores.factualClaims),
    );
    this.assignIfDefined(metrics, 'accuracy', this.safeRate(rawScores.correctAnswers, rawScores.totalAnswers));
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
      'userSatisfaction',
      this.safeRate(rawScores.userSatisfactionTotal, rawScores.userSatisfactionResponses),
    );
    this.assignIfDefined(metrics, 'latencyMs', rawScores.latencyMs);
    this.assignIfDefined(metrics, 'costUsd', rawScores.costUsd);
    return metrics;
  }

  private normalizeMetrics(metrics: EvaluationMetrics): EvaluationMetrics {
    return {
      hallucinationRate: this.round(this.clamp(metrics.hallucinationRate, 0, 1), 4),
      accuracy: this.round(this.clamp(metrics.accuracy, 0, 1), 4),
      latencyMs: Math.max(0, Math.round(metrics.latencyMs || 0)),
      retrievalPrecision: this.round(this.clamp(metrics.retrievalPrecision, 0, 1), 4),
      toolExecutionSuccess: this.round(this.clamp(metrics.toolExecutionSuccess, 0, 1), 4),
      userSatisfaction: this.round(this.clamp(metrics.userSatisfaction, 0, 5), 2),
      costUsd: this.round(Math.max(0, metrics.costUsd || 0), 2),
    };
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

  private createSeedRuns(): EvaluationRun[] {
    const now = Date.now();
    const day = 24 * 60 * 60 * 1000;
    const seeds: Array<Pick<EvaluationRun, 'modelName' | 'datasetName' | 'sampleCount' | 'metrics'>> =
      [
        {
          modelName: 'caredroid-clinical-assistant',
          datasetName: 'clinical-ai-eval-suite-v1',
          sampleCount: 120,
          metrics: {
            hallucinationRate: 0.052,
            accuracy: 0.884,
            latencyMs: 1040,
            retrievalPrecision: 0.823,
            toolExecutionSuccess: 0.972,
            userSatisfaction: 4.21,
            costUsd: 16.4,
          },
        },
        {
          modelName: 'caredroid-clinical-assistant',
          datasetName: 'clinical-ai-eval-suite-v1',
          sampleCount: 140,
          metrics: {
            hallucinationRate: 0.047,
            accuracy: 0.901,
            latencyMs: 990,
            retrievalPrecision: 0.846,
            toolExecutionSuccess: 0.981,
            userSatisfaction: 4.32,
            costUsd: 15.1,
          },
        },
        {
          modelName: 'caredroid-rag-router',
          datasetName: 'rag-retrieval-benchmark-v2',
          sampleCount: 160,
          metrics: {
            hallucinationRate: 0.041,
            accuracy: 0.918,
            latencyMs: 910,
            retrievalPrecision: 0.872,
            toolExecutionSuccess: 0.988,
            userSatisfaction: 4.47,
            costUsd: 13.7,
          },
        },
        {
          modelName: 'caredroid-rag-router',
          datasetName: 'rag-retrieval-benchmark-v2',
          sampleCount: 180,
          metrics: {
            hallucinationRate: 0.037,
            accuracy: 0.929,
            latencyMs: 860,
            retrievalPrecision: 0.891,
            toolExecutionSuccess: 0.993,
            userSatisfaction: 4.58,
            costUsd: 12.5,
          },
        },
        {
          modelName: 'caredroid-moe-clinical-router',
          datasetName: 'tool-calling-eval-v2',
          sampleCount: 200,
          metrics: {
            hallucinationRate: 0.033,
            accuracy: 0.936,
            latencyMs: 820,
            retrievalPrecision: 0.902,
            toolExecutionSuccess: 0.996,
            userSatisfaction: 4.66,
            costUsd: 11.8,
          },
        },
      ];

    return seeds.reverse().map((seed, index) => ({
      id: `evaluation-run-${seeds.length - index}`,
      ...seed,
      metrics: this.normalizeMetrics(seed.metrics),
      status: 'completed',
      evaluatedAt: new Date(now - index * 7 * day).toISOString(),
      notes: 'Seeded benchmark run for dashboard trend baselines.',
    }));
  }
}
