import { Injectable } from '@nestjs/common';
import { randomUUID } from 'crypto';
import { AiFoundationMetadata, AiRunEnvelope } from './ai-foundation.types';

interface CreateRunEnvelopeInput {
  message: string;
  tool?: string;
  feature?: string;
  conversationId?: number;
  userId?: string;
  sourceSurface: string;
}

@Injectable()
export class AiGatewayService {
  createRunEnvelope(input: CreateRunEnvelopeInput): AiRunEnvelope {
    const capabilityId = input.feature || input.tool || 'clinical-chat';

    return {
      runId: randomUUID(),
      capabilityId,
      userId: input.userId || 'anonymous',
      conversationId:
        input.conversationId === undefined ? undefined : String(input.conversationId),
      input: {
        message: input.message,
        toolHint: input.tool,
        featureHint: input.feature,
      },
      policy: {
        phiAccessed: this.requiresPhi(input.feature, input.tool),
        requiresHumanReview: true,
        allowedTools: input.tool ? [input.tool] : [],
      },
      trace: {
        sourceSurface: input.sourceSurface,
        startedAt: new Date().toISOString(),
      },
    };
  }

  toMetadata(
    envelope: AiRunEnvelope,
    route: {
      primaryIntent: string;
      selectedExpert: string;
      retrievalPolicy: AiFoundationMetadata['retrievalPolicy'];
      confidence: number;
    },
  ): AiFoundationMetadata {
    return {
      runId: envelope.runId,
      capabilityId: envelope.capabilityId,
      route: route.primaryIntent,
      selectedExpert: route.selectedExpert,
      retrievalPolicy: route.retrievalPolicy,
      confidence: route.confidence,
      phiAccessed: envelope.policy.phiAccessed,
      requiresHumanReview: envelope.policy.requiresHumanReview,
      startedAt: envelope.trace.startedAt,
    };
  }

  private requiresPhi(feature?: string, tool?: string): boolean {
    const phiCapabilities = new Set([
      'ambient-scribe',
      'differential-ai',
      'timeline-ai',
      'patient-summary-ai',
      'order-set-ai',
    ]);
    return Boolean((feature && phiCapabilities.has(feature)) || (tool && phiCapabilities.has(tool)));
  }
}
