import { AiGatewayService } from './ai-gateway.service';

describe('AiGatewayService', () => {
  const service = new AiGatewayService();

  it('creates a governed run envelope for chat requests', () => {
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
    expect(envelope.trace.sourceSurface).toBe('assistant-chat');
  });

  it('uses tool hints as capability fallback', () => {
    const envelope = service.createRunEnvelope({
      message: 'Check medications',
      tool: 'drug-interactions',
      userId: 'user-1',
      sourceSurface: 'assistant-chat',
    });

    expect(envelope.capabilityId).toBe('drug-interactions');
    expect(envelope.input.toolHint).toBe('drug-interactions');
    expect(envelope.policy.allowedTools).toEqual(['drug-interactions']);
  });
});
