import { getRepositoryToken } from '@nestjs/typeorm';
import { Test, TestingModule } from '@nestjs/testing';
import { AuditLog } from '../audit/entities/audit-log.entity';
import { UsageEvent } from '../subscriptions/entities/usage-event.entity';
import { UsageEventType } from '../subscriptions/subscription-plans.config';
import { AssetPack } from './entities/asset-pack.entity';
import { OrganizationEntitlement } from './entities/organization-entitlement.entity';
import { PlatformAsset } from './entities/platform-asset.entity';
import { EntitlementStatus, PlatformAssetType } from './enums/platform-asset.enums';
import { OrganizationAnalyticsService } from './organization-analytics.service';

describe('OrganizationAnalyticsService', () => {
  let service: OrganizationAnalyticsService;
  const auditRepo = { find: jest.fn() };
  const entitlementRepo = { find: jest.fn() };
  const usageRepo = { find: jest.fn() };
  const assetRepo = { find: jest.fn() };
  const packRepo = { find: jest.fn() };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        OrganizationAnalyticsService,
        { provide: getRepositoryToken(AuditLog), useValue: auditRepo },
        { provide: getRepositoryToken(OrganizationEntitlement), useValue: entitlementRepo },
        { provide: getRepositoryToken(UsageEvent), useValue: usageRepo },
        { provide: getRepositoryToken(PlatformAsset), useValue: assetRepo },
        { provide: getRepositoryToken(AssetPack), useValue: packRepo },
      ],
    }).compile();

    service = module.get(OrganizationAnalyticsService);
    jest.clearAllMocks();
  });

  it('builds adoption, engagement, underused, and top asset dashboards', async () => {
    entitlementRepo.find.mockResolvedValue([
      {
        organizationId: 'org-1',
        packId: 'core-platform',
        status: EntitlementStatus.ENABLED,
        createdAt: new Date('2026-06-01T00:00:00.000Z'),
      },
    ]);
    auditRepo.find.mockResolvedValue([
      { organizationId: 'org-1', resource: '/assistant/chat', timestamp: new Date() },
    ]);
    usageRepo.find.mockResolvedValue([
      {
        organizationId: 'org-1',
        workspaceId: 'emergency',
        userId: 'user-1',
        userRole: 'clinician',
        assetId: 'qsofa',
        eventType: UsageEventType.CALCULATOR_LAUNCH,
        quantity: 5,
        metadata: { eventType: 'asset_launched', sessionId: 'session-qsofa' },
      },
      {
        organizationId: 'org-1',
        workspaceId: 'emergency',
        userId: 'user-1',
        userRole: 'clinician',
        assetId: 'qsofa',
        eventType: UsageEventType.CALCULATOR_LAUNCH,
        quantity: 0,
        metadata: {
          eventType: 'asset_duration',
          durationSeconds: 240,
          sessionId: 'session-qsofa',
        },
      },
      {
        organizationId: 'org-1',
        workspaceId: 'emergency',
        userId: 'user-1',
        userRole: 'clinician',
        assetId: 'qsofa',
        eventType: UsageEventType.TOOL_LAUNCH,
        quantity: 0,
        metadata: {
          eventType: 'recommendation_accepted',
          recommendationId: 'rec-qsofa',
          sessionId: 'session-qsofa',
        },
      },
      {
        organizationId: 'org-1',
        workspaceId: 'emergency',
        userRole: 'clinician',
        assetId: 'agent-clinical',
        eventType: UsageEventType.AI_CALL,
        quantity: 3,
        metadata: { agentId: 'agent-clinical' },
      },
      {
        organizationId: 'org-1',
        workspaceId: 'emergency',
        userRole: 'clinician',
        assetId: 'news2',
        eventType: UsageEventType.CALCULATOR_LAUNCH,
        quantity: 3,
        metadata: { eventType: 'asset_launched', sessionId: 'session-news2' },
      },
      {
        organizationId: 'org-1',
        workspaceId: 'emergency',
        userRole: 'clinician',
        assetId: 'news2',
        eventType: UsageEventType.CALCULATOR_LAUNCH,
        quantity: 0,
        metadata: {
          eventType: 'asset_abandoned',
          durationSeconds: 6,
          sessionId: 'session-news2',
        },
      },
      {
        organizationId: 'org-1',
        workspaceId: 'operations',
        userRole: 'administrator',
        assetId: 'dashboard',
        eventType: UsageEventType.TOOL_LAUNCH,
        quantity: 2,
        metadata: { surface: 'dashboard' },
      },
      {
        organizationId: 'org-1',
        workspaceId: 'education',
        userRole: 'educator',
        assetId: 'simulation-suite',
        eventType: UsageEventType.SIMULATION,
        quantity: 1,
        metadata: { status: 'completed' },
      },
      {
        organizationId: 'org-1',
        workspaceId: 'operations',
        userRole: 'administrator',
        assetId: 'workflow-builder',
        eventType: UsageEventType.TOOL_LAUNCH,
        quantity: 1,
        metadata: { eventType: 'asset_launched', workflowId: 'workflow-builder' },
      },
      {
        organizationId: 'org-1',
        workspaceId: 'operations',
        userRole: 'administrator',
        assetId: 'workflow-builder',
        eventType: UsageEventType.TOOL_LAUNCH,
        quantity: 0,
        metadata: { eventType: 'workflow_completed', workflowId: 'workflow-builder' },
      },
      {
        organizationId: 'org-1',
        workspaceId: 'emergency',
        userRole: 'clinician',
        assetId: 'search',
        eventType: UsageEventType.API_CALL,
        quantity: 4,
        metadata: { eventType: 'search_query', surface: 'search' },
      },
    ]);
    assetRepo.find.mockResolvedValue([
      {
        id: 'qsofa',
        title: 'qSOFA',
        assetType: PlatformAssetType.CALCULATOR,
        category: 'Calculator',
        route: '/tools/calculators/qsofa',
      },
      {
        id: 'news2',
        title: 'NEWS2',
        assetType: PlatformAssetType.CALCULATOR,
        category: 'Calculator',
        route: '/tools/calculators/news2',
      },
      {
        id: 'agent-clinical',
        title: 'Clinical AI',
        assetType: PlatformAssetType.AI_AGENT,
        category: 'AI Agent',
        route: '/assistant',
      },
      {
        id: 'dashboard',
        title: 'Command Center',
        assetType: PlatformAssetType.DASHBOARD,
        category: 'Dashboard',
        route: '/dashboard',
      },
      {
        id: 'simulation-suite',
        title: 'Simulation Suite',
        assetType: PlatformAssetType.SIMULATION,
        category: 'Education',
        route: '/simulation',
      },
      {
        id: 'workflow-builder',
        title: 'Workflow Builder',
        assetType: PlatformAssetType.WORKFLOW,
        category: 'Workflow',
        route: '/workflows',
      },
      {
        id: 'unused-tool',
        title: 'Unused Tool',
        assetType: PlatformAssetType.CLINICAL_TOOL,
        category: 'Clinical',
        route: '/tools/unused',
      },
    ]);
    packRepo.find.mockResolvedValue([
      {
        id: 'core-platform',
        name: 'Core Platform',
        assetIds: [
          'qsofa',
          'news2',
          'agent-clinical',
          'dashboard',
          'simulation-suite',
          'workflow-builder',
          'unused-tool',
        ],
      },
    ]);

    const result = await service.getOrganizationSummary('org-1');

    expect(result.dashboards.adoption).toMatchObject({
      enabledPackCount: 1,
      enabledAssetCount: 7,
      totalAssetCount: 7,
      adoptionScore: 100,
    });
    expect(result.dashboards.engagement).toMatchObject({
      totalUsageEvents: 19,
      aiUsageCount: 3,
      searchQueryCount: 4,
      simulationCompletionCount: 1,
      dashboardEngagementCount: 2,
      launchCount: 12,
      usageDurationSeconds: 240,
      averageDurationSeconds: 240,
      repeatUsageCount: 3,
      abandonmentCount: 1,
      recommendationsAcceptedCount: 1,
      workflowCompletionCount: 1,
    });
    expect(result.dimensions.assetUsage).toEqual(
      expect.arrayContaining([expect.objectContaining({ id: 'qsofa', count: 5 })]),
    );
    expect(result.dimensions.packUsage).toEqual([
      expect.objectContaining({ id: 'core-platform', count: 15 }),
    ]);
    expect(result.dimensions.roleUsage).toEqual(
      expect.arrayContaining([expect.objectContaining({ id: 'clinician', count: 15 })]),
    );
    expect(result.dashboards.topAssets[0]).toMatchObject({ id: 'qsofa', label: 'qSOFA' });
    expect(result.dimensions.assetIntelligence).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          id: 'qsofa',
          launches: 5,
          recommendationsAccepted: 1,
          averageDurationSeconds: 240,
        }),
      ]),
    );
    expect(result.dashboards.underusedAssets).toEqual(
      expect.arrayContaining([expect.objectContaining({ id: 'news2', abandonmentCount: 1 })]),
    );
    expect(result.dashboards.unusedAssets).toEqual(
      expect.arrayContaining([expect.objectContaining({ id: 'unused-tool', count: 0 })]),
    );
    expect(result.dashboards.mergeCandidates).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          id: 'news2',
          metadata: expect.objectContaining({ mergeTargetId: 'qsofa' }),
        }),
      ]),
    );
  });
});
