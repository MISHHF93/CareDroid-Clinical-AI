import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import TrainingDashboard from './TrainingDashboard';

vi.mock('./TrainingDashboard.css', () => ({}));

const trainingApiMock = vi.hoisted(() => ({
  fetchTrainingDashboard: vi.fn(),
  createTrainingRun: vi.fn(),
}));

vi.mock('../services/trainingApi', () => ({
  LOCAL_TRAINING_DASHBOARD: {
    generatedAt: '2026-05-26T00:00:00.000Z',
    pipeline: [
      {
        id: 'data',
        name: 'Data',
        description: 'Collect training data.',
        status: 'completed',
        supportedCapabilities: ['prompt_engineering'],
      },
      {
        id: 'cleaning',
        name: 'Cleaning',
        description: 'Clean and redact data.',
        status: 'completed',
        supportedCapabilities: ['rag'],
      },
      {
        id: 'labeling',
        name: 'Labeling',
        description: 'Attach labels.',
        status: 'ready',
        supportedCapabilities: ['moe_routing'],
      },
      {
        id: 'embeddings',
        name: 'Embeddings',
        description: 'Generate vectors.',
        status: 'ready',
        supportedCapabilities: ['rag'],
      },
      {
        id: 'lora_tuning',
        name: 'LoRA Tuning',
        description: 'Tune adapters.',
        status: 'ready',
        supportedCapabilities: ['lora'],
      },
      {
        id: 'evaluation',
        name: 'Evaluation',
        description: 'Score model quality.',
        status: 'ready',
        supportedCapabilities: ['lora'],
      },
      {
        id: 'deployment',
        name: 'Deployment',
        description: 'Deploy approved models.',
        status: 'ready',
        supportedCapabilities: ['moe_routing'],
      },
    ],
    capabilities: [
      { id: 'prompt_engineering', name: 'Prompt Engineering', status: 'enabled' },
      { id: 'rag', name: 'RAG', status: 'enabled' },
      { id: 'lora', name: 'LoRA', status: 'enabled' },
      { id: 'moe_routing', name: 'MoE Routing', status: 'enabled' },
    ],
    aggregateMetrics: {
      accuracy: 0.92,
      hallucinationRate: 0.03,
      precision: 0.89,
      latencyMs: 740,
      costUsd: 11.25,
    },
    qualityGates: [
      { id: 'accuracy', label: 'Accuracy', passed: true, threshold: '>= 90%', observed: '92%' },
      {
        id: 'hallucination-rate',
        label: 'Hallucination Rate',
        passed: true,
        threshold: '<= 5%',
        observed: '3%',
      },
    ],
    runs: [],
  },
  fetchTrainingDashboard: trainingApiMock.fetchTrainingDashboard,
  createTrainingRun: trainingApiMock.createTrainingRun,
}));

describe('TrainingDashboard', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    trainingApiMock.fetchTrainingDashboard.mockResolvedValue({
      ok: true,
      message: '',
      data: {
        generatedAt: '2026-05-26T00:00:00.000Z',
        pipeline: [
          {
            id: 'data',
            name: 'Data',
            description: 'Collect training data.',
            status: 'completed',
            supportedCapabilities: ['prompt_engineering'],
          },
          {
            id: 'cleaning',
            name: 'Cleaning',
            description: 'Clean and redact data.',
            status: 'completed',
            supportedCapabilities: ['rag'],
          },
          {
            id: 'labeling',
            name: 'Labeling',
            description: 'Attach labels.',
            status: 'ready',
            supportedCapabilities: ['moe_routing'],
          },
          {
            id: 'embeddings',
            name: 'Embeddings',
            description: 'Generate vectors.',
            status: 'ready',
            supportedCapabilities: ['rag'],
          },
          {
            id: 'lora_tuning',
            name: 'LoRA Tuning',
            description: 'Tune adapters.',
            status: 'ready',
            supportedCapabilities: ['lora'],
          },
          {
            id: 'evaluation',
            name: 'Evaluation',
            description: 'Score model quality.',
            status: 'ready',
            supportedCapabilities: ['lora'],
          },
          {
            id: 'deployment',
            name: 'Deployment',
            description: 'Deploy approved models.',
            status: 'ready',
            supportedCapabilities: ['moe_routing'],
          },
        ],
        capabilities: [
          { id: 'prompt_engineering', name: 'Prompt Engineering', status: 'enabled' },
          { id: 'rag', name: 'RAG', status: 'enabled' },
          { id: 'lora', name: 'LoRA', status: 'enabled' },
          { id: 'moe_routing', name: 'MoE Routing', status: 'enabled' },
        ],
        aggregateMetrics: {
          accuracy: 0.92,
          hallucinationRate: 0.03,
          precision: 0.89,
          latencyMs: 740,
          costUsd: 11.25,
        },
        qualityGates: [
          { id: 'accuracy', label: 'Accuracy', passed: true, threshold: '>= 90%', observed: '92%' },
          {
            id: 'hallucination-rate',
            label: 'Hallucination Rate',
            passed: true,
            threshold: '<= 5%',
            observed: '3%',
          },
        ],
        runs: [
          {
            id: 'run-1',
            modelName: 'caredroid-router',
            datasetName: 'eval-v1',
            currentStage: 'evaluation',
            status: 'completed',
            metrics: {
              accuracy: 0.92,
              hallucinationRate: 0.03,
              precision: 0.89,
              latencyMs: 740,
              costUsd: 11.25,
            },
          },
        ],
      },
    });
    trainingApiMock.createTrainingRun.mockResolvedValue({
      id: 'run-2',
      modelName: 'caredroid-clinical-assistant',
      datasetName: 'clinical-training-corpus',
      currentStage: 'data',
      status: 'queued',
      metrics: {
        accuracy: 0,
        hallucinationRate: 0,
        precision: 0,
        latencyMs: 0,
        costUsd: 0,
      },
    });
  });

  it('renders pipeline stages, capabilities, and evaluation metrics', async () => {
    render(<TrainingDashboard />);

    expect(screen.getByRole('heading', { level: 1, name: /training dashboard/i })).toBeVisible();
    expect(await screen.findByText('LoRA Tuning')).toBeVisible();
    expect(screen.getByText('MoE Routing')).toBeVisible();
    expect(screen.getByText('Hallucination rate')).toBeVisible();
    expect(screen.getByText('740 ms')).toBeVisible();
    expect(screen.getByText('$11.25')).toBeVisible();
  });

  it('queues a new training run', async () => {
    const user = userEvent.setup();
    render(<TrainingDashboard />);

    await user.click(screen.getByRole('button', { name: /queue training run/i }));

    await waitFor(() => expect(trainingApiMock.createTrainingRun).toHaveBeenCalled());
    expect(await screen.findByText('Queued a new training pipeline run.')).toBeVisible();
    expect(screen.getByText('caredroid-clinical-assistant')).toBeVisible();
  });
});
