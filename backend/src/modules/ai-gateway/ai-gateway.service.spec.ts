import { PrimaryIntent } from '../medical-control-plane/intent-classifier/dto/intent-classification.dto';
import { AIGatewayService } from './ai-gateway.service';
import { ContextBuilderService } from './context-builder.service';
import { ResponseComposerService } from './response-composer.service';
import { ExpertRoutePlan, GatewayRunEnvelope } from '../moe-router/moe-router.types';

function createEnvelope(): GatewayRunEnvelope {
  return {
    runId: 'run-1',
    capabilityId: 'patient-summary-ai',
    userId: 'user-1',
    conversationId: '42',
    input: {
      message: 'Draft a discharge summary',
      featureHint: 'patient-summary-ai',
    },
    policy: {
      phiAccessed: true,
      requiresHumanReview: true,
      allowedTools: [],
    },
    trace: {
      sourceSurface: 'assistant-chat',
      startedAt: '2026-05-25T00:00:00.000Z',
    },
  };
}

function createRoutePlan(): ExpertRoutePlan {
  return {
    runId: 'run-1',
    primaryIntent: PrimaryIntent.MEDICAL_REFERENCE,
    selectedExpert: 'documentation',
    selectedExperts: [
      {
        expertId: 'documentation',
        role: 'primary',
        confidence: 0.82,
        relevance: 0.9,
        estimatedCost: 0.07,
        score: 10.54,
        reason: 'Documentation request',
      },
    ],
    confidence: 0.82,
    retrievalPolicy: 'patient_scoped',
    routeScore: 10.54,
    routeReason: 'Documentation request',
    routingMode: 'single_expert',
    fallbackApplied: false,
    routingEvidence: [],
    modelPlan: {
      routerModel: 'deterministic',
      expertModel: 'small',
      useLightweightFirst: true,
      allowEscalation: false,
      maxTokens: 1600,
    },
    toolPlan: {
      allowedToolIds: [],
      backendExecutorIds: [],
      requiredHumanConfirmation: true,
      orchestrationMode: 'skip',
    },
    costPlan: {
      preferredModel: 'claude-sonnet-4-20250514',
      maxTokens: 1600,
      allowFallback: true,
      estimatedCost: 0.09,
      costReductionApplied: ['lightweight_router'],
    },
    safetyPlan: {
      emergencyEscalation: false,
      crisisEscalation: false,
      requiresHumanReview: true,
      blockedActions: ['auto_sign_note'],
    },
  };
}

describe('AIGatewayService', () => {
  it('creates governed run envelopes and marks PHI-capable features', () => {
    const service = new AIGatewayService();
    const envelope = service.createRunEnvelope({
      message: 'Draft a discharge summary',
      feature: 'patient-summary-ai',
      conversationId: 42,
      userId: 'user-1',
      sourceSurface: 'assistant-chat',
    });

    expect(envelope.runId).toEqual(expect.any(String));
    expect(envelope.capabilityId).toBe('patient-summary-ai');
    expect(envelope.conversationId).toBe('42');
    expect(envelope.policy.phiAccessed).toBe(true);
    expect(envelope.policy.requiresHumanReview).toBe(true);
  });

  it('logs gateway routing decisions without storing message text', async () => {
    const auditService = { log: jest.fn().mockResolvedValue(undefined) };
    const service = new AIGatewayService(auditService as any);

    await service.logRoutingAudit({
      envelope: createEnvelope(),
      classification: null,
      routePlan: createRoutePlan(),
      userId: 'user-1',
    });

    expect(auditService.log).toHaveBeenCalledWith(
      expect.objectContaining({
        action: 'ai_query',
        resource: 'ai-gateway/route',
        phiAccessed: true,
        metadata: expect.objectContaining({
          runId: 'run-1',
          selectedExpert: 'documentation',
          messageCharacters: 25,
        }),
      }),
    );
    expect(auditService.log.mock.calls[0][0].metadata.message).toBeUndefined();
  });
});

describe('ContextBuilderService and ResponseComposerService', () => {
  it('adds gateway, router, context, tool, and composer metadata', () => {
    const envelope = createEnvelope();
    const routePlan = createRoutePlan();
    const context = new ContextBuilderService().buildContextPacket(envelope, routePlan);
    const response = new ResponseComposerService().compose(
      { text: 'Summary ready' },
      envelope,
      routePlan,
      context,
    );

    expect(response.metadata.aiFoundation).toMatchObject({
      selectedExpert: 'documentation',
      routingMode: 'single_expert',
      estimatedCost: 0.09,
    });
    expect(response.metadata.aiGateway.pipeline.map((stage) => stage.stage)).toEqual([
      'ai_gateway',
      'intent_classifier',
      'expert_router',
      'context_builder',
      'tool_orchestrator',
      'response_composer',
      'provenance_contract',
    ]);
  });
});
