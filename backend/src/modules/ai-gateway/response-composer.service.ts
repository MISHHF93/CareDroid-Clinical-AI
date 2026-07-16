import { Injectable } from '@nestjs/common';
import { buildAiResponseProvenance } from '../../../../lib/ai/provenanceContract';
import {
  AiContextPacket,
  AiGatewayMetadata,
  ExpertRoutePlan,
  GatewayRunEnvelope,
} from '../moe-router/moe-router.types';
import { buildAccountableRecommendationDto } from '../ai/dto/accountable-recommendation.dto';

@Injectable()
export class ResponseComposerService {
  compose<T extends Record<string, any>>(
    response: T,
    envelope: GatewayRunEnvelope,
    routePlan: ExpertRoutePlan,
    contextPacket: AiContextPacket,
    extraMetadata: Record<string, any> = {},
  ): T & {
    provenance: ReturnType<typeof buildAiResponseProvenance>;
    metadata: Record<string, any>;
    accountableRecommendation: ReturnType<typeof buildAccountableRecommendationDto>;
  } {
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
      requiresHumanReview: true, // PR-6: clinician review always required on composed AI output
      startedAt: envelope.trace.startedAt,
    };
    const pipeline = [
      ...contextPacket.pipeline,
      { stage: 'response_composer', status: 'complete' as const },
      { stage: 'provenance_contract', status: 'complete' as const },
    ];

    const ragContext = (response as any).ragContext;
    const citations = (response as any).citations || ragContext?.sources || [];
    const chunks = ragContext?.chunks || [];
    const confidence =
      typeof (response as any).confidence === 'number'
        ? (response as any).confidence
        : routePlan.confidence;

    const provenance =
      (response as any).provenance && (response as any).provenance.contractVersion === '1.0.0'
        ? (response as any).provenance
        : buildAiResponseProvenance({
            confidence,
            ragSources: citations,
            ragChunks: chunks,
            modelOrEngine: routePlan.modelPlan?.expertModel || routePlan.selectedExpert,
            responseClass: routePlan.safetyPlan?.emergencyEscalation ? 'clinical' : 'operational',
            recommendedReviewerRole: 'Responsible clinician',
            missingInformation: Array.isArray((response as any).missingInformation)
              ? (response as any).missingInformation
              : [],
            limitations: [
              'Chat/copilot output is decision support only.',
              routePlan.retrievalPolicy
                ? `Retrieval policy: ${String(routePlan.retrievalPolicy)}`
                : 'Retrieval policy not specified for this route.',
            ],
          });

    const evidence = (Array.isArray(citations) ? citations : []).map((c: any, index: number) => ({
      sourceId: String(c?.id || c?.sourceId || c?.documentId || `src-${index}`),
      title: c?.title || c?.name,
      citation: String(c?.citation || c?.snippet || c?.text || c?.title || 'Retrieved source'),
      score: typeof c?.score === 'number' ? c.score : undefined,
      outdated: Boolean(c?.outdated),
    }));

    const safetyEscalate = Boolean(routePlan.safetyPlan?.emergencyEscalation);
    const accountableRecommendation = buildAccountableRecommendationDto({
      content: String(
        (response as any).content || (response as any).answer || (response as any).message || '',
      ),
      evidence,
      confidence: typeof confidence === 'number' ? confidence : null,
      model: {
        provider: 'caredroid',
        name: String(routePlan.modelPlan?.expertModel || routePlan.selectedExpert || 'gateway'),
        version: routePlan.modelPlan?.routerModel
          ? String(routePlan.modelPlan.routerModel)
          : undefined,
      },
      promptVersion: String(
        (response as any).promptVersion || envelope.capabilityId || 'ai-gateway@1',
      ),
      safetyStatus: safetyEscalate ? 'escalate' : routePlan.fallbackApplied ? 'degraded' : 'ok',
      safetyReasons: safetyEscalate
        ? ['emergency_escalation']
        : routePlan.fallbackApplied
          ? ['fallback_applied']
          : [],
      humanReviewRequired: true,
      requestId: envelope.runId,
      tenantId: (contextPacket as any)?.organizationId || (contextPacket as any)?.tenantId,
    });

    return {
      ...response,
      provenance,
      requiresClinicianReview: true,
      accountableRecommendation,
      metadata: {
        ...response.metadata,
        aiFoundation,
        provenance,
        accountableRecommendation,
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
          routingMode: contextPacket.route.routingMode,
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
