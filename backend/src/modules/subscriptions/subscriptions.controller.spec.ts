import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { GUARDS_METADATA } from '@nestjs/common/constants';
import { Reflector } from '@nestjs/core';
import { SubscriptionTier } from './entities/subscription.entity';
import { UsageEventType } from './subscription-plans.config';
import { SubscriptionsController } from './subscriptions.controller';
import { SubscriptionsService } from './subscriptions.service';
import { TenantContextService } from '../tenant-context/tenant-context.service';
import { TenantIsolationGuard } from '../tenant-context/tenant-isolation.guard';
import { TENANT_SCOPE_KEY } from '../tenant-context/tenant-scope.decorator';
import { Permission } from '../auth/enums/permission.enum';

describe('SubscriptionsController', () => {
  let controller: SubscriptionsController;
  const subscriptionsService = {
    getBillingOverview: jest.fn(),
    getUsageSummary: jest.fn(),
    getUsageMeteringFramework: jest.fn(),
    recordUsageEvent: jest.fn(),
    getSubscriptionPlans: jest.fn(),
  };

  const req = {
    user: { id: 'user-1' },
    tenantContext: {
      organizationId: 'org-1',
      workspaceId: 'workspace-1',
      userId: 'user-1',
      role: 'physician',
      subscriptionPlan: SubscriptionTier.PROFESSIONAL,
    },
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [SubscriptionsController],
      providers: [
        { provide: SubscriptionsService, useValue: subscriptionsService },
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn((key: string) => (key === 'stripe.secretKey' ? 'sk_test_123' : '')),
          },
        },
        Reflector,
        { provide: TenantContextService, useValue: { resolveForRequest: jest.fn() } },
      ],
    }).compile();

    controller = module.get(SubscriptionsController);
    jest.clearAllMocks();
  });

  it('returns tenant billing overview', async () => {
    subscriptionsService.getBillingOverview.mockResolvedValue({ organizationId: 'org-1' });

    await expect(controller.getBillingOverview(req)).resolves.toEqual({ organizationId: 'org-1' });
    expect(subscriptionsService.getBillingOverview).toHaveBeenCalledWith(
      'user-1',
      req.tenantContext,
    );
  });

  it('returns tenant usage summary for requested period', async () => {
    subscriptionsService.getUsageSummary.mockResolvedValue({ period: { key: 'week' } });

    await expect(controller.getUsageSummary(req, 'week')).resolves.toEqual({
      period: { key: 'week' },
    });
    expect(subscriptionsService.getUsageSummary).toHaveBeenCalledWith(req.tenantContext, 'week');
  });

  it('returns tenant usage metering framework for requested period', async () => {
    subscriptionsService.getUsageMeteringFramework.mockResolvedValue({
      period: { key: 'week' },
      storage: { billingSeparated: true },
    });

    await expect(controller.getUsageMeteringFramework(req, 'week')).resolves.toEqual({
      period: { key: 'week' },
      storage: { billingSeparated: true },
    });
    expect(subscriptionsService.getUsageMeteringFramework).toHaveBeenCalledWith(
      req.tenantContext,
      'week',
    );
  });

  it('records frontend-originated usage events', async () => {
    subscriptionsService.recordUsageEvent.mockResolvedValue({ id: 'usage-1' });

    await expect(
      controller.recordUsageEvent(req, {
        eventType: UsageEventType.TOOL_LAUNCH,
        assetId: 'qsofa',
      }),
    ).resolves.toEqual({ ok: true, id: 'usage-1' });
    expect(subscriptionsService.recordUsageEvent).toHaveBeenCalledWith(req.tenantContext, {
      eventType: UsageEventType.TOOL_LAUNCH,
      assetId: 'qsofa',
    });
  });

  describe('organization-admin route wiring', () => {
    // TenantIsolationGuard is the only guard that reads @OrganizationScoped/@TenantScoped
    // metadata, and it is registered globally in a way that no-ops before authentication
    // (see tenant-isolation.guard.ts). Routes carrying that decorator MUST also re-list
    // TenantIsolationGuard locally, or the admin/permission policy is silently never enforced.
    const adminScopedRoutes: Array<{
      method: keyof SubscriptionsController;
      permissions: Permission[];
    }> = [
      { method: 'upgrade', permissions: [Permission.MANAGE_SUBSCRIPTIONS] },
      { method: 'downgrade', permissions: [Permission.MANAGE_SUBSCRIPTIONS] },
      { method: 'convertTrial', permissions: [Permission.MANAGE_SUBSCRIPTIONS] },
      { method: 'getBillingOverview', permissions: [Permission.MANAGE_SUBSCRIPTIONS] },
      { method: 'getUsageSummary', permissions: [Permission.VIEW_ANALYTICS] },
      { method: 'getUsageMeteringFramework', permissions: [Permission.VIEW_ANALYTICS] },
    ];

    it.each(adminScopedRoutes)(
      '$method re-applies TenantIsolationGuard so its @OrganizationScoped policy is enforced',
      ({ method, permissions }) => {
        const handler = SubscriptionsController.prototype[method];
        const guards = Reflect.getMetadata(GUARDS_METADATA, handler) || [];
        expect(guards).toContain(TenantIsolationGuard);

        const policy = Reflect.getMetadata(TENANT_SCOPE_KEY, handler);
        expect(policy).toEqual(expect.objectContaining({ admin: 'organization', permissions }));
      },
    );
  });
});
