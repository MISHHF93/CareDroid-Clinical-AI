import { EdCopilotNestParityController } from './ed-copilot.nest-parity.controller';

// Converged 2026-08-08: this controller delegates to ChatService.processMessage()
// (the canonical orchestration pipeline) instead of the removed
// EDCopilotService.processQuery() keyword matcher -- see the controller's own
// header comment and AI_ORCHESTRATION_AUDIT.md.
describe('EdCopilotNestParityController', () => {
  it('returns validation envelope when query/user_role missing', async () => {
    const chatService = { processMessage: jest.fn() };
    const controller = new EdCopilotNestParityController(chatService as any);
    const result = await controller.query({});
    expect(result).toMatchObject({
      success: false,
      error: { code: 'VALIDATION', statusCode: 400 },
    });
    expect(chatService.processMessage).not.toHaveBeenCalled();
  });

  it('delegates to ChatService.processMessage() and returns an accountable recommendation', async () => {
    const chatService = {
      processMessage: jest.fn().mockResolvedValue({
        text: 'Patient X waited longest',
        metadata: {
          safety: { requiresHumanReview: true },
          edCopilot: { command: 'longest_waiting' },
          // Canonical AI Core Node contract (lib/ai/provenanceContract.ts) --
          // responseSource is the 8-value enum, modelOrEngine replaces the
          // old ad-hoc modelOrTool/modelVersion/deterministic fields.
          provenance: {
            contractVersion: '1.1.0',
            responseSource: 'DETERMINISTIC_RULE',
            modelOrEngine: 'ed-copilot-deterministic-commands',
            requiresClinicianReview: true,
          },
        },
      }),
    };
    const controller = new EdCopilotNestParityController(chatService as any);
    const result = (await controller.query({
      query: 'Who waited longest?',
      user_role: 'charge_nurse',
    })) as any;

    expect(chatService.processMessage).toHaveBeenCalledWith(
      'Who waited longest?',
      undefined,
      'ed-copilot',
      undefined,
      undefined,
      'charge_nurse',
      undefined,
      expect.objectContaining({ edCopilot: expect.objectContaining({ enabled: true }) }),
    );
    expect(result.accountableRecommendation).toBeDefined();
    expect(result.accountableRecommendation.content).toMatch(/waited/i);
    expect(result.accountableRecommendation.model).toMatchObject({
      name: 'ed-copilot-deterministic-commands',
      version: 'DETERMINISTIC_RULE',
    });
    expect(result.requiresClinicianReview).toBe(true);
    expect(result.provenance).toMatchObject({ responseSource: 'DETERMINISTIC_RULE' });
  });

  it('HEAL-334: uses the authenticated req.user.role, not a client-supplied body.user_role, when both are present', async () => {
    const chatService = {
      processMessage: jest.fn().mockResolvedValue({ text: 'ok', metadata: {} }),
    };
    const controller = new EdCopilotNestParityController(chatService as any);

    await controller.query(
      { query: 'Who waited longest?', user_role: 'attacker-claimed-admin' },
      { user: { id: 'real-user', role: 'charge_nurse' } },
    );

    const [, , , , calledUserId, calledUserRole] = chatService.processMessage.mock.calls[0];
    expect(calledUserId).toBe('real-user');
    expect(calledUserRole).toBe('charge_nurse');
    expect(calledUserRole).not.toBe('attacker-claimed-admin');
  });
});
