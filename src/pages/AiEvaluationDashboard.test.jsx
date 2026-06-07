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
    modelQuality: 0.94,
    hallucinationRate: 0.03,
    accuracy: 0.93,
    latencyMs: 780,
    retrievalPrecision: 0.89,
    toolExecutionSuccess: 0.99,
    workflowSuccess: 0.95,
    userSatisfaction: 4.6,
    costUsd: 11.5,
  },
  trends: [
    {
      label: 'Run 1',
      runId: 'run-1',
      metrics: {
        modelQuality: 0.92,
        hallucinationRate: 0.04,
        accuracy: 0.91,
        latencyMs: 840,
        retrievalPrecision: 0.86,
        toolExecutionSuccess: 0.98,
        workflowSuccess: 0.93,
        userSatisfaction: 4.4,
        costUsd: 12.25,
      },
    },
    {
      label: 'Run 2',
      runId: 'run-2',
      metrics: {
        modelQuality: 0.94,
        hallucinationRate: 0.03,
        accuracy: 0.93,
        latencyMs: 780,
        retrievalPrecision: 0.89,
        toolExecutionSuccess: 0.99,
        workflowSuccess: 0.95,
        userSatisfaction: 4.6,
        costUsd: 11.5,
      },
    },
  ],
  benchmarks: [
    {
      id: 'modelQuality',
      label: 'Model quality',
      observedLabel: '94%',
      benchmarkLabel: '>= 90%',
      passed: true,
    },
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
      id: 'workflowSuccess',
      label: 'Workflow success',
      observedLabel: '95%',
      benchmarkLabel: '>= 92%',
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
      promptName: 'tool-calling-system-prompt-v3',
      agentName: 'command-center-agent',
      ragStrategy: 'memory-augmented-rag',
      datasetName: 'tool-calling-eval-v2',
      sampleCount: 160,
      metrics: {
        modelQuality: 0.94,
        accuracy: 0.93,
        workflowSuccess: 0.95,
        costUsd: 11.5,
      },
    },
  ],
  comparisons: {
    models: [
      {
        id: 'models-caredroid-moe-clinical-router',
        label: 'caredroid-moe-clinical-router',
        runCount: 1,
        sampleCount: 160,
        benchmarkPassRate: 1,
        metrics: {
          modelQuality: 0.94,
          hallucinationRate: 0.03,
          toolExecutionSuccess: 0.99,
          workflowSuccess: 0.95,
          latencyMs: 780,
          costUsd: 11.5,
        },
      },
    ],
    prompts: [
      {
        id: 'prompts-tool-calling-system-prompt-v3',
        label: 'tool-calling-system-prompt-v3',
        runCount: 1,
        sampleCount: 160,
        benchmarkPassRate: 1,
        metrics: {
          modelQuality: 0.94,
          hallucinationRate: 0.03,
          toolExecutionSuccess: 0.99,
          workflowSuccess: 0.95,
          latencyMs: 780,
          costUsd: 11.5,
        },
      },
    ],
    agents: [
      {
        id: 'agents-command-center-agent',
        label: 'command-center-agent',
        runCount: 1,
        sampleCount: 160,
        benchmarkPassRate: 1,
        metrics: {
          modelQuality: 0.94,
          hallucinationRate: 0.03,
          toolExecutionSuccess: 0.99,
          workflowSuccess: 0.95,
          latencyMs: 780,
          costUsd: 11.5,
        },
      },
    ],
    ragStrategies: [
      {
        id: 'rag-memory-augmented-rag',
        label: 'memory-augmented-rag',
        runCount: 1,
        sampleCount: 160,
        benchmarkPassRate: 1,
        metrics: {
          modelQuality: 0.94,
          hallucinationRate: 0.03,
          toolExecutionSuccess: 0.99,
          workflowSuccess: 0.95,
          latencyMs: 780,
          costUsd: 11.5,
        },
      },
    ],
  },
}));

vi.mock('../services/evaluationApi', () => ({
  EVALUATION_METRICS: [
    {
      id: 'modelQuality',
      label: 'Model quality',
      unit: 'percent',
      direction: 'higher_is_better',
    },
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
      id: 'workflowSuccess',
      label: 'Workflow success',
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

    expect(screen.getByRole('heading', { level: 1, name: /ai evaluation lab/i })).toBeVisible();
    expect(await screen.findByText('All gates passing')).toBeVisible();
    expect(screen.getAllByText('Model quality').length).toBeGreaterThan(0);
    expect(screen.getAllByText('Hallucination rate').length).toBeGreaterThan(0);
    expect(screen.getByRole('img', { name: /model quality trend/i })).toBeInTheDocument();
    expect(screen.getByRole('img', { name: /quality snapshot chart/i })).toBeInTheDocument();
    expect(screen.getByRole('heading', { level: 2, name: /comparison lab/i })).toBeVisible();
    expect(screen.getAllByText('tool-calling-system-prompt-v3').length).toBeGreaterThan(0);
    expect(screen.getByRole('heading', { level: 2, name: /benchmarks/i })).toBeVisible();
    expect(screen.getAllByText('caredroid-moe-clinical-router').length).toBeGreaterThan(0);
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
