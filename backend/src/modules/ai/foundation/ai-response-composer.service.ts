import { Injectable } from '@nestjs/common';
import {
  AiContextPacket,
  AiFoundationMetadata,
  AiRunEnvelope,
  ExpertRoutePlan,
} from './ai-foundation.types';

@Injectable()
export class AiResponseComposerService {
  compose<T extends Record<string, any>>(
    response: T,
    envelope: AiRunEnvelope,
    routePlan: ExpertRoutePlan,
    contextPacket: AiContextPacket,
    extraMetadata: Record<string, any> = {},
  ): T & { metadata: Record<string, any> } {
    const aiFoundation: AiFoundationMetadata = {
      runId: envelope.runId,
      capabilityId: envelope.capabilityId,
      route: routePlan.primaryIntent,
      selectedExpert: routePlan.selectedExpert,
      selectedExperts: routePlan.selectedExperts,
      retrievalPolicy: routePlan.retrievalPolicy,
      confidence: routePlan.confidence,
      routeScore: routePlan.routeScore,
      routeReason: routePlan.routeReason,
      estimatedCost: routePlan.costPlan.estimatedCost,
      costReductionApplied: routePlan.costPlan.costReductionApplied,
      phiAccessed: envelope.policy.phiAccessed,
      requiresHumanReview: routePlan.safetyPlan.requiresHumanReview,
      startedAt: envelope.trace.startedAt,
    };

    return {
      ...response,
      metadata: {
        ...response.metadata,
        aiFoundation,
        routePlan: {
          selectedExperts: routePlan.selectedExperts,
          routingEvidence: routePlan.routingEvidence,
          modelPlan: routePlan.modelPlan,
          toolPlan: routePlan.toolPlan,
          costPlan: routePlan.costPlan,
          safetyPlan: routePlan.safetyPlan,
        },
        context: {
          sourceSurface: contextPacket.sourceSurface,
          memoryPersistence: contextPacket.memory.persistence,
          messageCharacters: contextPacket.inputSummary.messageCharacters,
          selectedExperts: contextPacket.route.selectedExperts.map((expert) => expert.expertId),
          routeScore: contextPacket.route.routeScore,
        },
        safety: {
          blockedActions: routePlan.safetyPlan.blockedActions,
          emergencyEscalation: routePlan.safetyPlan.emergencyEscalation,
          crisisEscalation: routePlan.safetyPlan.crisisEscalation,
          requiresHumanReview: routePlan.safetyPlan.requiresHumanReview,
        },
        cost: {
          estimated: routePlan.costPlan.estimatedCost,
          savedBy: routePlan.costPlan.costReductionApplied,
        },
        ...extraMetadata,
      },
    };
  }
}
