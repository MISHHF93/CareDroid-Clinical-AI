import { Injectable } from '@nestjs/common';
import { ComplexityLevel, ComplexityScore, CostOptimizationRequest } from './cost-optimizer.types';

const CLINICAL_DEPTH_TERMS = [
  'diagnosis',
  'differential',
  'contraindication',
  'medication',
  'dosage',
  'lab',
  'labs',
  'renal',
  'sepsis',
  'shock',
  'ventilator',
  'guideline',
  'protocol',
  'evidence',
  'citation',
  'patient',
];

const EMERGENCY_TERMS = [
  'emergency',
  'urgent',
  'stat',
  'critical',
  'crash',
  'code blue',
  'stroke',
  'suicidal',
  'overdose',
  'anaphylaxis',
];

const MULTI_STEP_TERMS = [
  'analyze',
  'compare',
  'summarize and',
  'step by step',
  'plan',
  'workflow',
  'evaluate',
  'recommend',
];

const TOOL_ACTION_TERMS = ['calculate', 'order', 'prescribe', 'schedule', 'triage', 'route', 'generate'];

@Injectable()
export class ComplexityScorerService {
  score(request: CostOptimizationRequest = {}): ComplexityScore {
    const text = this.extractText(request);
    const normalizedText = text.toLowerCase();
    const estimatedInputTokens = request.inputTokens ?? this.estimateTokens(text, request.structuredPayload);
    const signals: string[] = [];
    let score = this.lengthScore(estimatedInputTokens, signals);

    score += this.keywordScore(normalizedText, CLINICAL_DEPTH_TERMS, 14, 'clinical_depth', signals);
    score += this.keywordScore(normalizedText, MULTI_STEP_TERMS, 12, 'multi_step_reasoning', signals);
    score += this.keywordScore(normalizedText, TOOL_ACTION_TERMS, 10, 'tool_or_action_request', signals);

    const emergencyScore = this.keywordScore(
      normalizedText,
      EMERGENCY_TERMS,
      28,
      'urgent_or_high_risk_language',
      signals,
    );
    score += emergencyScore;

    if (request.structuredPayload || request.metadata) {
      score += 10;
      signals.push('structured_context');
    }

    if (request.featureHint || request.toolHint) {
      score += 8;
      signals.push('routing_hint');
    }

    if (request.requiresHumanReview) {
      score += 25;
      signals.push('human_review_required');
    }

    score = Math.min(100, score);

    if (estimatedInputTokens <= 90 && emergencyScore === 0 && !request.requiresHumanReview) {
      score = Math.min(score, 32);
    }

    const level = this.levelForScore(score, emergencyScore > 0 || Boolean(request.requiresHumanReview));
    return {
      level,
      score,
      estimatedInputTokens,
      signals: signals.length ? Array.from(new Set(signals)) : ['short_general_request'],
      rationale: this.rationale(level, score, signals),
    };
  }

  private extractText(request: CostOptimizationRequest): string {
    return [request.prompt, request.message, request.featureHint, request.toolHint]
      .filter(Boolean)
      .join(' ')
      .trim();
  }

  private estimateTokens(text: string, structuredPayload?: unknown): number {
    const textTokens = Math.max(1, Math.ceil(text.length / 4));
    const structuredTokens = structuredPayload ? Math.ceil(JSON.stringify(structuredPayload).length / 4) : 0;
    return textTokens + structuredTokens;
  }

  private lengthScore(tokens: number, signals: string[]): number {
    if (tokens <= 120) {
      signals.push('short_request');
      return 8;
    }
    if (tokens <= 600) {
      signals.push('moderate_context');
      return 22;
    }
    if (tokens <= 1600) {
      signals.push('long_context');
      return 38;
    }
    signals.push('very_long_context');
    return 52;
  }

  private keywordScore(
    text: string,
    terms: string[],
    weight: number,
    signal: string,
    signals: string[],
  ): number {
    if (!text) return 0;
    const matches = terms.filter((term) => text.includes(term));
    if (matches.length === 0) return 0;
    signals.push(signal);
    return Math.min(weight, matches.length * Math.ceil(weight / 3));
  }

  private levelForScore(score: number, forceComplex: boolean): ComplexityLevel {
    if (forceComplex) return 'complex';
    if (score < 35) return 'simple';
    if (score < 70) return 'medium';
    return 'complex';
  }

  private rationale(level: ComplexityLevel, score: number, signals: string[]): string {
    const signalSummary = signals.length ? Array.from(new Set(signals)).join(', ') : 'minimal signals';
    return `Classified as ${level} with score ${score} from ${signalSummary}.`;
  }
}
