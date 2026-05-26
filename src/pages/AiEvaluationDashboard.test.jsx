import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import AiEvaluationDashboard from './AiEvaluationDashboard';

vi.mock('./AiEvaluationDashboard.css', () => ({}));

const evaluationApiMock = vi.hoisted(() => ({
  fetchEvaluationDashboard: vi.fn(),
}));

const dashboard = vi.hoisted(() => ({
  generatedAt: '2026-05-26T00:00:00.000Z',
  metricDefinitions: [],
  aggregateMetrics: {
    hallucinationRate: 0.03,
    accuracy: 0.93,
    latencyMs: 780,
    retrievalPrecision: 0.89,
    toolExecutionSuccess: 0.99,
    userSatisfaction: 4.6,
    costUsd: 11.5,
  },
  trends: [
    {
      label: 'Run 1',
      runId: 'run-1',
      metrics: {
        hallucinationRate: 0.04,
        accuracy: 0.91,
        latencyMs: 840,
        retrievalPrecision: 0.86,
        toolExecutionSuccess: 0.98,
        userSatisfaction: 4.4,
        costUsd: 12.25,
      },
    },
    {
      label: 'Run 2',
      runId: 'run-2',
      metrics: {
        hallucinationRate: 0.03,
        accuracy: 0.93,
        latencyMs: 780,
        retrievalPrecision: 0.89,
        toolExecutionSuccess: 0.99,
        userSatisfaction: 4.6,
        costUsd: 11.5,
      },
    },
  ],
  benchmarks: [
    {
      id: 'hallucinationRate',
      label: 'Hallucination rate',
      observedLabel: '3%',
      benchmarkLabel: '<= 5%',
      passed: true,
    },
    {
      id: 'accuracy',
      label: 'Accuracy',
      observedLabel: '93%',
      benchmarkLabel: '>= 90%',
      passed: true,
    },
    {
      id: 'latencyMs',
      label: 'Latency',
      observedLabel: '780ms',
      benchmarkLabel: '<= 1200ms',
      passed: true,
    },
    {
      id: 'retrievalPrecision',
      label: 'Retrieval precision',
      observedLabel: '89%',
      benchmarkLabel: '>= 85%',
      passed: true,
    },
    {
      id: 'toolExecutionSuccess',
      label: 'Tool execution success',
      observedLabel: '99%',
      benchmarkLabel: '>= 98%',
      passed: true,
    },
    {
      id: 'userSatisfaction',
      label: 'User satisfaction',
      observedLabel: '4.60/5',
      benchmarkLabel: '>= 4.4/5',
      passed: true,
    },
    {
      id: 'costUsd',
      label: 'Cost',
      observedLabel: '$11.50',
      benchmarkLabel: '<= $18/run',
      passed: true,
    },
  ],
  runs: [
    {
      id: 'run-2',
      modelName: 'caredroid-moe-clinical-router',
      datasetName: 'tool-calling-eval-v2',
      sampleCount: 160,
      metrics: {
        accuracy: 0.93,
        costUsd: 11.5,
      },
    },
  ],
}));

vi.mock('../services/evaluationApi', () => ({
  EVALUATION_METRICS: [
    {
      id: 'hallucinationRate',
      label: 'Hallucination rate',
      unit: 'percent',
      direction: 'lower_is_better',
    },
    { id: 'accuracy', label: 'Accuracy', unit: 'percent', direction: 'higher_is_better' },
    { id: 'latencyMs', label: 'Latency', unit: 'milliseconds', direction: 'lower_is_better' },
    {
      id: 'retrievalPrecision',
      label: 'Retrieval precision',
      unit: 'percent',
      direction: 'higher_is_better',
    },
    {
      id: 'toolExecutionSuccess',
      label: 'Tool execution success',
      unit: 'percent',
      direction: 'higher_is_better',
    },
    {
      id: 'userSatisfaction',
      label: 'User satisfaction',
      unit: 'score',
      direction: 'higher_is_better',
    },
    { id: 'costUsd', label: 'Cost', unit: 'usd', direction: 'lower_is_better' },
  ],
  LOCAL_EVALUATION_DASHBOARD: dashboard,
  fetchEvaluationDashboard: evaluationApiMock.fetchEvaluationDashboard,
}));

describe('AiEvaluationDashboard', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    evaluationApiMock.fetchEvaluationDashboard.mockResolvedValue({
      ok: true,
      message: '',
      data: dashboard,
    });
  });

  it('renders metrics, charts, benchmarks, and trends', async () => {
    render(<AiEvaluationDashboard />);

    expect(screen.getByRole('heading', { level: 1, name: /ai evaluation/i })).toBeVisible();
    expect(await screen.findByText('All gates passing')).toBeVisible();
    expect(screen.getAllByText('Hallucination rate').length).toBeGreaterThan(0);
    expect(screen.getByRole('img', { name: /accuracy trend/i })).toBeInTheDocument();
    expect(screen.getByRole('img', { name: /quality snapshot chart/i })).toBeInTheDocument();
    expect(screen.getByRole('heading', { level: 2, name: /benchmarks/i })).toBeVisible();
    expect(screen.getByText('caredroid-moe-clinical-router')).toBeVisible();
  });

  it('shows a local baseline notice when the API is unavailable', async () => {
    evaluationApiMock.fetchEvaluationDashboard.mockResolvedValue({
      ok: false,
      message: 'API error',
      data: dashboard,
    });

    render(<AiEvaluationDashboard />);

    expect(await screen.findByText(/using local evaluation baselines/i)).toBeVisible();
  });
});
