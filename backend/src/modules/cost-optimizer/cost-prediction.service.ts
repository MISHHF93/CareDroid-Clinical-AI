import { Injectable } from '@nestjs/common';
import {
  ComplexityLevel,
  ComplexityScore,
  CostPrediction,
  RoutingStrategy,
} from './cost-optimizer.types';

interface PricingProfile {
  route: RoutingStrategy;
  model: string;
  inputCostPer1kTokens: number;
  outputCostPer1kTokens: number;
  baseRequestCostUsd: number;
  retrievalCostUsd: number;
  defaultOutputTokens: number;
  maxTokens: number;
}

const PRICING_BY_COMPLEXITY: Record<ComplexityLevel, PricingProfile> = {
  simple: {
    route: 'lightweight_model',
    model: 'caredroid-lightweight-mini',
    inputCostPer1kTokens: 0.00015,
    outputCostPer1kTokens: 0.0006,
    baseRequestCostUsd: 0.0002,
    retrievalCostUsd: 0,
    defaultOutputTokens: 384,
    maxTokens: 768,
  },
  medium: {
    route: 'rag',
    model: 'caredroid-rag-mini',
    inputCostPer1kTokens: 0.0003,
    outputCostPer1kTokens: 0.0012,
    baseRequestCostUsd: 0.0005,
    retrievalCostUsd: 0.002,
    defaultOutputTokens: 900,
    maxTokens: 1400,
  },
  complex: {
    route: 'expert_model',
    model: 'caredroid-clinical-expert',
    inputCostPer1kTokens: 0.0025,
    outputCostPer1kTokens: 0.01,
    baseRequestCostUsd: 0.012,
    retrievalCostUsd: 0.004,
    defaultOutputTokens: 1600,
    maxTokens: 3000,
  },
};

@Injectable()
export class CostPredictionService {
  predict(input: {
    complexity: ComplexityScore;
    expectedOutputTokens?: number;
    maxOutputTokens?: number;
    cacheHit?: boolean;
  }): CostPrediction {
    const profile = PRICING_BY_COMPLEXITY[input.complexity.level];
    const estimatedOutputTokens = this.selectOutputTokens(
      profile,
      input.expectedOutputTokens,
      input.maxOutputTokens,
    );
    const inputTokenCostUsd = this.roundCost(
      (input.complexity.estimatedInputTokens / 1000) * profile.inputCostPer1kTokens,
    );
    const outputTokenCostUsd = this.roundCost(
      (estimatedOutputTokens / 1000) * profile.outputCostPer1kTokens,
    );
    const tokenCostUsd = this.roundCost(inputTokenCostUsd + outputTokenCostUsd);
    const requestCostUsd = this.roundCost(
      profile.baseRequestCostUsd + profile.retrievalCostUsd + tokenCostUsd,
    );
    const cacheDiscountUsd = input.cacheHit ? requestCostUsd : 0;

    return {
      model: profile.model,
      route: profile.route,
      currency: 'USD',
      estimatedInputTokens: input.complexity.estimatedInputTokens,
      estimatedOutputTokens,
      inputTokenCostUsd,
      outputTokenCostUsd,
      tokenCostUsd,
      retrievalCostUsd: profile.retrievalCostUsd,
      requestCostUsd,
      cacheDiscountUsd,
      totalCostUsd: this.roundCost(Math.max(0, requestCostUsd - cacheDiscountUsd)),
    };
  }

  maxTokensFor(level: ComplexityLevel): number {
    return PRICING_BY_COMPLEXITY[level].maxTokens;
  }

  private selectOutputTokens(
    profile: PricingProfile,
    expectedOutputTokens?: number,
    maxOutputTokens?: number,
  ): number {
    const requestedTokens = expectedOutputTokens ?? profile.defaultOutputTokens;
    const ceiling = maxOutputTokens ? Math.min(maxOutputTokens, profile.maxTokens) : profile.maxTokens;
    return Math.max(64, Math.min(requestedTokens, ceiling));
  }

  private roundCost(value: number): number {
    return Math.round(value * 1_000_000) / 1_000_000;
  }
}
