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
    };
    const organizationsService = {
      assertMemberForUser: jest.fn().mockResolvedValue({ organizationId: 'org-1' }),
    };
    const entitlementService = {
      assertLaunchAllowed: jest.fn().mockResolvedValue({ isLaunchable: true }),
    };
    return {
      controller: new AIController(aiService as any, organizationsService as any, entitlementService as any),
      aiService,
      organizationsService,
      entitlementService,
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
        tenant: expect.objectContaining({
          organizationId: 'org-1',
          workspaceId: 'workspace-1',
        }),
      }),
    );
  });

  it('rejects organization usage when path organization differs from tenant context', async () => {
    const { controller, aiService } = buildController();

    await expect(controller.getOrganizationUsage(tenantReq, 'org-2')).rejects.toBeInstanceOf(
      ForbiddenException,
    );
    expect(aiService.getOrganizationUsageSummary).not.toHaveBeenCalled();
  });
});
