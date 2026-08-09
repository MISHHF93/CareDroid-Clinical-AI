import { Injectable, Optional } from '@nestjs/common';
import { randomUUID } from 'crypto';
import { MetricsService } from '../metrics/metrics.service';
import { CacheService } from './cache.service';
import { ComplexityScorerService } from './complexity-scorer.service';
import { CostPredictionService } from './cost-prediction.service';
import {
  ComplexityLevel,
  CostOptimizationRequest,
  CostOptimizerDashboardMetrics,
  RouteOptimizationResult,
  RoutingPlan,
  RoutingStrategy,
} from './cost-optimizer.types';

/**
 * Cost-ESTIMATION tool, not a real routing decision. `optimizeRequest()`'s
 * `RoutingPlan.model`/`.strategy` (`lightweight_model`/`rag`/`expert_model`,
 * fictional model names like `caredroid-lightweight-mini`) never influence
 * which real model actually answers a request -- verified 2026-08-09 by
 * tracing chat.service.ts's real ED Copilot call path
 * (`invokeAnthropicEdCopilot` -> `unifiedAIClient.request()`), which never
 * reads the `costOptimization` this service computes. Every real request is
 * served by the same configured provider/model (`AI_PROVIDER`); this class
 * predicts what cost/routing WOULD look like under a hypothetical tiered
 * architecture, for planning/dashboard purposes. `AiCommandCenterDashboard`
 * discloses this (see its "Cost-Tier Routing (Estimated)" section) --
 * before that fix, the dashboard's "Tool Routing" panel showed these
 * fictional tiers with no disclosure, reading as real operational
 * model-dispatch tracking.
 */
@Injectable()
export class RoutingOptimizerService {
  private totalRequests = 0;
  private totalRequestCostUsd = 0;
  private totalTokenCostUsd = 0;
  private lastRequestCostUsd = 0;
  private lastTokenCostUsd = 0;
  private readonly routeCounts: Record<RoutingStrategy, number> = {
    lightweight_model: 0,
    rag: 0,
    expert_model: 0,
  };
  private readonly complexityCounts: Record<ComplexityLevel, number> = {
    simple: 0,
    medium: 0,
    complex: 0,
  };

  constructor(
    private readonly complexityScorer: ComplexityScorerService,
    private readonly costPredictionService: CostPredictionService,
    private readonly cacheService: CacheService,
    @Optional() private readonly metricsService?: MetricsService,
  ) {}

  optimizeRequest(request: CostOptimizationRequest = {}): RouteOptimizationResult {
    const requestId = request.requestId || randomUUID();
    const cacheKey = request.cacheKey || this.cacheService.buildKey(this.cacheKeyPayload(request));
    const ttlSeconds = this.cacheService.defaultTtlSeconds;

    if (request.useCache !== false) {
      const cachedResult = this.cacheService.get<RouteOptimizationResult>(cacheKey);
      if (cachedResult) {
        const result = this.withCacheHit(cachedResult, requestId, cacheKey, ttlSeconds);
        this.recordMetrics(result, true);
        return result;
      }
      this.metricsService?.recordCacheOperation('cost_optimizer_route', 'miss');
    }

    const complexity = this.complexityScorer.score(request);
    const costPrediction = this.costPredictionService.predict({
      complexity,
      expectedOutputTokens: request.expectedOutputTokens,
      maxOutputTokens: request.maxOutputTokens,
    });
    const routing = this.createRoutingPlan(complexity.level, costPrediction.route);
    const result: RouteOptimizationResult = {
      requestId,
      createdAt: new Date().toISOString(),
      complexity,
      costPrediction,
      routing,
      cache: {
        key: cacheKey,
        hit: false,
        ttlSeconds,
      },
    };

    if (request.useCache !== false) {
      this.cacheService.set(cacheKey, result, ttlSeconds);
    }

    this.recordMetrics(result, false);
    return result;
  }

