export type ComplexityLevel = 'simple' | 'medium' | 'complex';

export type RoutingStrategy = 'lightweight_model' | 'rag' | 'expert_model';

export interface CostOptimizationRequest {
  requestId?: string;
  userId?: string;
  prompt?: string;
  message?: string;
  inputTokens?: number;
  expectedOutputTokens?: number;
  maxOutputTokens?: number;
  cacheKey?: string;
  useCache?: boolean;
  sourceSurface?: string;
  featureHint?: string;
  toolHint?: string;
  requiresHumanReview?: boolean;
  structuredPayload?: unknown;
  metadata?: Record<string, unknown>;
}

export interface ComplexityScore {
  level: ComplexityLevel;
  score: number;
  estimatedInputTokens: number;
  signals: string[];
  rationale: string;
}

export interface CostPrediction {
  model: string;
  route: RoutingStrategy;
  currency: 'USD';
  estimatedInputTokens: number;
  estimatedOutputTokens: number;
  inputTokenCostUsd: number;
  outputTokenCostUsd: number;
  tokenCostUsd: number;
  retrievalCostUsd: number;
  requestCostUsd: number;
  cacheDiscountUsd: number;
  totalCostUsd: number;
}

export interface RoutingPlan {
  strategy: RoutingStrategy;
  model: string;
  description: string;
  useRag: boolean;
  useExpertModel: boolean;
  maxTokens: number;
  fallbackModel?: string;
  rationale: string;
}

export interface RouteOptimizationResult {
  requestId: string;
  createdAt: string;
  complexity: ComplexityScore;
  costPrediction: CostPrediction;
  routing: RoutingPlan;
  cache: {
    key: string;
    hit: boolean;
    ttlSeconds: number;
  };
}

export interface CostOptimizerCacheStats {
  hits: number;
  misses: number;
  hitRate: number;
  entryCount: number;
}

export interface CostOptimizerDashboardMetrics {
  generatedAt: string;
  totalRequests: number;
  requestCost: {
    lastUsd: number;
    totalUsd: number;
    averageUsd: number;
  };
  tokenCost: {
    lastUsd: number;
    totalUsd: number;
    averageUsd: number;
  };
  cache: CostOptimizerCacheStats;
  routeCounts: Record<RoutingStrategy, number>;
  complexityCounts: Record<ComplexityLevel, number>;
}
