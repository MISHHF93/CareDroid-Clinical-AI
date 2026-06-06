import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { SubscriptionTier } from './entities/subscription.entity';
import { UsageEventType } from './subscription-plans.config';
import { SubscriptionsController } from './subscriptions.controller';
import { SubscriptionsService } from './subscriptions.service';

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
      ],
    }).compile();

    controller = module.get(SubscriptionsController);
    jest.clearAllMocks();
  });

  it('returns tenant billing overview', async () => {
    subscriptionsService.getBillingOverview.mockResolvedValue({ organizationId: 'org-1' });

    await expect(controller.getBillingOverview(req)).resolves.toEqual({ organizationId: 'org-1' });
    expect(subscriptionsService.getBillingOverview).toHaveBeenCalledWith('user-1', req.tenantContext);
  });

  it('returns tenant usage summary for requested period', async () => {
    subscriptionsService.getUsageSummary.mockResolvedValue({ period: { key: 'week' } });

    await expect(controller.getUsageSummary(req, 'week')).resolves.toEqual({ period: { key: 'week' } });
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
});
