import { ForbiddenException } from '@nestjs/common';
import { AIController } from './ai.controller';

describe('AIController organization usage', () => {
  const req = { user: { id: 'user-1' } };
  const tenantReq = {
    user: { id: 'user-1' },
    tenantContext: {
      organizationId: 'org-1',
      workspaceId: 'workspace-1',
      userId: 'user-1',
      role: 'physician',
      subscriptionPlan: 'institutional',
      source: 'resolved',
    },
  };

  const buildController = () => {
    const aiService = {
      invokeLLM: jest.fn().mockResolvedValue({ content: 'ok' }),
      generateStructuredJSON: jest.fn().mockResolvedValue({ ok: true }),
      getUsage: jest.fn(),
      getRemainingQueries: jest.fn(),
      getOrganizationUsageSummary: jest.fn().mockResolvedValue({ organizationId: 'org-1' }),
      getProvidersHealth: jest.fn().mockReturnValue({ providers: [] }),
      getRegisteredModels: jest.fn().mockReturnValue({ models: [] }),
      getAiToolCatalog: jest.fn().mockReturnValue({ tools: [] }),
      getRequestById: jest.fn().mockResolvedValue({ id: 'query-1' }),
      runUnifiedAiQuery: jest.fn().mockResolvedValue({ status: 'needs_human_review' }),
      runCareDroidAINode: jest.fn(),
    };
    const organizationsService = {
      assertMemberForUser: jest.fn().mockResolvedValue({ organizationId: 'org-1' }),
    };
    const entitlementService = {
      assertLaunchAllowed: jest.fn().mockResolvedValue({ isLaunchable: true }),
    };
    const actionProposals = {
      create: jest.fn().mockReturnValue({ proposalId: 'p1', state: 'proposed' }),
      list: jest.fn().mockReturnValue([]),
      get: jest.fn().mockReturnValue({ proposalId: 'p1' }),
      approve: jest.fn().mockReturnValue({ proposalId: 'p1', state: 'approved' }),
      reject: jest.fn().mockReturnValue({ proposalId: 'p1', state: 'rejected' }),
      execute: jest.fn().mockReturnValue({ proposalId: 'p1', state: 'completed' }),
      transition: jest.fn().mockReturnValue({ proposalId: 'p1', state: 'rolled_back' }),
    };
    return {
      controller: new AIController(
        aiService as any,
        organizationsService as any,
        entitlementService as any,
        actionProposals as any,
      ),
      aiService,
      organizationsService,
      entitlementService,
      actionProposals,
    };
  };

  it('requires organization membership before returning organization AI usage', async () => {
    const { controller, aiService, organizationsService } = buildController();

    await controller.getOrganizationUsage(req, 'org-1', 14);

    expect(organizationsService.assertMemberForUser).toHaveBeenCalledWith('user-1', 'org-1');
    expect(aiService.getOrganizationUsageSummary).toHaveBeenCalledWith('org-1', 14);
  });

  it('does not return organization AI usage when membership is denied', async () => {
    const { controller, aiService, organizationsService } = buildController();
    organizationsService.assertMemberForUser.mockRejectedValue(
      new ForbiddenException('Not a member of this organization'),
    );

    await expect(controller.getOrganizationUsage(req, 'org-2')).rejects.toBeInstanceOf(
      ForbiddenException,
    );
    expect(aiService.getOrganizationUsageSummary).not.toHaveBeenCalled();
  });

  it('exposes provider health, models, tools, and request lookup endpoints', async () => {
    const { controller, aiService } = buildController();

    await controller.getProvidersHealth();
    await controller.getModels();
    await controller.getTools();
    await controller.getRequest(tenantReq, 'query-1');

    expect(aiService.getProvidersHealth).toHaveBeenCalled();
    expect(aiService.getRegisteredModels).toHaveBeenCalled();
    expect(aiService.getAiToolCatalog).toHaveBeenCalled();
    expect(aiService.getRequestById).toHaveBeenCalledWith(
      'user-1',
      'query-1',
      tenantReq.tenantContext,
    );
  });

  it('routes POST /ai/unified through the unified query service with tenant context', async () => {
    const { controller, aiService, entitlementService } = buildController();
    const dto = {
      role: 'reception',
      permissions: ['use_ai_chat'],
      channel: 'reception',
      task: 'detect_missing_information',
      query: 'What is missing?',
      responseFormat: 'structured' as const,
    };

    await controller.runUnifiedQuery(tenantReq, dto as any);

    expect(entitlementService.assertLaunchAllowed).toHaveBeenCalled();
    expect(aiService.runUnifiedAiQuery).toHaveBeenCalledWith(
      'user-1',
      dto,
      expect.objectContaining({
        organizationId: 'org-1',
        workspaceId: 'workspace-1',
        role: 'physician',
      }),
    );
  });

  it('creates and lists AI action proposals', async () => {
    const { controller, actionProposals, entitlementService } = buildController();
    await controller.createProposal(tenantReq, {
      originatingRequestId: 'req-1',
      correlationId: 'corr-1',
      toolName: 'prepare_ems_handoff_draft',
      expectedEffect: 'Draft only',
      previewSummary: 'No chart write',
      riskLevel: 'moderate',
    });
    expect(entitlementService.assertLaunchAllowed).toHaveBeenCalled();
    expect(actionProposals.create).toHaveBeenCalled();
    await controller.listProposals(tenantReq, undefined, '1');
    expect(actionProposals.list).toHaveBeenCalledWith(
      expect.objectContaining({ organizationId: 'org-1', ownerUserId: 'user-1' }),
    );
  });

  it('passes tenant context into AI query metadata', async () => {
    const { controller, aiService, entitlementService } = buildController();

    await controller.query(tenantReq, {
      prompt: 'Assess sepsis risk',
      context: { feature: 'assistant' },
    } as any);

    expect(aiService.invokeLLM).toHaveBeenCalledWith(
      'user-1',
      'Assess sepsis risk',
      expect.objectContaining({
        feature: 'assistant',
        // Cycle 233: public clinical endpoints force human-review flag (gateway parity)
        aiFoundation: expect.objectContaining({ requiresHumanReview: true }),
        tenant: expect.objectContaining({
          organizationId: 'org-1',
          workspaceId: 'workspace-1',
          subscriptionPlan: 'institutional',
        }),
      }),
    );
    expect(entitlementService.assertLaunchAllowed).toHaveBeenCalledWith(
      expect.objectContaining({
        assetId: 'agent-clinical',
        organizationId: 'org-1',
        subscriptionPlan: 'institutional',
      }),
    );
  });

  it('passes tenant context into structured AI metadata', async () => {
    const { controller, aiService } = buildController();

    await controller.generateStructured(tenantReq, {
      prompt: 'Generate JSON',
      schema: { type: 'object' },
    } as any);

    expect(aiService.generateStructuredJSON).toHaveBeenCalledWith(
      'user-1',
      'Generate JSON',
      { type: 'object' },
      expect.objectContaining({
        aiFoundation: expect.objectContaining({ requiresHumanReview: true }),
        tenant: expect.objectContaining({
          organizationId: 'org-1',
          workspaceId: 'workspace-1',
        }),
      }),
    );
  });

  it('forces requiresHumanReview on /query even when client omits or denies it (Cycle 233)', async () => {
    const { controller, aiService } = buildController();

    await controller.query(tenantReq, {
      prompt: 'Draft differential',
      context: { aiFoundation: { requiresHumanReview: false, capabilityId: 'client' } },
    } as any);

    const [, , context] = (aiService.invokeLLM as jest.Mock).mock.calls[0];
    expect(context.aiFoundation.requiresHumanReview).toBe(true);
    expect(context.aiFoundation.capabilityId).toBe('client');
  });

  it('rejects organization usage when path organization differs from tenant context', async () => {
    const { controller, aiService } = buildController();

    await expect(controller.getOrganizationUsage(tenantReq, 'org-2')).rejects.toBeInstanceOf(
      ForbiddenException,
    );
    expect(aiService.getOrganizationUsageSummary).not.toHaveBeenCalled();
  });
});
