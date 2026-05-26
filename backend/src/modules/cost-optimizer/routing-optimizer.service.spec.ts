import { CacheService } from './cache.service';
import { ComplexityScorerService } from './complexity-scorer.service';
import { CostPredictionService } from './cost-prediction.service';
import { RoutingOptimizerService } from './routing-optimizer.service';

describe('Cost optimizer services', () => {
  let cacheService: CacheService;
  let complexityScorer: ComplexityScorerService;
  let costPrediction: CostPredictionService;
  let routingOptimizer: RoutingOptimizerService;

  beforeEach(() => {
    cacheService = new CacheService();
    complexityScorer = new ComplexityScorerService();
    costPrediction = new CostPredictionService();
    routingOptimizer = new RoutingOptimizerService(complexityScorer, costPrediction, cacheService);
  });

  it('scores requests as simple, medium, and complex', () => {
    expect(complexityScorer.score({ message: 'What is CareDroid?' }).level).toBe('simple');

    expect(
      complexityScorer.score({
        message: 'Summarize the sepsis guideline and cite the protocol.',
        inputTokens: 420,
      }).level,
    ).toBe('medium');

    expect(
      complexityScorer.score({
        message: 'Evaluate this critical patient and recommend the next clinical plan.',
        requiresHumanReview: true,
      }).level,
    ).toBe('complex');
  });

  it('predicts route-specific request and token costs', () => {
    const simple = complexityScorer.score({ message: 'Hello' });
    const medium = complexityScorer.score({
      message: 'Summarize the renal medication guideline with citations.',
      inputTokens: 500,
    });
    const complex = complexityScorer.score({
      message: 'Critical shock case with multiple contraindications.',
      requiresHumanReview: true,
    });

    expect(costPrediction.predict({ complexity: simple }).route).toBe('lightweight_model');
    expect(costPrediction.predict({ complexity: medium }).route).toBe('rag');
    expect(costPrediction.predict({ complexity: complex }).route).toBe('expert_model');
    expect(costPrediction.predict({ complexity: complex }).tokenCostUsd).toBeGreaterThan(
      costPrediction.predict({ complexity: simple }).tokenCostUsd,
    );
  });

  it('routes simple, medium, and complex requests to the expected strategy', () => {
    expect(routingOptimizer.optimizeRequest({ message: 'Hello' }).routing.strategy).toBe(
      'lightweight_model',
    );

    expect(
      routingOptimizer.optimizeRequest({
        message: 'Summarize the cardiology guideline and protocol evidence.',
        inputTokens: 380,
      }).routing.strategy,
    ).toBe('rag');

    expect(
      routingOptimizer.optimizeRequest({
        message: 'Analyze this urgent shock case and produce a safe plan.',
        requiresHumanReview: true,
      }).routing.strategy,
    ).toBe('expert_model');
  });

  it('uses cached routing plans to avoid repeated request cost', () => {
    const request = {
      message: 'Summarize the renal dosing guideline.',
      inputTokens: 420,
    };

    const first = routingOptimizer.optimizeRequest(request);
    const second = routingOptimizer.optimizeRequest(request);
    const dashboard = routingOptimizer.getDashboardMetrics();

    expect(first.cache.hit).toBe(false);
    expect(second.cache.hit).toBe(true);
    expect(second.costPrediction.totalCostUsd).toBe(0);
    expect(dashboard.cache.hitRate).toBe(0.5);
    expect(dashboard.requestCost.totalUsd).toBe(first.costPrediction.totalCostUsd);
    expect(dashboard.tokenCost.totalUsd).toBe(first.costPrediction.tokenCostUsd);
  });

  it('exposes dashboard metrics for request cost, token cost, and cache hit rate', () => {
    routingOptimizer.optimizeRequest({ message: 'Hello' });
    const dashboard = routingOptimizer.getDashboardMetrics();

    expect(dashboard.requestCost.lastUsd).toEqual(expect.any(Number));
    expect(dashboard.tokenCost.lastUsd).toEqual(expect.any(Number));
    expect(dashboard.cache.hitRate).toEqual(expect.any(Number));
    expect(dashboard.totalRequests).toBe(1);
  });
});
