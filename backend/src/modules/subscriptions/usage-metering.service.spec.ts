import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { UsageEvent } from './entities/usage-event.entity';
import { SubscriptionTier } from './entities/subscription.entity';
import { UsageEventType } from './subscription-plans.config';
import { UsageMeteringService } from './usage-metering.service';

describe('UsageMeteringService', () => {
  let service: UsageMeteringService;
  const usageEventRepository = {
    create: jest.fn((entity) => entity),
    save: jest.fn((entity) => Promise.resolve({ id: 'usage-1', ...entity })),
    find: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UsageMeteringService,
        {
          provide: getRepositoryToken(UsageEvent),
          useValue: usageEventRepository,
        },
      ],
    }).compile();

    service = module.get(UsageMeteringService);
    jest.clearAllMocks();
  });

  it('records usage with tenant dimensions and monthly period boundaries', async () => {
    await service.recordUsage({
      organizationId: '11111111-1111-1111-1111-111111111111',
      workspaceId: '22222222-2222-2222-2222-222222222222',
      userId: '33333333-3333-3333-3333-333333333333',
      userRole: 'physician',
      subscriptionPlan: SubscriptionTier.PROFESSIONAL,
      assetId: 'qsofa',
      eventType: UsageEventType.CALCULATOR_LAUNCH,
      occurredAt: new Date('2026-06-05T12:00:00.000Z'),
    });

    expect(usageEventRepository.save).toHaveBeenCalledWith(
      expect.objectContaining({
        organizationId: '11111111-1111-1111-1111-111111111111',
        workspaceId: '22222222-2222-2222-2222-222222222222',
        userId: '33333333-3333-3333-3333-333333333333',
        userRole: 'physician',
        assetId: 'qsofa',
        eventType: UsageEventType.CALCULATOR_LAUNCH,
        quantity: 1,
        unit: 'launch',
        metadata: expect.objectContaining({ subscriptionPlan: SubscriptionTier.PROFESSIONAL }),
      }),
    );
  });

  it('aggregates usage by event type, workspace, asset, role, and active users', async () => {
    usageEventRepository.find.mockResolvedValue([
      {
        id: '1',
        organizationId: 'org-1',
        workspaceId: 'workspace-a',
        userId: 'user-1',
        userRole: 'physician',
        assetId: 'qsofa',
        eventType: UsageEventType.CALCULATOR_LAUNCH,
        quantity: 2,
        unit: 'launch',
        occurredAt: new Date(),
      },
      {
        id: '2',
        organizationId: 'org-1',
        workspaceId: 'workspace-a',
        userId: 'user-2',
        userRole: 'nurse',
        assetId: 'agent-clinical',
        eventType: UsageEventType.AI_CALL,
        quantity: 1,
        unit: 'call',
        occurredAt: new Date(),
      },
      {
        id: '3',
        organizationId: 'org-1',
        workspaceId: 'workspace-b',
        userId: 'user-1',
        userRole: 'physician',
        assetId: 'hospital-map',
        eventType: UsageEventType.MAP_USAGE,
        quantity: 3,
        unit: 'view',
        occurredAt: new Date(),
      },
    ]);

    const summary = await service.getUsageSummary({
      organizationId: 'org-1',
      subscriptionPlan: SubscriptionTier.STARTER,
      period: 'month',
    });

    expect(summary.activeUsers).toBe(2);
    expect(summary.totals).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ eventType: UsageEventType.AI_CALL, used: 1 }),
        expect.objectContaining({ eventType: UsageEventType.CALCULATOR_LAUNCH, used: 2 }),
        expect.objectContaining({ eventType: UsageEventType.MAP_USAGE, used: 3 }),
        expect.objectContaining({ eventType: UsageEventType.ACTIVE_USER, used: 2 }),
      ]),
    );
    expect(summary.breakdowns.byWorkspace).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ key: 'workspace-a', quantity: 3 }),
        expect.objectContaining({ key: 'workspace-b', quantity: 3 }),
      ]),
    );
    expect(summary.breakdowns.byAsset).toEqual(
      expect.arrayContaining([expect.objectContaining({ key: 'qsofa', quantity: 2 })]),
    );
    expect(summary.breakdowns.byRole).toEqual(
      expect.arrayContaining([expect.objectContaining({ key: 'physician', quantity: 5 })]),
    );
  });
});
