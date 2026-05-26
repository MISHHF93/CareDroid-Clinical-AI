import { Injectable } from '@nestjs/common';
import {
  IntentClassification,
  PrimaryIntent,
} from '../../medical-control-plane/intent-classifier/dto/intent-classification.dto';
import {
  BACKEND_EXECUTOR_TOOL_IDS,
  COST_FLOOR,
  AI_EXPERT_DESCRIPTORS,
  AiExpertDescriptor,
} from './ai-expert-descriptors';
import {
  AiExpertId,
  AiRunEnvelope,
  ExpertRoutePlan,
  RouteEvidence,
  SelectedExpertRoute,
} from './ai-foundation.types';

interface ExpertCandidate extends SelectedExpertRoute {
  evidence: RouteEvidence[];
  descriptor: AiExpertDescriptor;
}

@Injectable()
export class AiRoutingEngineService {
  createRoutePlan(
    envelope: AiRunEnvelope,
    classification: IntentClassification | null,
  ): ExpertRoutePlan {
    const primaryIntent = classification?.primaryIntent || PrimaryIntent.GENERAL_QUERY;
    const allowedToolIds = classification?.toolId
      ? [classification.toolId]
      : envelope.policy.allowedTools;
    const backendExecutorIds = allowedToolIds.filter((toolId) =>
      BACKEND_EXECUTOR_TOOL_IDS.includes(toolId),
    );
    const candidates = AI_EXPERT_DESCRIPTORS.map((descriptor) =>
      this.scoreCandidate(descriptor, envelope, classification, primaryIntent),
    ).sort((a, b) => b.score - a.score);
    const selectedExperts = this.selectExperts(candidates, classification);
    const primaryExpert = selectedExperts[0];
    const selectedExpert = primaryExpert.expertId;
    const descriptor = candidates.find(
      (candidate) => candidate.expertId === selectedExpert,
    )?.descriptor;
    const estimatedCost = this.roundCost(
      selectedExperts.reduce((total, expert) => total + expert.estimatedCost, 0) + 0.02,
    );
    const requiresHumanReview =
      envelope.policy.requiresHumanReview ||
      Boolean(descriptor?.requiresHumanReview) ||
      primaryIntent === PrimaryIntent.CLINICAL_TOOL ||
      Boolean(classification?.isEmergency);
    const maxTokens = this.selectMaxTokens(primaryIntent, selectedExperts);
    const evidence = selectedExperts.flatMap((expert) => {
      const candidate = candidates.find((item) => item.expertId === expert.expertId);
      return candidate?.evidence || [];
    });

    return {
      runId: envelope.runId,
      primaryIntent,
      selectedExpert,
      selectedExperts,
      confidence: primaryExpert.confidence,
      retrievalPolicy: descriptor?.retrievalPolicy || 'reference',
      routeScore: primaryExpert.score,
      routeReason: primaryExpert.reason,
      routingEvidence: evidence,
      modelPlan: {
        routerModel: 'deterministic',
        expertModel: this.selectExpertModel(primaryIntent, selectedExperts),
        useLightweightFirst: true,
        allowEscalation: primaryExpert.confidence < 0.7 || Boolean(classification?.isEmergency),
        maxTokens,
      },
      toolPlan: {
        allowedToolIds,
        backendExecutorIds,
        requiredHumanConfirmation: requiresHumanReview,
      },
      costPlan: {
        preferredModel: this.selectPreferredModel(primaryIntent, selectedExperts),
        maxTokens,
        allowFallback: true,
        estimatedCost,
        budgetLimit: envelope.policy.maxCostUsd,
        costReductionApplied: this.getCostReductions(selectedExperts, backendExecutorIds),
      },
      safetyPlan: {
        emergencyEscalation: Boolean(classification?.isEmergency),
        crisisEscalation: this.hasCrisisSignal(envelope, classification),
        requiresHumanReview,
        blockedActions: [
          'autonomous_chart_modification',
          'auto_sign_note',
          'order_placement_without_review',
          'patient_outreach_without_confirmation',
        ],
      },
    };
  }

