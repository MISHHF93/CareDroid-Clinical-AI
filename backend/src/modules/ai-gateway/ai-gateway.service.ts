import { Injectable, Logger, Optional } from '@nestjs/common';
import { randomUUID } from 'crypto';
import { AuditService } from '../audit/audit.service';
import { AuditAction } from '../audit/entities/audit-log.entity';
import {
  AiGatewayMetadata,
  ExpertRoutePlan,
  GatewayRunEnvelope,
} from '../moe-router/moe-router.types';
import { IntentClassification } from '../medical-control-plane/intent-classifier/dto/intent-classification.dto';

interface CreateRunEnvelopeInput {
  message: string;
  tool?: string;
  feature?: string;
  conversationId?: number | string;
  userId?: string;
  sourceSurface: string;
  clientRequestId?: string;
  workspaceId?: string;
  organizationId?: string;
}

@Injectable()
export class AIGatewayService {
  private readonly logger = new Logger(AIGatewayService.name);

  constructor(@Optional() private readonly auditService?: AuditService) {}

  createRunEnvelope(input: CreateRunEnvelopeInput): GatewayRunEnvelope {
    const capabilityId = input.feature || input.tool || 'clinical-chat';

    return {
      runId: randomUUID(),
      capabilityId,
      userId: input.userId || 'anonymous',
      workspaceId: input.workspaceId,
      organizationId: input.organizationId,
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
        clientRequestId: input.clientRequestId,
        startedAt: new Date().toISOString(),
      },
    };
  }

  toMetadata(envelope: GatewayRunEnvelope, routePlan: ExpertRoutePlan): AiGatewayMetadata {
    return {
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
  }

  async logRoutingAudit(input: {
    envelope: GatewayRunEnvelope;
    classification: IntentClassification | null;
    routePlan: ExpertRoutePlan;
    userId?: string;
    ipAddress?: string;
    userAgent?: string;
  }): Promise<void> {
    if (!this.auditService || !input.userId) return;

    const { envelope, classification, routePlan } = input;
    try {
      await this.auditService.log({
        userId: input.userId,
        action: AuditAction.AI_QUERY,
        resource: 'ai-gateway/route',
        phiAccessed: envelope.policy.phiAccessed,
        ipAddress: input.ipAddress || '0.0.0.0',
        userAgent: input.userAgent || 'ai-gateway',
        metadata: {
          runId: envelope.runId,
          capabilityId: envelope.capabilityId,
          primaryIntent: routePlan.primaryIntent,
          selectedExpert: routePlan.selectedExpert,
          selectedExperts: routePlan.selectedExperts.map((expert) => expert.expertId),
          routingMode: routePlan.routingMode,
          routeScore: routePlan.routeScore,
          confidence: routePlan.confidence,
          fallbackApplied: routePlan.fallbackApplied,
          toolIds: routePlan.toolPlan.allowedToolIds,
          method: classification?.method || 'fallback',
          messageCharacters: envelope.input.message?.length || 0,
        },
      });
    } catch (error) {
      this.logger.warn(
        `AI gateway audit logging failed: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }

  private requiresPhi(feature?: string, tool?: string): boolean {
    const phiCapabilities = new Set([
      'ambient-scribe',
      'differential-ai',
      'timeline-ai',
      'patient-summary-ai',
      'order-set-ai',
      'lab-interpreter',
    ]);
    return Boolean((feature && phiCapabilities.has(feature)) || (tool && phiCapabilities.has(tool)));
  }
}
