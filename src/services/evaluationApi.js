import { apiFetchJson, getApiErrorMessage } from './apiClient';
import {
  BACKEND_CAPABILITY_STATUS,
  getBackendCapabilityStatus,
} from '../config/backendApiCapabilities';

export const EVALUATION_METRICS = Object.freeze([
  {
    id: 'hallucinationRate',
    label: 'Hallucination rate',
    unit: 'percent',
    direction: 'lower_is_better',
    benchmark: 0.05,
    benchmarkLabel: '<= 5%',
  },
  {
    id: 'accuracy',
    label: 'Accuracy',
    unit: 'percent',
    direction: 'higher_is_better',
    benchmark: 0.9,
    benchmarkLabel: '>= 90%',
  },
  {
    id: 'latencyMs',
    label: 'Latency',
    unit: 'milliseconds',
    direction: 'lower_is_better',
    benchmark: 1200,
    benchmarkLabel: '<= 1200ms',
  },
  {
    id: 'retrievalPrecision',
    label: 'Retrieval precision',
    unit: 'percent',
    direction: 'higher_is_better',
    benchmark: 0.85,
    benchmarkLabel: '>= 85%',
  },
  {
    id: 'toolExecutionSuccess',
    label: 'Tool execution success',
    unit: 'percent',
    direction: 'higher_is_better',
    benchmark: 0.98,
    benchmarkLabel: '>= 98%',
  },
  {
    id: 'userSatisfaction',
    label: 'User satisfaction',
    unit: 'score',
    direction: 'higher_is_better',
    benchmark: 4.4,
    benchmarkLabel: '>= 4.4/5',
  },
  {
    id: 'costUsd',
    label: 'Cost',
    unit: 'usd',
    direction: 'lower_is_better',
    benchmark: 18,
    benchmarkLabel: '<= $18/run',
  },
]);

const LOCAL_TREND_METRICS = [
  {
    hallucinationRate: 0.052,
    accuracy: 0.884,
    latencyMs: 1040,
    retrievalPrecision: 0.823,
    toolExecutionSuccess: 0.972,
    userSatisfaction: 4.21,
    costUsd: 16.4,
  },
  {
    hallucinationRate: 0.047,
    accuracy: 0.901,
    latencyMs: 990,
    retrievalPrecision: 0.846,
    toolExecutionSuccess: 0.981,
    userSatisfaction: 4.32,
    costUsd: 15.1,
  },
  {
    hallucinationRate: 0.041,
    accuracy: 0.918,
    latencyMs: 910,
    retrievalPrecision: 0.872,
    toolExecutionSuccess: 0.988,
    userSatisfaction: 4.47,
    costUsd: 13.7,
  },
  {
    hallucinationRate: 0.037,
    accuracy: 0.929,
    latencyMs: 860,
    retrievalPrecision: 0.891,
    toolExecutionSuccess: 0.993,
    userSatisfaction: 4.58,
    costUsd: 12.5,
  },
  {
    hallucinationRate: 0.033,
    accuracy: 0.936,
    latencyMs: 820,
    retrievalPrecision: 0.902,
    toolExecutionSuccess: 0.996,
    userSatisfaction: 4.66,
    costUsd: 11.8,
  },
];

function averageMetric(metricId) {
  return (
    LOCAL_TREND_METRICS.reduce((total, metrics) => total + metrics[metricId], 0) /
    LOCAL_TREND_METRICS.length
  );
}

function formatMetric(metric, value) {
  if (metric.unit === 'percent') return `${Math.round(value * 100)}%`;
  if (metric.unit === 'milliseconds') return `${Math.round(value)}ms`;
  if (metric.unit === 'usd') return `$${Number(value || 0).toFixed(2)}`;
  return `${Number(value || 0).toFixed(2)}/5`;
}

function buildBenchmarks(metrics) {
  return EVALUATION_METRICS.map((metric) => {
    const observed = metrics[metric.id];
    const delta =
      metric.direction === 'higher_is_better'
        ? observed - metric.benchmark
        : metric.benchmark - observed;

    return {
      ...metric,
      observed,
      observedLabel: formatMetric(metric, observed),
      passed: delta >= 0,
      delta,
    };
  });
}

const aggregateMetrics = Object.freeze(
  Object.fromEntries(EVALUATION_METRICS.map((metric) => [metric.id, averageMetric(metric.id)]))
);

export const LOCAL_EVALUATION_DASHBOARD = Object.freeze({
  generatedAt: new Date().toISOString(),
  metricDefinitions: EVALUATION_METRICS,
  aggregateMetrics,
  trends: LOCAL_TREND_METRICS.map((metrics, index) => ({
    label: `Run ${index + 1}`,
    runId: `local-evaluation-run-${index + 1}`,
    evaluatedAt: new Date(Date.now() - (LOCAL_TREND_METRICS.length - index) * 7 * 24 * 60 * 60 * 1000).toISOString(),
    metrics,
  })),
  benchmarks: buildBenchmarks(aggregateMetrics),
  runs: LOCAL_TREND_METRICS.slice()
    .reverse()
    .map((metrics, index) => ({
      id: `local-evaluation-run-${LOCAL_TREND_METRICS.length - index}`,
      modelName: index < 2 ? 'caredroid-moe-clinical-router' : 'caredroid-clinical-assistant',
      datasetName: index < 2 ? 'tool-calling-eval-v2' : 'clinical-ai-eval-suite-v1',
      status: 'completed',
      sampleCount: 120 + index * 20,
      metrics,
      evaluatedAt: new Date(Date.now() - index * 7 * 24 * 60 * 60 * 1000).toISOString(),
    })),
});

export async function fetchEvaluationDashboard() {
  if (getBackendCapabilityStatus('evaluationFramework') === BACKEND_CAPABILITY_STATUS.DISABLED) {
    return {
      ok: false,
      data: LOCAL_EVALUATION_DASHBOARD,
      message: 'Evaluation API is disabled.',
    };
  }

  let response;
  try {
    const result = await apiFetchJson('/evaluation/dashboard');
    response = result.response;
    if (!response.ok) {
      return {
        ok: false,
        data: LOCAL_EVALUATION_DASHBOARD,
        message: getApiErrorMessage(null, response),
      };
    }
    return { ok: true, data: result.data, message: '' };
  } catch (error) {
    return {
      ok: false,
      data: LOCAL_EVALUATION_DASHBOARD,
      message: getApiErrorMessage(error, response),
    };
  }
}

export async function createEvaluationRun(payload = {}) {
  const { response, data } = await apiFetchJson('/evaluation/runs', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  if (!response.ok) {
    throw new Error(getApiErrorMessage(null, response));
  }
  return data;
}
