import { Injectable } from '@nestjs/common';
import {
  AiContextPacket,
  AiGatewayMetadata,
  ExpertRoutePlan,
  GatewayRunEnvelope,
} from '../moe-router/moe-router.types';

@Injectable()
export class ResponseComposerService {
  compose<T extends Record<string, any>>(
    response: T,
    envelope: GatewayRunEnvelope,
    routePlan: ExpertRoutePlan,
    contextPacket: AiContextPacket,
    extraMetadata: Record<string, any> = {},
  ): T & { metadata: Record<string, any> } {
    const aiFoundation: AiGatewayMetadata = {
      runId: envelope.runId,
      capabilityId: envelope.capabilityId,
      route: routePlan.primaryIntent,
      selectedExpert: routePlan.selectedExpert,
      selectedExperts: routePlan.selectedExperts,
      retrievalPolicy: routePlan.retrievalPolicy,
      confidence: routePlan.confidence,
      routeScore: routePlan.routeScore,
      routeReason: routePlan.routeReason,
      routingMode: routePlan.routingMode,
      fallbackApplied: routePlan.fallbackApplied,
      estimatedCost: routePlan.costPlan.estimatedCost,
      costReductionApplied: routePlan.costPlan.costReductionApplied,
      phiAccessed: envelope.policy.phiAccessed,
      requiresHumanReview: routePlan.safetyPlan.requiresHumanReview,
      startedAt: envelope.trace.startedAt,
    };
    const pipeline = [
      ...contextPacket.pipeline,
      { stage: 'response_composer', status: 'complete' as const },
    ];

    return {
      ...response,
      metadata: {
        ...response.metadata,
        aiFoundation,
        aiGateway: {
          runId: envelope.runId,
          capabilityId: envelope.capabilityId,
          pipeline,
          routingMode: routePlan.routingMode,
          fallbackApplied: routePlan.fallbackApplied,
        },
        routePlan: {
          selectedExperts: routePlan.selectedExperts,
          routingEvidence: routePlan.routingEvidence,
          routingMode: routePlan.routingMode,
          fallbackApplied: routePlan.fallbackApplied,
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
          routingMode: contextPacket.route.routingMode,
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