  private scoreCandidate(
    descriptor: AiExpertDescriptor,
    envelope: AiRunEnvelope,
    classification: IntentClassification | null,
    primaryIntent: PrimaryIntent,
  ): ExpertCandidate {
    const text = this.normalize(
      [
        envelope.input.message,
        envelope.input.toolHint,
        envelope.input.featureHint,
        envelope.capabilityId,
        classification?.toolId,
        ...(classification?.matchedPatterns || []),
      ]
        .filter(Boolean)
        .join(' '),
    );
    const sourceSurface = this.normalize(envelope.trace.sourceSurface);
    const toolHint = this.normalize(classification?.toolId || envelope.input.toolHint || '');
    const featureHint = this.normalize(envelope.input.featureHint || envelope.capabilityId || '');
    const evidence: RouteEvidence[] = [];
    let confidence = 0.12;
    let relevance = descriptor.defaultRelevance;

    if (descriptor.intents.includes(primaryIntent)) {
      const weight = 0.35 * (classification?.confidence ?? 0.5);
      confidence += weight;
      evidence.push({
        expertId: descriptor.id,
        kind: 'intent',
        value: primaryIntent,
        weight: this.roundScore(weight),
      });
    }

    const keywordMatches = descriptor.keywords.filter((keyword) =>
      text.includes(this.normalize(keyword)),
    );
    if (keywordMatches.length) {
      const weight = Math.min(0.32, keywordMatches.length * 0.08);
      confidence += weight;
      relevance += Math.min(0.08, keywordMatches.length * 0.015);
      keywordMatches.slice(0, 4).forEach((keyword) => {
        evidence.push({
          expertId: descriptor.id,
          kind: 'keyword',
          value: keyword,
          weight: this.roundScore(weight / Math.min(keywordMatches.length, 4)),
        });
      });
    }

    if (toolHint && descriptor.toolHints.some((hint) => toolHint.includes(this.normalize(hint)))) {
      confidence += 0.32;
      relevance += 0.05;
      evidence.push({
        expertId: descriptor.id,
        kind: 'tool_id',
        value: toolHint,
        weight: 0.32,
      });
    }

    if (
      featureHint &&
      descriptor.featureHints.some((hint) => featureHint.includes(this.normalize(hint)))
    ) {
      confidence += 0.28;
      relevance += 0.04;
      evidence.push({
        expertId: descriptor.id,
        kind: 'feature',
        value: featureHint,
        weight: 0.28,
      });
    }

    if (
      sourceSurface &&
      descriptor.sourceSurfaces.some((surface) => sourceSurface.includes(this.normalize(surface)))
    ) {
      confidence += sourceSurface === 'assistant-chat' ? 0.03 : 0.16;
      evidence.push({
        expertId: descriptor.id,
        kind: 'source_surface',
        value: sourceSurface,
        weight: sourceSurface === 'assistant-chat' ? 0.03 : 0.16,
      });
    }

    if (descriptor.id === 'emergency' && classification?.isEmergency) {
      confidence = Math.max(confidence, 0.95);
      relevance = Math.max(relevance, 0.98);
      evidence.push({
        expertId: descriptor.id,
        kind: 'policy',
        value: 'emergency_preemption',
        weight: 0.95,
      });
    }

    if (descriptor.id === 'psychiatry' && this.hasCrisisSignal(envelope, classification)) {
      confidence = Math.max(confidence, 0.82);
      relevance = Math.max(relevance, 0.94);
      evidence.push({
        expertId: descriptor.id,
        kind: 'policy',
        value: 'crisis_signal',
        weight: 0.82,
      });
    }

    if (evidence.length === 0 && descriptor.id === this.fallbackExpert(primaryIntent)) {
      confidence = Math.max(confidence, 0.5);
      evidence.push({
        expertId: descriptor.id,
        kind: 'policy',
        value: 'fallback_expert',
        weight: 0.5,
      });
    }

    confidence = this.roundScore(this.clamp(confidence));
    relevance = this.roundScore(this.clamp(relevance));
    const estimatedCost = Math.max(COST_FLOOR, descriptor.estimatedCost);
    const score = this.roundScore((confidence * relevance) / estimatedCost);

    return {
      expertId: descriptor.id,
      role: 'primary',
      confidence,
      relevance,
      estimatedCost,
      score,
      reason: descriptor.reason,
      evidence,
      descriptor,
    };
  }

