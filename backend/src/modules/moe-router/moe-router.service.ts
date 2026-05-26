import { Injectable } from '@nestjs/common';
import {
  IntentClassification,
  PrimaryIntent,
} from '../medical-control-plane/intent-classifier/dto/intent-classification.dto';
import { BACKEND_EXECUTOR_TOOL_IDS, MOE_EXPERT_DESCRIPTOR_BY_ID } from './expert-registry';
import { ExpertSelectorService } from './expert-selector.service';
import {
  ExpertCandidate,
  ExpertRoutePlan,
  GatewayRunEnvelope,
  MoEExpertId,
  SelectedExpertRoute,
} from './moe-router.types';

@Injectable()
export class MoERouterService {
  constructor(private readonly expertSelector: ExpertSelectorService) {}

  createRoutePlan(
    envelope: GatewayRunEnvelope,
    classification: IntentClassification | null,
  ): ExpertRoutePlan {
    const primaryIntent = classification?.primaryIntent || PrimaryIntent.GENERAL_QUERY;
    const allowedToolIds = classification?.toolId
      ? [classification.toolId]
      : envelope.policy.allowedTools;
    const backendExecutorIds = allowedToolIds.filter((toolId) =>
      BACKEND_EXECUTOR_TOOL_IDS.includes(toolId),
    );
    const candidates = this.expertSelector.scoreCandidates({
      envelope,
      classification,
      primaryIntent,
    });
    const simpleRequest = this.isSimpleRequest(envelope, classification, candidates);
    const selectedExperts = this.selectExperts(
      candidates,
      classification,
      primaryIntent,
      simpleRequest,
    );
    const primaryExpert = selectedExperts[0];
    const selectedExpert = primaryExpert.expertId;
    const descriptor = MOE_EXPERT_DESCRIPTOR_BY_ID[selectedExpert];
    const routingMode = this.routingMode(simpleRequest, selectedExperts, primaryExpert);
    const fallbackApplied = routingMode === 'fallback';
    const estimatedCost = this.roundCost(
      selectedExperts.reduce((total, expert) => total + expert.estimatedCost, 0) +
        (simpleRequest ? 0.005 : 0.02),
    );
    const requiresHumanReview =
      envelope.policy.requiresHumanReview ||
      Boolean(descriptor?.requiresHumanReview) ||
      primaryIntent === PrimaryIntent.CLINICAL_TOOL ||
      Boolean(classification?.isEmergency);
    const maxTokens = this.selectMaxTokens(primaryIntent, selectedExperts, simpleRequest);
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
      routingMode,
      fallbackApplied,
      routingEvidence: evidence,
      modelPlan: {
        routerModel: 'deterministic',
        expertModel: this.selectExpertModel(primaryIntent, selectedExperts, simpleRequest),
        useLightweightFirst: true,
        allowEscalation: primaryExpert.confidence < 0.7 || Boolean(classification?.isEmergency),
        maxTokens,
      },
      toolPlan: {
        allowedToolIds,
        backendExecutorIds,
        requiredHumanConfirmation: requiresHumanReview,
        orchestrationMode: backendExecutorIds.length ? 'plan' : 'skip',
      },
      costPlan: {
        preferredModel: this.selectPreferredModel(primaryIntent, selectedExperts, simpleRequest),
        maxTokens,
        allowFallback: true,
        estimatedCost,
        budgetLimit: envelope.policy.maxCostUsd,
        costReductionApplied: this.getCostReductions(
          selectedExperts,
          backendExecutorIds,
          simpleRequest,
          fallbackApplied,
        ),
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

  private selectExperts(
    candidates: ExpertCandidate[],
    classification: IntentClassification | null,
    primaryIntent: string,
    simpleRequest: boolean,
  ): SelectedExpertRoute[] {
    if (classification?.isEmergency) {
      return this.selectEmergencyExperts(candidates);
    }

    if (simpleRequest) {
      const documentation = candidates.find((candidate) => candidate.expertId === 'documentation');
      return [this.withRole(documentation || candidates[0], 'primary')];
    }

    const domainSignalCandidates = candidates.filter((candidate) =>
      this.hasDomainSignal(candidate),
    );
    const signalCandidates =
      domainSignalCandidates.length > 0
        ? domainSignalCandidates
        : candidates.filter((candidate) => this.hasStrongSignal(candidate));
    const primary = signalCandidates[0] || this.fallbackCandidate(candidates, primaryIntent);
    const selected: SelectedExpertRoute[] = [this.withRole(primary, 'primary')];
    const supporting = signalCandidates
      .filter((candidate) => candidate.expertId !== primary.expertId)
      .filter(
        (candidate) =>
          candidate.confidence >= 0.42 &&
          candidate.relevance >= 0.5 &&
          candidate.score >= primary.score * 0.55,
      )
      .slice(0, 3);

    supporting.forEach((candidate) => selected.push(this.withRole(candidate, 'supporting')));
    return selected;
  }

  private selectEmergencyExperts(candidates: ExpertCandidate[]): SelectedExpertRoute[] {
    const emergency =
      candidates.find((candidate) => candidate.expertId === 'emergency') || candidates[0];
    const selected: SelectedExpertRoute[] = [this.withRole(emergency, 'primary')];
    const safetySupport = candidates
      .filter((candidate) => candidate.expertId !== emergency.expertId)
      .filter((candidate) =>
        ['cardiology', 'pulmonology', 'psychiatry', 'nephrology', 'neurology'].includes(
          candidate.expertId,
        ),
      )
      .find((candidate) => candidate.confidence >= 0.24);

    if (safetySupport) {
      selected.push(this.withRole(safetySupport, 'supporting'));
    }

    return selected;
  }

  private fallbackCandidate(candidates: ExpertCandidate[], primaryIntent: string): ExpertCandidate {
    const fallbackExpert = this.expertSelector.fallbackExpert(primaryIntent);
    const fallback =
      candidates.find((candidate) => candidate.expertId === fallbackExpert) || candidates[0];
    return {
      ...fallback,
      confidence: Math.max(fallback.confidence, 0.5),
      reason: `Fallback routing selected ${fallbackExpert} because no expert signal cleared the routing threshold.`,
    };
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

  private hasStrongSignal(candidate: ExpertCandidate): boolean {
    return candidate.evidence.length > 0 && candidate.confidence >= 0.35;
  }

  private hasDomainSignal(candidate: ExpertCandidate): boolean {
    return candidate.evidence.some((item) =>
      ['keyword', 'tool_id', 'feature', 'policy'].includes(item.kind),
    );
  }

  private isSimpleRequest(
    envelope: GatewayRunEnvelope,
    classification: IntentClassification | null,
    candidates: ExpertCandidate[],
  ): boolean {
    if (classification?.isEmergency || classification?.toolId || envelope.input.toolHint) {
      return false;
    }
    if (
      classification?.primaryIntent &&
      classification.primaryIntent !== PrimaryIntent.GENERAL_QUERY
    ) {
      return false;
    }
    const message = envelope.input.message || '';
    const hasDomainSignal = candidates.some(
      (candidate) =>
        candidate.expertId !== 'documentation' &&
        candidate.evidence.some((item) => item.kind === 'keyword' || item.kind === 'feature'),
    );
    return message.length <= 180 && !hasDomainSignal;
  }

  private routingMode(
    simpleRequest: boolean,
    selectedExperts: SelectedExpertRoute[],
    primaryExpert: SelectedExpertRoute,
  ): ExpertRoutePlan['routingMode'] {
    if (simpleRequest) return 'lightweight';
    if (primaryExpert.reason.startsWith('Fallback routing')) return 'fallback';
    if (selectedExperts.length > 1) return 'multi_expert';
    return 'single_expert';
  }

  private selectPreferredModel(
    primaryIntent: string,
    selectedExperts: SelectedExpertRoute[],
    simpleRequest: boolean,
  ): string {
    if (simpleRequest) return 'lightweight-handler';
    if (
      primaryIntent === PrimaryIntent.EMERGENCY ||
      selectedExperts.some((expert) => expert.expertId === 'emergency')
    ) {
      return 'gpt-4o';
    }
    return 'gpt-4o-mini';
  }

  private selectExpertModel(
    primaryIntent: string,
    selectedExperts: SelectedExpertRoute[],
    simpleRequest: boolean,
  ): ExpertRoutePlan['modelPlan']['expertModel'] {
    if (simpleRequest) return 'none';
    if (primaryIntent === PrimaryIntent.EMERGENCY) return 'standard';
    if (selectedExperts.length > 1) return 'standard';
    return 'small';
  }

  private selectMaxTokens(
    primaryIntent: string,
    selectedExperts: SelectedExpertRoute[],
    simpleRequest: boolean,
  ): number {
    if (simpleRequest) return 500;
    if (primaryIntent === PrimaryIntent.EMERGENCY) return 2400;
    if (selectedExperts.length > 1) return 2200;
    return 1600;
  }

  private getCostReductions(
    selectedExperts: SelectedExpertRoute[],
    backendExecutorIds: string[],
    simpleRequest: boolean,
    fallbackApplied: boolean,
  ): string[] {
    return [
      'deterministic_route_rules',
      'lightweight_router',
      'cached_expert_descriptors',
      ...(simpleRequest ? ['lightweight_handler'] : []),
      ...(fallbackApplied ? ['fallback_routing'] : []),
      ...(selectedExperts.length === 1 ? ['single_expert_execution'] : []),
      ...(backendExecutorIds.length ? ['backend_executor_preferred'] : []),
    ];
  }

  private hasCrisisSignal(
    envelope: GatewayRunEnvelope,
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

  private roundCost(value: number): number {
    return Math.round(value * 10000) / 10000;
  }
}
