import { getRepositoryToken } from '@nestjs/typeorm';
import { Test, TestingModule } from '@nestjs/testing';
import { AuditLog } from '../audit/entities/audit-log.entity';
import { Product } from '../product-catalog/entities/product.entity';
import { UsageEvent } from '../subscriptions/entities/usage-event.entity';
import { UsageEventType } from '../subscriptions/subscription-plans.config';
import { CustomerSuccessService } from './customer-success.service';
import { AssetPack } from './entities/asset-pack.entity';
import { OrganizationEntitlement } from './entities/organization-entitlement.entity';
import { PlatformAsset } from './entities/platform-asset.entity';
import { EntitlementStatus, PlatformAssetType } from './enums/platform-asset.enums';

describe('CustomerSuccessService', () => {
  let service: CustomerSuccessService;
  const auditRepo = { find: jest.fn() };
  const entitlementRepo = { find: jest.fn() };
  const usageRepo = { find: jest.fn() };
  const assetRepo = { find: jest.fn() };
  const packRepo = { find: jest.fn() };
  const productRepo = { find: jest.fn() };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CustomerSuccessService,
        { provide: getRepositoryToken(AuditLog), useValue: auditRepo },
        { provide: getRepositoryToken(OrganizationEntitlement), useValue: entitlementRepo },
        { provide: getRepositoryToken(UsageEvent), useValue: usageRepo },
        { provide: getRepositoryToken(PlatformAsset), useValue: assetRepo },
        { provide: getRepositoryToken(AssetPack), useValue: packRepo },
        { provide: getRepositoryToken(Product), useValue: productRepo },
      ],
    }).compile();

    service = module.get(CustomerSuccessService);
    jest.clearAllMocks();
  });

  it('builds customer health, usage, completion, and underused product metrics', async () => {
    entitlementRepo.find.mockResolvedValue([
      { organizationId: 'org-1', packId: 'core-platform', status: EntitlementStatus.ENABLED },
      { organizationId: 'org-1', packId: 'emergency-pack', status: EntitlementStatus.ENABLED },
      { organizationId: 'org-1', packId: 'simulation-pack', status: EntitlementStatus.ENABLED },
    ]);
    usageRepo.find.mockResolvedValue([
      {
        organizationId: 'org-1',
        userId: 'user-1',
        workspaceId: 'emergency',
        assetId: 'qsofa',
        eventType: UsageEventType.CALCULATOR_LAUNCH,
        quantity: 8,
        metadata: {},
      },
      {
        organizationId: 'org-1',
        userId: 'user-2',
        workspaceId: 'emergency',
        assetId: 'agent-clinical',
        eventType: UsageEventType.AI_CALL,
        quantity: 5,
        metadata: { agentId: 'agent-clinical' },
      },
      {
        organizationId: 'org-1',
        userId: 'user-2',
        workspaceId: 'education',
        assetId: 'simulation-suite',
        eventType: UsageEventType.SIMULATION,
        quantity: 2,
        metadata: { status: 'completed' },
      },
      {
        organizationId: 'org-1',
        userId: 'user-3',
        workspaceId: 'operations',
        assetId: 'workflow-builder',
        eventType: UsageEventType.API_CALL,
        quantity: 3,
        metadata: { eventType: 'workflow_completed', workflowId: 'wf-1', status: 'completed' },
      },
    ]);
    auditRepo.find.mockResolvedValue([
      {
        organizationId: 'org-1',
        userId: 'user-4',
        resource: 'workflow discharge',
        action: 'complete',
        metadata: {},
      },
    ]);
    assetRepo.find.mockResolvedValue([
      {
        id: 'qsofa',
        title: 'qSOFA',
        assetType: PlatformAssetType.CALCULATOR,
        route: '/tools/calculators/qsofa',
      },
      {
        id: 'agent-clinical',
        title: 'Clinical AI',
        assetType: PlatformAssetType.AI_AGENT,
        route: '/assistant',
      },
      {
        id: 'simulation-suite',
        title: 'Simulation Suite',
        assetType: PlatformAssetType.SIMULATION,
        route: '/simulation',
      },
      {
        id: 'unused-tool',
        title: 'Unused Tool',
        assetType: PlatformAssetType.CLINICAL_TOOL,
        route: '/tools/unused',
      },
    ]);
    packRepo.find.mockResolvedValue([
      { id: 'core-platform', name: 'Core Platform', assetIds: ['agent-clinical'] },
      { id: 'emergency-pack', name: 'Emergency Pack', assetIds: ['qsofa'] },
      { id: 'simulation-pack', name: 'Simulation Pack', assetIds: ['simulation-suite'] },
      { id: 'unused-pack', name: 'Unused Pack', assetIds: ['unused-tool'] },
    ]);
    productRepo.find.mockResolvedValue([
      {
        id: 'product-emergency',
        slug: 'emergency',
        name: 'Emergency',
        packIds: ['emergency-pack'],
        expectedOutcomes: ['Reduce triage time'],
      },
      {
        id: 'product-simulation',
        slug: 'simulation',
        name: 'Simulation',
        packIds: ['simulation-pack'],
        expectedOutcomes: ['Improve training completion'],
      },
    ]);

    const result = await service.getCustomerSuccessDashboard('org-1', 'month');

    expect(result.health.status).toBe('healthy');
    expect(result.metrics.adoption).toMatchObject({
      enabledPackCount: 3,
      enabledAssetCount: 3,
      totalAssetCount: 4,
      value: 75,
    });
    expect(result.metrics.activeUsers.value).toBe(4);
    expect(result.metrics.assetUsage.value).toBe(18);
    expect(result.metrics.aiUsage.value).toBe(5);
    expect(result.metrics.simulationsCompleted.value).toBe(2);
    expect(result.metrics.workflowsCompleted.value).toBe(4);
    expect(result.metrics.underusedProducts).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ id: 'product-simulation', usageCount: 2 }),
        expect.objectContaining({ id: 'product-emergency', usageCount: 8 }),
      ]),
    );
    expect(result.signals.map((signal: any) => signal.id)).toEqual(
      expect.arrayContaining(['adoption', 'engagement', 'ai-usage', 'enablement']),
    );
  });
});