  private selectExperts(
    candidates: ExpertCandidate[],
    classification: IntentClassification | null,
  ): SelectedExpertRoute[] {
    const primary = candidates[0];
    const selected: SelectedExpertRoute[] = [{ ...this.withRole(primary, 'primary') }];
    const secondary = candidates.find((candidate) => candidate.expertId !== primary.expertId);

    if (
      secondary &&
      !classification?.isEmergency &&
      primary.confidence >= 0.55 &&
      secondary.confidence >= 0.45 &&
      secondary.relevance >= 0.5 &&
      secondary.score >= primary.score * 0.85
    ) {
      selected.push(this.withRole(secondary, 'supporting'));
    }

    if (classification?.isEmergency) {
      const safetySupport = candidates.find(
        (candidate) =>
          candidate.expertId !== primary.expertId &&
          candidate.confidence >= 0.5 &&
          ['cardiology', 'pulmonology', 'psychiatry', 'nephrology'].includes(candidate.expertId),
      );
      if (safetySupport) {
        selected.push(this.withRole(safetySupport, 'supporting'));
      }
    }

    return selected;
  }

  private withRole(
    candidate: ExpertCandidate,
    role: SelectedExpertRoute['role'],
  ): SelectedExpertRoute {
    return {
      expertId: candidate.expertId,
      role,
      confidence: candidate.confidence,
      relevance: candidate.relevance,
      estimatedCost: candidate.estimatedCost,
      score: candidate.score,
      reason: candidate.reason,
    };
  }

  private fallbackExpert(primaryIntent: PrimaryIntent): AiExpertId {
    if (primaryIntent === PrimaryIntent.ADMINISTRATIVE) return 'operations';
    if (primaryIntent === PrimaryIntent.MEDICAL_REFERENCE) return 'documentation';
    return 'documentation';
  }

  private selectPreferredModel(
    primaryIntent: PrimaryIntent,
    selectedExperts: SelectedExpertRoute[],
  ): string {
    if (
      primaryIntent === PrimaryIntent.EMERGENCY ||
      selectedExperts.some((expert) => expert.expertId === 'emergency')
    ) {
      return 'gpt-4o';
    }
    return 'gpt-4o-mini';
  }

  private selectExpertModel(
    primaryIntent: PrimaryIntent,
    selectedExperts: SelectedExpertRoute[],
  ): ExpertRoutePlan['modelPlan']['expertModel'] {
    if (primaryIntent === PrimaryIntent.EMERGENCY) return 'standard';
    if (selectedExperts.length > 1) return 'standard';
    return 'small';
  }

  private selectMaxTokens(
    primaryIntent: PrimaryIntent,
    selectedExperts: SelectedExpertRoute[],
  ): number {
    if (primaryIntent === PrimaryIntent.EMERGENCY) return 2400;
    if (selectedExperts.length > 1) return 2200;
    return 1600;
  }

  private getCostReductions(
    selectedExperts: SelectedExpertRoute[],
    backendExecutorIds: string[],
  ): string[] {
    return [
      'deterministic_route_rules',
      'lightweight_router',
      'cached_expert_descriptors',
      ...(selectedExperts.length === 1 ? ['single_expert_execution'] : []),
      ...(backendExecutorIds.length ? ['backend_executor_preferred'] : []),
    ];
  }

  private hasCrisisSignal(
    envelope: AiRunEnvelope,
    classification: IntentClassification | null,
  ): boolean {
    const text = this.normalize(
      [
        envelope.input.message,
        ...(classification?.emergencyKeywords.map((keyword) => keyword.keyword) || []),
      ].join(' '),
    );
    return ['suicide', 'self harm', 'self-harm', 'harm myself', 'kill myself'].some((term) =>
      text.includes(term),
    );
  }

  private normalize(value?: string): string {
    return (value || '').toLowerCase().replace(/_/g, '-').trim();
  }

  private clamp(value: number): number {
    return Math.max(0, Math.min(1, value));
  }

  private roundScore(value: number): number {
    return Math.round(value * 1000) / 1000;
  }

  private roundCost(value: number): number {
    return Math.round(value * 10000) / 10000;
  }
}
