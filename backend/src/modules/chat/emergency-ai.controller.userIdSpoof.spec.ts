import { EmergencyAIController } from './emergency-ai.controller';

/**
 * HEAL-327: dto.userId/dto.tenantId (optional, client-settable DTO fields)
 * previously took PRIORITY over the authenticated req.user.id/tenantId.
 * userId flows into ChatService.processMessage -> buildAssistantMemoryContext,
 * which fetches short/long/clinical memory keyed only by that id with no
 * ownership check -- so any authenticated caller holding USE_AI_CHAT could
 * pull another user's clinical memory into their own AI response by simply
 * setting userId in the request body. This proves the fix at the actual
 * call boundary (what userId/tenantId reach ChatService), not just via
 * static source-text matching.
 */
describe('EmergencyAIController userId/tenantId spoofing (HEAL-327)', () => {
  function buildController() {
    const processMessage = jest.fn().mockResolvedValue({
      text: 'ok',
      suggestions: [],
      visualizations: [],
    });
    const chatService = { processMessage } as any;
    const entitlementService = {
      assertLaunchAllowed: jest.fn().mockResolvedValue(undefined),
    } as any;
    const controller = new EmergencyAIController(chatService, entitlementService);
    return { controller, processMessage };
  }

  const req = {
    user: { id: 'real-authenticated-user', role: 'physician', tenantId: 'real-org' },
  };

  it('uses the authenticated req.user.id, not an attacker-supplied dto.userId', async () => {
    const { controller, processMessage } = buildController();

    await controller.sendCopilotMessage(
      {
        message: 'hello',
        purpose: 'test',
        sourceModule: 'test',
        userId: 'victim-user-id',
      } as any,
      req,
    );

    expect(processMessage).toHaveBeenCalledTimes(1);
    const [, , , , userIdArg] = processMessage.mock.calls[0];
    expect(userIdArg).toBe('real-authenticated-user');
    expect(userIdArg).not.toBe('victim-user-id');
  });

  it('uses the authenticated req.user.tenantId, not an attacker-supplied dto.tenantId', async () => {
    const { controller, processMessage } = buildController();

    await controller.sendCopilotMessage(
      {
        message: 'hello',
        purpose: 'test',
        sourceModule: 'test',
        tenantId: 'other-org',
      } as any,
      req,
    );

    const [, , , , , , , workspaceContextArg] = processMessage.mock.calls[0];
    expect(workspaceContextArg.aiRequest.tenantId).toBe('real-org');
    expect(workspaceContextArg.aiRequest.tenantId).not.toBe('other-org');
  });

  it('still falls back to a client-supplied userId/tenantId when unauthenticated (no req.user)', async () => {
    const { controller, processMessage } = buildController();

    await controller.sendCopilotMessage(
      {
        message: 'hello',
        purpose: 'test',
        sourceModule: 'test',
        userId: 'fallback-user-id',
        tenantId: 'fallback-org',
      } as any,
      {},
    );

    const [, , , , userIdArg, , , workspaceContextArg] = processMessage.mock.calls[0];
    expect(userIdArg).toBe('fallback-user-id');
    expect(workspaceContextArg.aiRequest.tenantId).toBe('fallback-org');
  });
});
