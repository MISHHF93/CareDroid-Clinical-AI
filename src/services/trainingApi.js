import { apiFetchJson, getApiErrorMessage } from './apiClient';
import {
  BACKEND_CAPABILITY_STATUS,
  getBackendCapabilityStatus,
} from '../config/backendApiCapabilities';

export const LOCAL_TRAINING_DASHBOARD = Object.freeze({
  generatedAt: new Date().toISOString(),
  pipeline: [
    {
      id: 'data',
      name: 'Data',
      description: 'Collect curated prompts, references, traces, and evaluation cases.',
      status: 'completed',
      supportedCapabilities: ['prompt_engineering', 'rag', 'moe_routing'],
    },
    {
      id: 'cleaning',
      name: 'Cleaning',
      description: 'Normalize, deduplicate, redact PHI, and split training/eval data.',
      status: 'completed',
      supportedCapabilities: ['prompt_engineering', 'rag', 'lora', 'moe_routing'],
    },
    {
      id: 'labeling',
      name: 'Labeling',
      description: 'Attach intent, safety, retrieval, answer-quality, and routing labels.',
      status: 'completed',
      supportedCapabilities: ['prompt_engineering', 'lora', 'moe_routing'],
    },
    {
      id: 'embeddings',
      name: 'Embeddings',
      description: 'Generate vectors for RAG corpora and retrieval evaluations.',
      status: 'completed',
      supportedCapabilities: ['rag'],
    },
    {
      id: 'lora_tuning',
      name: 'LoRA Tuning',
      description: 'Prepare adapter tuning jobs with safety gates.',
      status: 'ready',
      supportedCapabilities: ['lora'],
    },
    {
      id: 'evaluation',
      name: 'Evaluation',
      description: 'Score accuracy, hallucination rate, precision, latency, and cost.',
      status: 'ready',
      supportedCapabilities: ['prompt_engineering', 'rag', 'lora', 'moe_routing'],
    },
    {
      id: 'deployment',
      name: 'Deployment',
      description: 'Promote approved pipeline changes with rollback metadata.',
      status: 'ready',
      supportedCapabilities: ['prompt_engineering', 'rag', 'lora', 'moe_routing'],
    },
  ],
  capabilities: [
    { id: 'prompt_engineering', name: 'Prompt Engineering', status: 'enabled' },
    { id: 'rag', name: 'RAG', status: 'enabled' },
    { id: 'lora', name: 'LoRA', status: 'enabled' },
    { id: 'moe_routing', name: 'MoE Routing', status: 'enabled' },
  ],
  aggregateMetrics: {
    accuracy: 0.91,
    hallucinationRate: 0.04,
    precision: 0.88,
    latencyMs: 820,
    costUsd: 12.45,
  },
  qualityGates: [
    { id: 'accuracy', label: 'Accuracy', passed: true, threshold: '>= 90%', observed: '91%' },
    {
      id: 'hallucination-rate',
      label: 'Hallucination Rate',
      passed: true,
      threshold: '<= 5%',
      observed: '4%',
    },
    { id: 'precision', label: 'Precision', passed: true, threshold: '>= 85%', observed: '88%' },
    { id: 'latency', label: 'Latency', passed: true, threshold: '<= 1200ms', observed: '820ms' },
    { id: 'cost', label: 'Cost', passed: true, threshold: '<= $25/run', observed: '$12.45' },
  ],
  runs: [],
});

export async function fetchTrainingDashboard() {
  if (getBackendCapabilityStatus('trainingPipeline') === BACKEND_CAPABILITY_STATUS.DISABLED) {
    return {
      ok: false,
      data: LOCAL_TRAINING_DASHBOARD,
      message: 'Training pipeline API is disabled.',
    };
  }

  let response;
  try {
    const result = await apiFetchJson('/training/dashboard');
    response = result.response;
    if (!response.ok) {
      return {
        ok: false,
        data: LOCAL_TRAINING_DASHBOARD,
        message: getApiErrorMessage(null, response),
      };
    }
    return { ok: true, data: result.data, message: '' };
  } catch (error) {
    return {
      ok: false,
      data: LOCAL_TRAINING_DASHBOARD,
      message: getApiErrorMessage(error, response),
    };
  }
}

export async function createTrainingRun(payload = {}) {
  const { response, data } = await apiFetchJson('/training/runs', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  if (!response.ok) {
    throw new Error(getApiErrorMessage(null, response));
  }
  return data;
}
