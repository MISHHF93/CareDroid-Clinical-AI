import { AiResponseComposerService } from './ai-response-composer.service';
import { AiContextPacket, AiRunEnvelope, ExpertRoutePlan } from './ai-foundation.types';

describe('AiResponseComposerService', () => {
  const service = new AiResponseComposerService();

  const envelope: AiRunEnvelope = {
    runId: 'run-1',
    capabilityId: 'clinical-chat',
    userId: 'user-1',
    input: { message: 'Review troponin.' },
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

  const routePlan: ExpertRoutePlan = {
    runId: 'run-1',
    primaryIntent: 'medical_reference',
    selectedExpert: 'cardiology',
    selectedExperts: [
      {
        expertId: 'cardiology',
        role: 'primary',
        confidence: 0.84,
        relevance: 0.94,
        estimatedCost: 0.12,
        score: 6.58,
        reason: 'Cardiology signals were present.',
      },
    ],
    confidence: 0.84,
    retrievalPolicy: 'guideline',
    routeScore: 6.58,
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
      allowedToolIds: [],
      backendExecutorIds: [],
      requiredHumanConfirmation: true,
    },
    costPlan: {
      preferredModel: 'claude-sonnet-4-20250514',
      maxTokens: 1600,
      allowFallback: true,
      estimatedCost: 0.14,
      costReductionApplied: ['single_expert_execution'],
    },
    safetyPlan: {
      emergencyEscalation: false,
      crisisEscalation: false,
      requiresHumanReview: true,
      blockedActions: ['auto_sign_note'],
    },
  };

  const contextPacket: AiContextPacket = {
    runId: 'run-1',
    capabilityId: 'clinical-chat',
    userId: 'user-1',
    sourceSurface: 'assistant-chat',
    inputSummary: { messageCharacters: 16 },
    route: {
      primaryIntent: 'medical_reference',
      selectedExpert: 'cardiology',
      selectedExperts: routePlan.selectedExperts,
      retrievalPolicy: 'guideline',
      confidence: 0.84,
      routeScore: 6.58,
      routeReason: 'Cardiology signals were present.',
    },
    cost: {
      estimatedCost: 0.14,
      costReductionApplied: ['single_expert_execution'],
    },
    memory: {
      conversationScope: 'request',
      persistence: 'planned',
    },
    safety: {
      phiAccessed: false,
      requiresHumanReview: true,
      blockedActions: ['auto_sign_note'],
    },
  };

  it('preserves response fields while attaching route, safety, and cost metadata', () => {
    const response = service.compose(
      { text: 'Cardiology summary', suggestions: ['Review ECG'] },
      envelope,
      routePlan,
      contextPacket,
    );

    expect(response.text).toBe('Cardiology summary');
    expect(response.suggestions).toEqual(['Review ECG']);
    expect(response.metadata.aiFoundation).toMatchObject({
      selectedExpert: 'cardiology',
      routeScore: 6.58,
      estimatedCost: 0.14,
      requiresHumanReview: true,
    });
    expect(response.metadata.routePlan.costPlan.costReductionApplied).toContain(
      'single_expert_execution',
    );
    expect(response.metadata.safety.blockedActions).toEqual(['auto_sign_note']);
  });
});
