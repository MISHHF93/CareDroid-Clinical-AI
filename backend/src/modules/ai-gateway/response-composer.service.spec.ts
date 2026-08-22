import { PrimaryIntent } from '../medical-control-plane/intent-classifier/dto/intent-classification.dto';
import { ContextBuilderService } from './context-builder.service';
import { ResponseComposerService } from './response-composer.service';
import { ExpertRoutePlan, GatewayRunEnvelope } from '../moe-router/moe-router.types';

function createEnvelope(): GatewayRunEnvelope {
  return {
    runId: 'run-1',
    capabilityId: 'clinical-chat',
    userId: 'user-1',
    conversationId: '42',
    input: {
      message: 'What is the capital of France?',
      featureHint: 'clinical-chat',
    },
    policy: {
      phiAccessed: false,
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

// A real, already-existing call site (ChatService.processMessage()'s catch block, when the
// upstream LLM/tool call throws -- e.g. AI disabled, no API key, rate limit) composes a
// deterministic canned response the exact same way a real LLM response is composed. Without
// an explicit signal, ResponseComposerService's own naive inference (no toolResult, no RAG
// chunks -> LLM_GENERATED) mislabeled that deterministic fallback text as real model output
// in the response's own provenance.responseSource -- a clinician or auditor reading that
// field would wrongly trust it as AI-generated. Pins the fix: an explicit
// `responseSourceHint` on the composed input overrides the naive inference.
describe('ResponseComposerService responseSource labeling', () => {
  function compose(extraResponseFields: Record<string, unknown> = {}) {
    const service = new ResponseComposerService();
    const envelope = createEnvelope();
    const routePlan = createRoutePlan();
    const contextPacket = new ContextBuilderService().buildContextPacket(envelope, routePlan);

    return service.compose(
      { text: 'Clinical query processed. Patient context loaded.', ...extraResponseFields },
      envelope,
      routePlan,
      contextPacket,
    );
  }

  it('defaults to LLM_GENERATED when no hint is given and no tool/RAG evidence is present (unchanged prior behavior)', () => {
    const composed = compose();
    expect(composed.provenance.responseSource).toBe('LLM_GENERATED');
  });

  it('honors an explicit DETERMINISTIC_RULE hint instead of defaulting to LLM_GENERATED', () => {
    const composed = compose({ responseSourceHint: 'DETERMINISTIC_RULE' });
    expect(composed.provenance.responseSource).toBe('DETERMINISTIC_RULE');
  });

  it('ignores a garbage/unknown hint value and falls back to the conservative inference', () => {
    const composed = compose({ responseSourceHint: 'not_a_real_category' });
    expect(composed.provenance.responseSource).toBe('LLM_GENERATED');
  });

  it('an explicit hint takes priority even when a toolResult is also present (trust the caller over structural inference)', () => {
    const composed = compose({
      responseSourceHint: 'DETERMINISTIC_RULE',
      toolResult: { toolId: 'heart-score' },
    });
    expect(composed.provenance.responseSource).toBe('DETERMINISTIC_RULE');
  });
});
