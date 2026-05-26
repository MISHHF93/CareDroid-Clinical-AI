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
      retrievalPolicy: routePlan.retrievalPolicy,
      confidence: routePlan.confidence,
      phiAccessed: envelope.policy.phiAccessed,
      requiresHumanReview: routePlan.safetyPlan.requiresHumanReview,
      startedAt: envelope.trace.startedAt,
    };

    return {
      ...response,
      metadata: {
        ...response.metadata,
        aiFoundation,
        context: {
          sourceSurface: contextPacket.sourceSurface,
          memoryPersistence: contextPacket.memory.persistence,
          messageCharacters: contextPacket.inputSummary.messageCharacters,
        },
        safety: {
          blockedActions: routePlan.safetyPlan.blockedActions,
          emergencyEscalation: routePlan.safetyPlan.emergencyEscalation,
          requiresHumanReview: routePlan.safetyPlan.requiresHumanReview,
        },
        ...extraMetadata,
      },
    };
  }
}
