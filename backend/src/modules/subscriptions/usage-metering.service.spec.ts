import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { UsageEvent } from './entities/usage-event.entity';
import { SubscriptionTier } from './entities/subscription.entity';
import { UsageEventType } from './subscription-plans.config';
import { UsageMeteringService } from './usage-metering.service';

describe('UsageMeteringService', () => {
  let service: UsageMeteringService;
  const insertQueryBuilder = {
    insert: jest.fn().mockReturnThis(),
    into: jest.fn().mockReturnThis(),
    values: jest.fn().mockReturnThis(),
    orIgnore: jest.fn().mockReturnThis(),
    execute: jest.fn().mockResolvedValue(undefined),
  };
  const usageEventRepository = {
    create: jest.fn((entity) => entity),
    save: jest.fn((entity) => Promise.resolve({ id: 'usage-1', ...entity })),
    find: jest.fn(),
    findOne: jest.fn(),
    createQueryBuilder: jest.fn(() => insertQueryBuilder),
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
    usageEventRepository.findOne.mockResolvedValue(null);
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

  it('deduplicates usage events when an idempotency key is provided', async () => {
    usageEventRepository.findOne.mockResolvedValue({
      id: 'usage-existing',
      organizationId: 'org-1',
      idempotencyKey: 'sim-run-1',
    });

    const result = await service.recordUsage({
      organizationId: 'org-1',
      eventType: UsageEventType.SIMULATION,
      idempotencyKey: 'sim-run-1',
      source: 'simulation-suite',
      metadata: { scenarioId: 'sepsis-1' },
    });

    expect(result).toEqual(expect.objectContaining({ id: 'usage-existing' }));
    expect(usageEventRepository.save).not.toHaveBeenCalled();
  });

  it('HEAL-329: recordFromTenantContext prefers the resolved tenantContext.workspaceId over a caller-supplied override', async () => {
    // subscriptions.service.ts's recordUsageEvent() forwards a raw client
    // request-body field into `details.workspaceId` unchecked -- before this
    // fix, that let a caller attribute a usage/billing metering event to a
    // workspace in a different organization than TenantIsolationGuard
    // actually verified them against.
    await service.recordFromTenantContext(
      {
        organizationId: 'real-org',
        workspaceId: 'real-workspace',
        userId: 'real-user',
        role: 'physician',
      } as any,
      UsageEventType.CALCULATOR_LAUNCH,
      {
        workspaceId: 'attacker-claimed-workspace',
        userId: 'attacker-claimed-user',
        userRole: 'admin',
        assetId: 'qsofa',
      },
    );

    expect(usageEventRepository.save).toHaveBeenCalledWith(
      expect.objectContaining({
        organizationId: 'real-org',
        workspaceId: 'real-workspace',
        userId: 'real-user',
        userRole: 'physician',
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

  it('projects a billing-neutral usage metering framework for future billing models', async () => {
    usageEventRepository.find.mockResolvedValue([
      {
        id: '1',
        organizationId: 'org-1',
        workspaceId: 'workspace-a',
        userId: 'user-1',
        userRole: 'physician',
        assetId: 'agent-clinical',
        eventType: UsageEventType.AI_CALL,
        quantity: 4,
        unit: 'call',
        occurredAt: new Date(),
        metadata: { model: 'gpt' },
      },
      {
        id: '2',
        organizationId: 'org-1',
        workspaceId: 'workspace-a',
        userId: 'user-2',
        userRole: 'nurse',
        assetId: 'simulation-suite',
        eventType: UsageEventType.SIMULATION,
        quantity: 2,
        unit: 'run',
        occurredAt: new Date(),
        metadata: { status: 'completed' },
      },
      {
        id: '3',
        organizationId: 'org-1',
        workspaceId: 'workspace-b',
        userId: 'user-1',
        userRole: 'physician',
        assetId: 'workflow-builder',
        eventType: UsageEventType.API_CALL,
        quantity: 3,
        unit: 'request',
        occurredAt: new Date(),
        metadata: { eventType: 'workflow_completed', workflowId: 'wf-1' },
      },
      {
        id: '4',
        organizationId: 'org-1',
        workspaceId: 'workspace-c',
        userId: 'user-3',
        userRole: 'operator',
        assetId: 'fhir-connector',
        eventType: UsageEventType.INTEGRATION,
        quantity: 5,
        unit: 'event',
        occurredAt: new Date(),
        metadata: { integrationSlug: 'fhir' },
      },
      {
        id: '5',
        organizationId: 'org-1',
        workspaceId: 'workspace-c',
        userId: 'user-4',
        userRole: 'operator',
        assetId: null,
        eventType: UsageEventType.ACTIVE_USER,
        quantity: 10,
        unit: 'user',
        occurredAt: new Date(),
        metadata: {},
      },
    ]);

    const framework = await service.getUsageMeteringFramework({
      organizationId: 'org-1',
      period: 'month',
    });

    expect(framework.storage).toMatchObject({
      source: 'usage_events',
      billingSeparated: true,
    });
    expect(framework.meters).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ id: 'user-seats', value: 10, billingSeparated: true }),
        expect.objectContaining({ id: 'ai-requests', value: 4 }),
        expect.objectContaining({ id: 'simulation-runs', value: 2 }),
        expect.objectContaining({ id: 'workflow-executions', value: 3 }),
        expect.objectContaining({ id: 'api-usage', value: 3 }),
        expect.objectContaining({ id: 'storage-usage', value: 0 }),
        expect.objectContaining({ id: 'integrations', value: 5 }),
      ]),
    );
    expect(framework.billingReadiness.futureBillingCandidates).toEqual(
      expect.arrayContaining([
        'user-seats',
        'ai-requests',
        'simulation-runs',
        'workflow-executions',
        'storage-usage',
        'integrations',
      ]),
    );
    expect(framework.billingAttachmentContract).toMatchObject({
      paymentProcessing: false,
      pricingKeyField: 'meterId',
      idempotencyField: 'idempotencyKey',
      requiredMeters: expect.arrayContaining([
        'user-seats',
        'ai-requests',
        'simulation-runs',
        'workflow-executions',
        'api-usage',
        'storage-usage',
      ]),
    });
    expect(framework.breakdowns.byIntegration).toEqual([
      expect.objectContaining({ key: 'fhir', quantity: 5 }),
    ]);
  });
});
