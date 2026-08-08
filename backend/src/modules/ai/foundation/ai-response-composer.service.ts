import { Injectable } from '@nestjs/common';
import {
  buildAiResponseProvenance,
  PROVENANCE_CONTRACT_VERSION,
} from '../../../../../lib/ai/provenanceContract';
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
  ): T & {
    provenance: ReturnType<typeof buildAiResponseProvenance>;
    metadata: Record<string, any>;
  } {
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
      requiresHumanReview: true,
      startedAt: envelope.trace.startedAt,
    };

    const provenance =
      (response as any).provenance?.contractVersion === PROVENANCE_CONTRACT_VERSION
        ? (response as any).provenance
        : buildAiResponseProvenance({
            // Confirmed dead code (zero real callers outside this module and
            // its own specs, see AI_ORCHESTRATION_AUDIT.md §3.2) -- kept
            // compiling against the canonical contract rather than deleted
            // this round, since removal needs its own dedicated
            // zero-callers verification pass. LLM_GENERATED matches this
            // composer's own behavior: unlike its live sibling
            // (ai-gateway/response-composer.service.ts), it never receives
            // ragChunks/toolResult, so it is only ever reached downstream of
            // a real LLM call.
            responseSource: 'LLM_GENERATED',
            confidence: routePlan.confidence,
            modelOrEngine: routePlan.selectedExpert,
            responseClass: 'clinical',
            recommendedReviewerRole: 'Responsible clinician',
          });

    return {
      ...response,
      provenance,
      requiresClinicianReview: true,
      metadata: {
        ...response.metadata,
        aiFoundation,
        provenance,
        routePlan: {
          selectedExperts: routePlan.selectedExperts,
          routingEvidence: routePlan.routingEvidence,
          modelPlan: routePlan.modelPlan,
          toolPlan: routePlan.toolPlan,
          costPlan: routePlan.costPlan,
          safetyPlan: {
            ...routePlan.safetyPlan,
            requiresHumanReview: true,
          },
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
          requiresHumanReview: true,
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
