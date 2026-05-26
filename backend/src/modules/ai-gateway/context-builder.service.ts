import { Injectable } from '@nestjs/common';
import {
  AiContextPacket,
  ExpertRoutePlan,
  GatewayRunEnvelope,
  PipelineStage,
} from '../moe-router/moe-router.types';

@Injectable()
export class ContextBuilderService {
  buildContextPacket(envelope: GatewayRunEnvelope, routePlan: ExpertRoutePlan): AiContextPacket {
    const pipeline = this.buildPipeline(routePlan);

    return {
      runId: envelope.runId,
      capabilityId: envelope.capabilityId,
      userId: envelope.userId,
      conversationId: envelope.conversationId,
      sourceSurface: envelope.trace.sourceSurface,
      inputSummary: {
        messageCharacters: envelope.input.message?.length || 0,
        toolHint: envelope.input.toolHint,
        featureHint: envelope.input.featureHint,
      },
      route: {
        primaryIntent: routePlan.primaryIntent,
        selectedExpert: routePlan.selectedExpert,
        selectedExperts: routePlan.selectedExperts,
        retrievalPolicy: routePlan.retrievalPolicy,
        confidence: routePlan.confidence,
        routeScore: routePlan.routeScore,
        routeReason: routePlan.routeReason,
        routingMode: routePlan.routingMode,
        fallbackApplied: routePlan.fallbackApplied,
      },
      cost: {
        estimatedCost: routePlan.costPlan.estimatedCost,
        costReductionApplied: routePlan.costPlan.costReductionApplied,
      },
      memory: {
        conversationScope: 'request',
        persistence: envelope.conversationId ? 'planned' : 'none',
      },
      safety: {
        phiAccessed: envelope.policy.phiAccessed,
        requiresHumanReview: routePlan.safetyPlan.requiresHumanReview,
        blockedActions: routePlan.safetyPlan.blockedActions,
      },
      pipeline,
    };
  }

  toModelContext(packet: AiContextPacket) {
    return {
      runId: packet.runId,
      capabilityId: packet.capabilityId,
      conversationId: packet.conversationId,
      route: packet.route.primaryIntent,
      selectedExpert: packet.route.selectedExpert,
      selectedExperts: packet.route.selectedExperts.map((expert) => ({
        expertId: expert.expertId,
        role: expert.role,
        confidence: expert.confidence,
        score: expert.score,
      })),
      routingMode: packet.route.routingMode,
      fallbackApplied: packet.route.fallbackApplied,
      retrievalPolicy: packet.route.retrievalPolicy,
      routeScore: packet.route.routeScore,
      estimatedCost: packet.cost.estimatedCost,
      requiresHumanReview: packet.safety.requiresHumanReview,
      phiAccessed: packet.safety.phiAccessed,
    };
  }

  private buildPipeline(routePlan: ExpertRoutePlan): PipelineStage[] {
    return [
      { stage: 'ai_gateway', status: 'complete', detail: routePlan.runId },
      { stage: 'intent_classifier', status: routePlan.fallbackApplied ? 'fallback' : 'complete' },
      {
        stage: 'expert_router',
        status: routePlan.fallbackApplied ? 'fallback' : 'complete',
        detail: routePlan.routingMode,
      },
      { stage: 'context_builder', status: 'complete' },
      {
        stage: 'tool_orchestrator',
        status: routePlan.toolPlan.backendExecutorIds.length ? 'planned' : 'skipped',
        detail: routePlan.toolPlan.backendExecutorIds.join(', ') || undefined,
      },
    ];
  }
}
