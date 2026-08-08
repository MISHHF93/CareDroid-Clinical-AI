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
      'intent_routing',
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

  // 2026-08-08: this module is a structural sibling of
  // backend/src/modules/evaluation/, which had a real bug where fabricated
  // per-turn metrics were silently treated as measured. This module had the
  // exact same class of bug, worse: POST /training/runs/:runId/evaluate
  // accepted arbitrary caller-supplied accuracy/hallucinationRate/precision/
  // latencyMs/costUsd values with NO provenance concept at all, and merged
  // them straight into aggregateMetrics/Quality Gates identically to a real
  // measured run. These tests guard the fix (lib/ai/provenanceContract.ts's
  // EvaluationMetricProvenance taxonomy, applied here the same way it was
  // applied to EvaluationService).
  describe('evaluation metric provenance taxonomy (2026-08-08)', () => {
    it('newly queued runs start as generative, UNKNOWN provenance -- never MEASURED', () => {
      const run = service.createRun({ modelName: 'clinical-lora-adapter' });
      expect(run.modelType).toBe('generative');
      expect(run.provenance).toBe('UNKNOWN');
    });

    it('evaluateRun with caller-supplied numbers but no provenance resolves to UNKNOWN, not MEASURED', () => {
      const run = service.createRun({ modelName: 'unverified-caller' });
      const evaluated = service.evaluateRun(run.id, {
        accuracy: 0.99,
        hallucinationRate: 0.01,
        precision: 0.98,
        latencyMs: 100,
        costUsd: 1,
      });
      expect(evaluated.provenance).toBe('UNKNOWN');
    });

    it('evaluateRun honors an explicit, valid provenance value', () => {
      const run = service.createRun({ modelName: 'reviewed-adapter' });
      const evaluated = service.evaluateRun(run.id, {
        accuracy: 0.94,
        hallucinationRate: 0.03,
        precision: 0.9,
        latencyMs: 760,
        costUsd: 9.5,
        provenance: 'HUMAN_REVIEWED',
      });
      expect(evaluated.provenance).toBe('HUMAN_REVIEWED');
    });

    it('evaluateRun ignores an unrecognized provenance string, falling back to UNKNOWN', () => {
      const run = service.createRun({ modelName: 'bad-input' });
      const evaluated = service.evaluateRun(run.id, {
        accuracy: 0.99,
        provenance: 'TOTALLY_MADE_UP' as any,
      });
      expect(evaluated.provenance).toBe('UNKNOWN');
    });

    it('the bootstrap dashboard (seed classifier runs only) is not promotion-eligible', () => {
      const dashboard = service.getDashboard();
      expect(dashboard.honesty.aggregateIsPromotionEligible).toBe(false);
      expect(dashboard.honesty.promotionEligibleRunCount).toBe(0);
    });

    it('an UNKNOWN-provenance evaluated run does not make the aggregate promotion-eligible, however good its numbers look', () => {
      const run = service.createRun({ modelName: 'unverified-caller-2' });
      service.evaluateRun(run.id, {
        accuracy: 0.999,
        hallucinationRate: 0,
        precision: 0.999,
        latencyMs: 1,
        costUsd: 0,
      });

      const dashboard = service.getDashboard();
      expect(dashboard.honesty.aggregateIsPromotionEligible).toBe(false);
      expect(dashboard.honesty.promotionEligibleRunCount).toBe(0);
    });

    it('a HUMAN_REVIEWED evaluated run enters the promotion-eligible pool and is preferred over seed/unknown runs', () => {
      const run = service.createRun({ modelName: 'reviewed-adapter-2' });
      service.evaluateRun(run.id, {
        accuracy: 0.97,
        hallucinationRate: 0.02,
        precision: 0.95,
        latencyMs: 500,
        costUsd: 5,
        provenance: 'HUMAN_REVIEWED',
      });

      const dashboard = service.getDashboard();
      expect(dashboard.honesty.aggregateIsPromotionEligible).toBe(true);
      expect(dashboard.honesty.promotionEligibleRunCount).toBe(1);
      // Aggregate reflects only the eligible run, not blended with the 2 SYNTHETIC seeds.
      expect(dashboard.aggregateMetrics.accuracy).toBe(0.97);
    });

    it('the hallucination-rate gate is marked inapplicable when only classifier runs are aggregated', () => {
      const dashboard = service.getDashboard();
      const gate = dashboard.qualityGates.find((g) => g.id === 'hallucination-rate');
      expect(gate?.applicable).toBe(false);
    });

    it('the hallucination-rate gate becomes applicable once a measured generative run enters the aggregate', () => {
      const run = service.createRun({ modelName: 'reviewed-adapter-3' });
      service.evaluateRun(run.id, {
        accuracy: 0.96,
        hallucinationRate: 0.02,
        precision: 0.94,
        latencyMs: 400,
        costUsd: 4,
        provenance: 'MEASURED',
      });

      const dashboard = service.getDashboard();
      const gate = dashboard.qualityGates.find((g) => g.id === 'hallucination-rate');
      expect(gate?.applicable).toBe(true);
    });
  });

  it('builds a MoE routing training plan', () => {
    const plan = service.getMoeTrainingPlan('Evaluate cardiology and nephrology routing.');

    expect(plan.selectedExpert).toBeDefined();
    expect(plan.costPlan.estimatedCost).toBeGreaterThan(0);
    expect(plan.safetyPlan.requiresHumanReview).toBe(true);
  });
});