  getDashboardMetrics(): CostOptimizerDashboardMetrics {
    return {
      generatedAt: new Date().toISOString(),
      totalRequests: this.totalRequests,
      requestCost: {
        lastUsd: this.lastRequestCostUsd,
        totalUsd: this.roundCost(this.totalRequestCostUsd),
        averageUsd: this.average(this.totalRequestCostUsd),
      },
      tokenCost: {
        lastUsd: this.lastTokenCostUsd,
        totalUsd: this.roundCost(this.totalTokenCostUsd),
        averageUsd: this.average(this.totalTokenCostUsd),
      },
      cache: this.cacheService.getStats(),
      routeCounts: { ...this.routeCounts },
      complexityCounts: { ...this.complexityCounts },
    };
  }

  private withCacheHit(
    cachedResult: RouteOptimizationResult,
    requestId: string,
    cacheKey: string,
    ttlSeconds: number,
  ): RouteOptimizationResult {
    const costPrediction = this.costPredictionService.predict({
      complexity: cachedResult.complexity,
      expectedOutputTokens: cachedResult.costPrediction.estimatedOutputTokens,
      maxOutputTokens: cachedResult.routing.maxTokens,
      cacheHit: true,
    });

    return {
      ...cachedResult,
      requestId,
      createdAt: new Date().toISOString(),
      costPrediction,
      cache: {
        key: cacheKey,
        hit: true,
        ttlSeconds,
      },
    };
  }

  private createRoutingPlan(level: ComplexityLevel, route: RoutingStrategy): RoutingPlan {
    const maxTokens = this.costPredictionService.maxTokensFor(level);

    if (route === 'lightweight_model') {
      return {
        strategy: route,
        model: 'caredroid-lightweight-mini',
        description: 'Route simple requests directly to the lightweight model.',
        useRag: false,
        useExpertModel: false,
        maxTokens,
        fallbackModel: 'caredroid-rag-mini',
        rationale: 'Low complexity and short context keep latency and token spend minimal.',
      };
    }

    if (route === 'rag') {
      return {
        strategy: route,
        model: 'caredroid-rag-mini',
        description: 'Route medium requests through retrieval-augmented generation.',
        useRag: true,
        useExpertModel: false,
        maxTokens,
        fallbackModel: 'caredroid-clinical-expert',
        rationale: 'Moderate complexity benefits from grounding before generation.',
      };
    }

    return {
      strategy: route,
      model: 'caredroid-clinical-expert',
      description: 'Route complex requests to the expert model.',
      useRag: true,
      useExpertModel: true,
      maxTokens,
      rationale: 'High-risk or multi-step clinical work needs the expert model path.',
    };
  }

  private recordMetrics(result: RouteOptimizationResult, cacheHit: boolean): void {
    const actualRequestCost = result.costPrediction.totalCostUsd;
    const actualTokenCost = cacheHit ? 0 : result.costPrediction.tokenCostUsd;

    this.totalRequests += 1;
    this.lastRequestCostUsd = actualRequestCost;
    this.lastTokenCostUsd = actualTokenCost;
    this.totalRequestCostUsd += actualRequestCost;
    this.totalTokenCostUsd += actualTokenCost;
    this.routeCounts[result.routing.strategy] += 1;
    this.complexityCounts[result.complexity.level] += 1;

    this.metricsService?.cacheHitRate.set(this.cacheService.getStats().hitRate);
    this.metricsService?.recordCacheOperation('cost_optimizer_route', cacheHit ? 'hit' : 'success');

    if (actualRequestCost > 0) {
      this.metricsService?.recordOpenaiCost(result.costPrediction.model, actualRequestCost);
    }
  }

  private cacheKeyPayload(request: CostOptimizationRequest): Record<string, unknown> {
    return {
      prompt: request.prompt,
      message: request.message,
      inputTokens: request.inputTokens,
      expectedOutputTokens: request.expectedOutputTokens,
      maxOutputTokens: request.maxOutputTokens,
      sourceSurface: request.sourceSurface,
      featureHint: request.featureHint,
      toolHint: request.toolHint,
      requiresHumanReview: request.requiresHumanReview,
      structuredPayload: request.structuredPayload,
    };
  }

  private average(total: number): number {
    return this.totalRequests === 0 ? 0 : this.roundCost(total / this.totalRequests);
  }

  private roundCost(value: number): number {
    return Math.round(value * 1_000_000) / 1_000_000;
  }
}
