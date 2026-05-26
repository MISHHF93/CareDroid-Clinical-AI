import { EvaluationService } from './evaluation.service';

describe('EvaluationService', () => {
  let service: EvaluationService;

  beforeEach(() => {
    service = new EvaluationService();
  });

  it('defines the complete AI evaluation metric set', () => {
    expect(service.getMetricDefinitions().map((metric) => metric.id)).toEqual([
      'hallucinationRate',
      'accuracy',
      'latencyMs',
      'retrievalPrecision',
      'toolExecutionSuccess',
      'userSatisfaction',
      'costUsd',
    ]);
  });

  it('builds dashboard trends and benchmark gates', () => {
    const dashboard = service.getDashboard();

    expect(dashboard.trends.length).toBeGreaterThan(0);
    expect(dashboard.benchmarks).toHaveLength(7);
    expect(dashboard.aggregateMetrics.accuracy).toBeGreaterThanOrEqual(0);
    expect(dashboard.aggregateMetrics.retrievalPrecision).toBeGreaterThanOrEqual(0);
    expect(dashboard.benchmarks.every((benchmark) => benchmark.observedLabel)).toBe(true);
  });

  it('creates evaluation runs from raw scoring counters', () => {
    const run = service.createRun({
      modelName: 'candidate-model',
      datasetName: 'golden-clinical-set',
      sampleCount: 50,
      rawScores: {
        factualClaims: 100,
        unsupportedClaims: 3,
        correctAnswers: 46,
        totalAnswers: 50,
        retrievalRelevantResults: 84,
        retrievalRetrievedResults: 100,
        toolExecutionsSucceeded: 49,
        toolExecutionsTotal: 50,
        userSatisfactionTotal: 225,
        userSatisfactionResponses: 50,
        latencyMs: 780,
        costUsd: 9.75,
      },
    });

    expect(run.modelName).toBe('candidate-model');
    expect(run.metrics.hallucinationRate).toBe(0.03);
    expect(run.metrics.accuracy).toBe(0.92);
    expect(run.metrics.toolExecutionSuccess).toBe(0.98);
    expect(run.metrics.userSatisfaction).toBe(4.5);
    expect(service.getRuns()[0].id).toBe(run.id);
  });
});
