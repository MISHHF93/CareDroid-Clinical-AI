import { BadRequestException } from '@nestjs/common';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Test, TestingModule } from '@nestjs/testing';
import { AssetRegistryService } from './asset-registry.service';
import {
  AssetRegistryRiskLevel,
  AssetRegistryType,
  normalizeAssetLifecycle,
  normalizeRegistryType,
  validateAssetRegistryMetadata,
} from './asset-registry.schema';
import { SEED_PLATFORM_ASSETS } from './data/platform-asset-seed.data';
import { DEPARTMENT_IDS } from './department-taxonomy';
import { PlatformAsset } from './entities/platform-asset.entity';
import { PlatformAssetLifecycle, PlatformAssetType, PricingTier } from './enums/platform-asset.enums';

describe('AssetRegistryService', () => {
  let service: AssetRegistryService;

  const assetRepo = {
    find: jest.fn(),
    findOne: jest.fn(),
    save: jest.fn(),
  };

  const qsofaAsset = {
    id: 'qsofa',
    assetType: PlatformAssetType.CALCULATOR,
    title: 'qSOFA',
    description: 'Quick SOFA calculator.',
    category: 'Calculator',
    route: '/tools/calculators/qsofa',
    organizationTypes: ['hospital'],
    workspaceTags: ['clinical'],
    intendedRoles: ['emergency physician'],
    primaryDepartment: 'emergency',
    secondaryDepartments: ['icu'],
    recommendedRoles: ['emergency physician'],
    requiredPermissions: ['use-calculators'],
    riskLevel: AssetRegistryRiskLevel.CLINICAL_DECISION_SUPPORT,
    demoStatus: 'demo',
    lifecycle: PlatformAssetLifecycle.ACTIVE,
    pricingTier: PricingTier.CORE,
    packIds: ['core-platform'],
  };

  const agentAsset = {
    ...qsofaAsset,
    id: 'agent-clinical',
    assetType: PlatformAssetType.AI_AGENT,
    title: 'Clinical AI',
    category: 'AI Agent',
    route: '/assistant',
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AssetRegistryService,
        { provide: getRepositoryToken(PlatformAsset), useValue: assetRepo },
      ],
    }).compile();

    service = module.get(AssetRegistryService);
    jest.clearAllMocks();
  });

  it('projects legacy stored fields into canonical registry metadata', async () => {
    assetRepo.findOne.mockResolvedValue(agentAsset);

    const result = await service.getAssetById('agent-clinical');

    expect(result).toMatchObject({
      id: 'agent-clinical',
      assetId: 'agent-clinical',
      assetType: 'ai_agent',
      type: AssetRegistryType.AI_AGENT,
      lifecycleStatus: PlatformAssetLifecycle.ACTIVE,
      subscriptionTier: PricingTier.CORE,
      demoLiveStatus: 'demo',
    });
  });

  it('filters by canonical type, lifecycle, pack, and query', async () => {
    assetRepo.find.mockResolvedValue([qsofaAsset, agentAsset]);

    const results = await service.listAssets({
      type: 'AI agent',
      lifecycleStatus: 'active',
      packId: 'core-platform',
      query: 'clinical',
    });

    expect(results).toEqual([expect.objectContaining({ id: 'agent-clinical' })]);
  });

  it('normalizes legacy asset type aliases', () => {
    expect(normalizeRegistryType('ai_agent')).toBe(AssetRegistryType.AI_AGENT);
    expect(normalizeRegistryType('iot')).toBe(AssetRegistryType.IOT_MODULE);
    expect(normalizeRegistryType('fleet')).toBe(AssetRegistryType.FLEET_MODULE);
  });

  it('rejects incomplete registry metadata', () => {
    const issues = validateAssetRegistryMetadata({
      assetId: 'bad asset',
      title: '',
      type: AssetRegistryType.CALCULATOR,
    });

    expect(issues.map((issue) => issue.field)).toEqual(
      expect.arrayContaining([
        'assetId',
        'title',
        'route',
        'organizationTypes',
        'primaryDepartment',
        'recommendedRoles',
        'requiredPermissions',
      ]),
    );
  });

  it('rejects invalid lifecycle updates', async () => {
    await expect(service.updateAssetLifecycle('qsofa', 'sunset')).rejects.toBeInstanceOf(
      BadRequestException,
    );
  });

  it('normalizes lifecycle aliases into canonical asset lifecycle states', () => {
    expect(normalizeAssetLifecycle('preview')).toBe(PlatformAssetLifecycle.BETA);
    expect(normalizeAssetLifecycle('retired')).toBe(PlatformAssetLifecycle.ARCHIVED);
    expect(normalizeAssetLifecycle('admin_only')).toBeNull();
  });

  it('keeps migrated seed assets complete and unique', () => {
    const ids = SEED_PLATFORM_ASSETS.map((asset) => asset.id);
    expect(new Set(ids).size).toBe(ids.length);
    expect(SEED_PLATFORM_ASSETS.length).toBeGreaterThan(100);
    expect(SEED_PLATFORM_ASSETS).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ id: 'fhir-connector', assetType: PlatformAssetType.INTEGRATION }),
        expect.objectContaining({ id: 'protocol-sepsis', assetType: PlatformAssetType.PROTOCOL }),
        expect.objectContaining({ id: 'sepsis-deterioration', assetType: PlatformAssetType.SIMULATION }),
        expect.objectContaining({ id: 'news2-clinician-notification', assetType: PlatformAssetType.WORKFLOW }),
        expect.objectContaining({ id: 'agent-clinical', assetType: PlatformAssetType.AI_AGENT }),
        expect.objectContaining({ id: 'fleet-map', assetType: PlatformAssetType.MAP }),
        expect.objectContaining({ id: 'devices', assetType: PlatformAssetType.IOT }),
        expect.objectContaining({ id: 'model-usage-dashboard', assetType: PlatformAssetType.DASHBOARD }),
        expect.objectContaining({ id: 'privacy-center', assetType: PlatformAssetType.REPORT }),
        expect.objectContaining({ id: 'discharge-summary-template', assetType: PlatformAssetType.TEMPLATE }),
      ]),
    );

    for (const asset of SEED_PLATFORM_ASSETS) {
      const projection = {
        assetId: asset.id,
        title: asset.title,
        type: normalizeRegistryType(asset.assetType),
        category: asset.category,
        route: asset.route,
        organizationTypes: asset.organizationTypes,
        workspaceTags: asset.workspaceTags,
        intendedRoles: asset.intendedRoles,
        primaryDepartment: asset.primaryDepartment,
        secondaryDepartments: asset.secondaryDepartments,
        recommendedRoles: asset.recommendedRoles,
        requiredPermissions: asset.requiredPermissions,
        lifecycleStatus: asset.lifecycle,
        subscriptionTier: asset.pricingTier,
        riskLevel: asset.riskLevel,
        demoStatus: asset.demoStatus,
      };
      expect(validateAssetRegistryMetadata(projection)).toEqual([]);
      expect(DEPARTMENT_IDS).toContain(asset.primaryDepartment);
      expect(asset.recommendedRoles.length).toBeGreaterThan(0);
      expect(asset.requiredPermissions.length).toBeGreaterThan(0);
    }

    const managedTypes = new Set([
      PlatformAssetType.TOOL,
      PlatformAssetType.CLINICAL_TOOL,
      PlatformAssetType.CALCULATOR,
      PlatformAssetType.SIMULATION,
      PlatformAssetType.WORKFLOW,
      PlatformAssetType.AI_AGENT,
      PlatformAssetType.INTEGRATION,
    ]);
    for (const assetType of managedTypes) {
      expect(SEED_PLATFORM_ASSETS.some((asset) => asset.assetType === assetType)).toBe(true);
    }

    const seededLifecycleStates = new Set(SEED_PLATFORM_ASSETS.map((asset) => asset.lifecycle));
    expect(seededLifecycleStates).toEqual(
      new Set([
        PlatformAssetLifecycle.DRAFT,
        PlatformAssetLifecycle.BETA,
        PlatformAssetLifecycle.ACTIVE,
        PlatformAssetLifecycle.DEPRECATED,
        PlatformAssetLifecycle.ARCHIVED,
      ]),
    );
  });
});
