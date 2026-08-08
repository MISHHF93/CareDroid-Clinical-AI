import { EvaluationService } from './evaluation.service';

describe('EvaluationService', () => {
  let service: EvaluationService;

  beforeEach(() => {
    service = new EvaluationService();
  });

  it('defines the complete AI evaluation metric set', () => {
    expect(service.getMetricDefinitions().map((metric) => metric.id)).toEqual([
      'modelQuality',
      'hallucinationRate',
      'accuracy',
      'latencyMs',
      'retrievalPrecision',
      'toolExecutionSuccess',
      'workflowSuccess',
      'userSatisfaction',
      'costUsd',
    ]);
  });

  it('builds dashboard trends and benchmark gates', () => {
    const dashboard = service.getDashboard();

    expect(dashboard.trends.length).toBeGreaterThan(0);
    expect(dashboard.benchmarks).toHaveLength(9);
    expect(dashboard.comparisons.models.length).toBeGreaterThan(0);
    expect(dashboard.comparisons.prompts.length).toBeGreaterThan(0);
    expect(dashboard.comparisons.agents.length).toBeGreaterThan(0);
    expect(dashboard.comparisons.ragStrategies.length).toBeGreaterThan(0);
    expect(dashboard.aggregateMetrics.modelQuality).toBeGreaterThanOrEqual(0);
    expect(dashboard.aggregateMetrics.accuracy).toBeGreaterThanOrEqual(0);
    expect(dashboard.aggregateMetrics.retrievalPrecision).toBeGreaterThanOrEqual(0);
    expect(dashboard.benchmarks.every((benchmark) => benchmark.observedLabel)).toBe(true);
    expect(dashboard.honesty).toBeDefined();
    expect(typeof dashboard.honesty?.aggregateIsSeedOnly).toBe('boolean');
    expect(dashboard.honesty?.guidance).toMatch(/seed|measured/i);
    // Seed runs are always labeled for honesty
    expect(dashboard.runs.some((run) => run.seedOnly === true)).toBe(true);
  });

  it('creates evaluation runs from raw scoring counters, explicitly asserted as measured', () => {
    // A real evaluation harness with genuine counted results (unsupportedClaims/
    // factualClaims etc. are real counts, not guesses) explicitly declares
    // seedOnly: false -- the correct way to assert "this is real measured data,"
    // per the 2026-08-08 fix below.
    const run = service.createRun({
      modelName: 'candidate-model',
      promptName: 'candidate-prompt',
      agentName: 'candidate-agent',
      ragStrategy: 'candidate-rag',
      datasetName: 'golden-clinical-set',
      sampleCount: 50,
      seedOnly: false,
      rawScores: {
        modelQuality: 0.94,
        factualClaims: 100,
        unsupportedClaims: 3,
        correctAnswers: 46,
        totalAnswers: 50,
        retrievalRelevantResults: 84,
        retrievalRetrievedResults: 100,
        toolExecutionsSucceeded: 49,
        toolExecutionsTotal: 50,
        workflowsSucceeded: 47,
        workflowsTotal: 50,
        userSatisfactionTotal: 225,
        userSatisfactionResponses: 50,
        latencyMs: 780,
        costUsd: 9.75,
      },
    });

    expect(run.modelName).toBe('candidate-model');
    expect(run.promptName).toBe('candidate-prompt');
    expect(run.agentName).toBe('candidate-agent');
    expect(run.ragStrategy).toBe('candidate-rag');
    expect(run.metrics.modelQuality).toBe(0.94);
    expect(run.metrics.hallucinationRate).toBe(0.03);
    expect(run.metrics.accuracy).toBe(0.92);
    expect(run.metrics.toolExecutionSuccess).toBe(0.98);
    expect(run.metrics.workflowSuccess).toBe(0.94);
    expect(run.metrics.userSatisfaction).toBe(4.5);
    expect(run.seedOnly).toBe(false);
    expect(service.getRuns()[0].id).toBe(run.id);
  });

  describe('seedOnly provenance (2026-08-08 regression)', () => {
    // Regression guard for a real bug: chat.service.ts's live-turn calls to
    // createRun() (fabricated hallucinationRate/userSatisfaction figures, no
    // real detection/rating behind them) were silently treated as MEASURED
    // data by getDashboard()'s `!run.seedOnly` filter, because seedOnly
    // wasn't settable on the DTO at all and createRun() never set it --
    // undefined reads as "not seed-only" i.e. measured. Fixed by defaulting
    // to the safe (unmeasured) state unless a caller explicitly opts out.

    it('defaults a run to seedOnly: true when the caller does not specify it', () => {
      const run = service.createRun({ modelName: 'unlabeled-caller' });
      expect(run.seedOnly).toBe(true);
    });

    it('excludes a default-seedOnly run from the dashboard "measured" aggregate pool', () => {
      const before = service.getDashboard();
      const beforeMeasuredCount = before.honesty?.measuredRunCount ?? 0;

      service.createRun({
        modelName: 'chat-live-turn-simulation',
        metrics: { hallucinationRate: 0.02, userSatisfaction: 4.5 },
        // seedOnly intentionally omitted, matching chat.service.ts's real call shape
        // before its own explicit `seedOnly: true` was added -- this proves the
        // SERVICE's default alone is sufficient, independent of any one caller
        // remembering to set it.
      });

      const after = service.getDashboard();
      expect(after.honesty?.measuredRunCount ?? 0).toBe(beforeMeasuredCount);
      expect(after.honesty?.seedRunCount).toBeGreaterThan(before.honesty?.seedRunCount ?? 0);
    });

    it('includes an explicit seedOnly: false run in the dashboard "measured" aggregate pool', () => {
      const before = service.getDashboard();
      const beforeMeasuredCount = before.honesty?.measuredRunCount ?? 0;

      service.createRun({
        modelName: 'real-harness-run',
        seedOnly: false,
        rawScores: { correctAnswers: 9, totalAnswers: 10 },
      });

      const after = service.getDashboard();
      expect(after.honesty?.measuredRunCount ?? 0).toBe(beforeMeasuredCount + 1);
      expect(after.honesty?.aggregateIsSeedOnly).toBe(false);
    });
  });
});
