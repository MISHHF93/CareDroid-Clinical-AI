import { NotFoundException } from '@nestjs/common';
import { ExpertSelectorService } from '../moe-router/expert-selector.service';
import { MoERouterService } from '../moe-router/moe-router.service';
import { TrainingService } from './training.service';

describe('TrainingService', () => {
  let service: TrainingService;

  beforeEach(() => {
    service = new TrainingService(new MoERouterService(new ExpertSelectorService()));
  });

  it('exposes the full training pipeline in order', () => {
    expect(service.getPipeline().map((stage) => stage.id)).toEqual([
      'data',
      'cleaning',
      'labeling',
      'embeddings',
      'lora_tuning',
      'evaluation',
      'deployment',
    ]);
  });

  it('reports required evaluation metrics and quality gates', () => {
    const dashboard = service.getDashboard();

    expect(dashboard.aggregateMetrics).toEqual(
      expect.objectContaining({
        accuracy: expect.any(Number),
        hallucinationRate: expect.any(Number),
        precision: expect.any(Number),
        latencyMs: expect.any(Number),
        costUsd: expect.any(Number),
      }),
    );
    expect(dashboard.qualityGates.map((gate) => gate.id)).toEqual([
      'accuracy',
      'hallucination-rate',
      'precision',
      'latency',
      'cost',
    ]);
  });

  it('creates and evaluates LoRA/RAG/MoE training runs', () => {
    const run = service.createRun({
      modelName: 'clinical-lora-adapter',
      datasetName: 'eval-v2',
      capabilities: ['lora', 'rag', 'moe_routing'],
    });

    expect(run.status).toBe('queued');
    expect(run.capabilities).toEqual(['lora', 'rag', 'moe_routing']);

    const evaluated = service.evaluateRun(run.id, {
      accuracy: 0.94,
      hallucinationRate: 0.03,
      precision: 0.9,
      latencyMs: 760,
      costUsd: 9.5,
    });

    expect(evaluated.status).toBe('completed');
    expect(evaluated.currentStage).toBe('evaluation');
    expect(evaluated.metrics.accuracy).toBe(0.94);
  });

  it('raises for unknown training runs', () => {
    expect(() => service.evaluateRun('missing', {})).toThrow(NotFoundException);
  });

  it('builds a MoE routing training plan', () => {
    const plan = service.getMoeTrainingPlan('Evaluate cardiology and nephrology routing.');

    expect(plan.selectedExpert).toBeDefined();
    expect(plan.costPlan.estimatedCost).toBeGreaterThan(0);
    expect(plan.safetyPlan.requiresHumanReview).toBe(true);
  });
});
