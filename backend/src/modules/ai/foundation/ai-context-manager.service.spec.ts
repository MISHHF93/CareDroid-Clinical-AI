import { AiContextManagerService } from './ai-context-manager.service';
import { AiRunEnvelope, ExpertRoutePlan } from './ai-foundation.types';

describe('AiContextManagerService', () => {
  const service = new AiContextManagerService();

  const envelope: AiRunEnvelope = {
    runId: 'run-1',
    capabilityId: 'clinical-chat',
    userId: 'user-1',
    conversationId: '7',
    input: {
      message: 'Very long patient prompt that should not be copied into model foundation metadata.',
      toolHint: 'heart-score',
    },
    policy: {
      phiAccessed: true,
      requiresHumanReview: true,
      allowedTools: ['heart-score'],
    },
    trace: {
      sourceSurface: 'assistant-chat',
      startedAt: '2026-05-25T00:00:00.000Z',
    },
  };

  const routePlan: ExpertRoutePlan = {
    runId: 'run-1',
    primaryIntent: 'medical_reference',
    selectedExpert: 'cardiology',
    selectedExperts: [
      {
        expertId: 'cardiology',
        role: 'primary',
        confidence: 0.82,
        relevance: 0.94,
        estimatedCost: 0.12,
        score: 6.42,
        reason: 'Cardiology signals were present.',
      },
    ],
    confidence: 0.82,
    retrievalPolicy: 'guideline',
    routeScore: 6.42,
    routeReason: 'Cardiology signals were present.',
    routingEvidence: [],
    modelPlan: {
      routerModel: 'deterministic',
      expertModel: 'small',
      useLightweightFirst: true,
      allowEscalation: false,
      maxTokens: 1600,
    },
    toolPlan: {
      allowedToolIds: ['heart-score'],
      backendExecutorIds: [],
      requiredHumanConfirmation: true,
    },
    costPlan: {
      preferredModel: 'gpt-4o-mini',
      maxTokens: 1600,
      allowFallback: true,
      estimatedCost: 0.14,
      costReductionApplied: ['lightweight_router'],
    },
    safetyPlan: {
      emergencyEscalation: false,
      crisisEscalation: false,
      requiresHumanReview: true,
      blockedActions: ['auto_sign_note'],
    },
  };

  it('builds a compact context packet without copying the raw prompt', () => {
    const packet = service.buildContextPacket(envelope, routePlan);

    expect(packet.inputSummary.messageCharacters).toBe(envelope.input.message?.length);
    expect(JSON.stringify(packet)).not.toContain('Very long patient prompt');
    expect(packet.route.selectedExperts[0].expertId).toBe('cardiology');
    expect(packet.cost.estimatedCost).toBe(0.14);
  });

  it('returns compact model context for downstream AI calls', () => {
    const modelContext = service.toModelContext(service.buildContextPacket(envelope, routePlan));

    expect(modelContext).toMatchObject({
      runId: 'run-1',
      selectedExpert: 'cardiology',
      retrievalPolicy: 'guideline',
      routeScore: 6.42,
      estimatedCost: 0.14,
      requiresHumanReview: true,
    });
  });
});
