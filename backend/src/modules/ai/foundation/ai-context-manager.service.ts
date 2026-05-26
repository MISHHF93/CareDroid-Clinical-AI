import { Injectable } from '@nestjs/common';
import { AiContextPacket, AiRunEnvelope, ExpertRoutePlan } from './ai-foundation.types';

@Injectable()
export class AiContextManagerService {
  buildContextPacket(envelope: AiRunEnvelope, routePlan: ExpertRoutePlan): AiContextPacket {
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
      },
      cost: {
        estimatedCost: routePlan.costPlan.estimatedCost,
        costReductionApplied: routePlan.costPlan.costReductionApplied,
      },
      memory: {
        conversationScope: 'request',
        persistence: 'planned',
      },
      safety: {
        phiAccessed: envelope.policy.phiAccessed,
        requiresHumanReview: routePlan.safetyPlan.requiresHumanReview,
        blockedActions: routePlan.safetyPlan.blockedActions,
      },
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
      retrievalPolicy: packet.route.retrievalPolicy,
      routeScore: packet.route.routeScore,
      estimatedCost: packet.cost.estimatedCost,
      requiresHumanReview: packet.safety.requiresHumanReview,
      phiAccessed: packet.safety.phiAccessed,
    };
  }
}
