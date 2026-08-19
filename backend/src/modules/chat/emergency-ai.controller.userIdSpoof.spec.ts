import { EmergencyAIController } from './emergency-ai.controller';

/**
 * HEAL-327: dto.userId/dto.tenantId (optional, client-settable DTO fields)
 * previously took PRIORITY over the authenticated
 * req.user.id/req.user.profile.organizationId. userId flows into
 * ChatService.processMessage -> buildAssistantMemoryContext, which fetches
 * short/long/clinical memory keyed only by that id with no ownership check
 * -- so any authenticated caller holding USE_AI_CHAT could pull another
 * user's clinical memory into their own AI response by simply setting
 * userId in the request body. This proves the fix at the actual call
 * boundary (what userId/tenantId reach ChatService), not just via static
 * source-text matching.
 *
 * HEAL-347.34: this file's own req.user mock used to hand-add a `tenantId`
 * field directly on req.user -- but JwtStrategy.validate() returns the
 * plain TypeORM User entity (id/email/role/profile/subscription), which
 * has NO tenantId property at all, so that shape can never occur on a real
 * request. The org actually lives on the profile relation JwtStrategy
 * always loads (`relations: ['profile', 'subscription']`). Because this
 * mock didn't match reality, these tests were passing while the real code
 * (emergency-ai.controller.ts's req?.user?.tenantId) was silently always
 * undefined in production -- confirmed live: rag.service.ts's
 * buildRetrievalFilter() leaves retrieval UNSCOPED across every
 * organization whenever organizationId is undefined, and
 * emergency-escalation.service.ts collapsed every hospital's incident
 * channel into one shared 'default-organization' channel. Fixed the mock
 * to match JwtStrategy's real return shape.
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
    user: {
      id: 'real-authenticated-user',
      role: 'physician',
      profile: { organizationId: 'real-org' },
    },
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

  it('uses the authenticated req.user.profile.organizationId, not an attacker-supplied dto.tenantId', async () => {
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

  it('forwards the authenticated organizationId to processMessage so emergency escalation can attribute the incident channel to the real org (HEAL-340)', async () => {
    const { controller, processMessage } = buildController();

    await controller.sendCopilotMessage(
      {
        message: 'hello',
        purpose: 'test',
        sourceModule: 'test',
      } as any,
      req,
    );

    expect(processMessage).toHaveBeenCalledTimes(1);
    const organizationIdArg = processMessage.mock.calls[0][10];
    expect(organizationIdArg).toBe('real-org');
  });
});
