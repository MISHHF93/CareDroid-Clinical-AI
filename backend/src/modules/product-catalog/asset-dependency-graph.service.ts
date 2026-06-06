import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AssetPack } from '../platform-assets/entities/asset-pack.entity';
import { PlatformAsset } from '../platform-assets/entities/platform-asset.entity';
import { PlatformAssetType } from '../platform-assets/enums/platform-asset.enums';
import { EntitlementService } from '../platform-assets/entitlement.service';
import { PlatformAssetsService } from '../platform-assets/platform-assets.service';
import { Organization } from '../workspaces/entities/organization.entity';
import { IntegrationOffering } from './entities/integration-offering.entity';
import { Product } from './entities/product.entity';

export const ASSET_DEPENDENCY_ISSUE_TYPES = {
  MISSING_DEPENDENCY: 'missing-dependency',
  DUPLICATE_DEPENDENCY: 'duplicate-dependency',
  ORPHAN_ASSET: 'orphan-asset',
} as const;

type AssetDependencyIssueType =
  (typeof ASSET_DEPENDENCY_ISSUE_TYPES)[keyof typeof ASSET_DEPENDENCY_ISSUE_TYPES];

type DependencyIssue = {
  id: string;
  type: AssetDependencyIssueType;
  severity: 'high' | 'medium' | 'low';
  title: string;
  detail: string;
  relatedIds?: string[];
};

function compact<T>(items: (T | null | undefined)[]): T[] {
  return items.filter(Boolean) as T[];
}

function unique<T>(items: T[]): T[] {
  return [...new Set(items)];
}

function duplicateValues(values: string[] = []): string[] {
  const seen = new Set<string>();
  const duplicates = new Set<string>();
  values.forEach((value) => {
    if (seen.has(value)) duplicates.add(value);
    seen.add(value);
  });
  return [...duplicates];
}

@Injectable()
export class AssetDependencyGraphService {
  constructor(
    @InjectRepository(Product)
    private readonly productRepository: Repository<Product>,
    @InjectRepository(AssetPack)
    private readonly packRepository: Repository<AssetPack>,
    @InjectRepository(PlatformAsset)
    private readonly assetRepository: Repository<PlatformAsset>,
    @InjectRepository(IntegrationOffering)
    private readonly integrationRepository: Repository<IntegrationOffering>,
    @InjectRepository(Organization)
    private readonly organizationRepository: Repository<Organization>,
    private readonly platformAssetsService: PlatformAssetsService,
    private readonly entitlementService: EntitlementService,
  ) {}

  async getGraph(
    organizationId?: string,
    options: { userRole?: string; subscriptionPlan?: string } = {},
  ) {
    const [products, packs, assets, integrations] = await Promise.all([
      this.productRepository.find({ order: { sortOrder: 'ASC' } }),
      this.packRepository.find({ order: { name: 'ASC' } }),
      this.assetRepository.find({ order: { title: 'ASC' } }),
      this.integrationRepository.find({ order: { sortOrder: 'ASC' } }),
    ]);

    if (!organizationId) {
      return this.buildGraph(products, packs, assets, integrations);
    }

    const scoped = await this.filterForEntitledAssets(
      products,
      packs,
      assets,
      organizationId,
      options,
    );
    return this.buildGraph(scoped.products, scoped.packs, scoped.assets, integrations);
  }

  buildGraph(
    products: Product[],
    packs: AssetPack[],
    assets: PlatformAsset[],
    integrations: IntegrationOffering[],
  ) {
    const packMap = new Map(packs.map((pack) => [pack.id, pack]));
    const assetMap = new Map(assets.map((asset) => [asset.id, asset]));
    const integrationsByAsset = this.groupIntegrationsByAsset(integrations);
    const linkedAssetIds = new Set<string>();
    const issues: DependencyIssue[] = [];

    const chains = products.flatMap((product) => {
      const productPackIds = product.packIds || [];
      const productHighlightAssetIds = product.highlightAssetIds || [];
      this.addMissingProductReferences(
        product,
        productPackIds,
        productHighlightAssetIds,
        packMap,
        assetMap,
        issues,
      );
      this.addDuplicateIssues('product', product.id, 'pack', productPackIds, issues);
      this.addDuplicateIssues(
        'product',
        product.id,
        'highlight asset',
        productHighlightAssetIds,
        issues,
      );

      const packChains = productPackIds.flatMap((packId) => {
        const pack = packMap.get(packId);
        if (!pack) return [];
        this.addMissingPackReferences(pack, assetMap, issues);
        this.addDuplicateIssues('asset pack', pack.id, 'asset', pack.assetIds || [], issues);
        this.addDuplicateIssues(
          'asset pack',
          pack.id,
          'required dependency',
          pack.requiredDependencies || [],
          issues,
        );

        return (pack.assetIds || []).flatMap((assetId) => {
          const asset = assetMap.get(assetId);
          if (!asset) return [];
          linkedAssetIds.add(asset.id);
          this.addMissingAssetReferences(asset, assetMap, issues);
          this.addDuplicateIssues(
            'asset',
            asset.id,
            'dependency',
            asset.dependencies || [],
            issues,
          );
          return [
            this.serializeChain(product, pack, asset, integrationsByAsset.get(asset.id) || []),
          ];
        });
      });

      const highlightChains = productHighlightAssetIds.flatMap((assetId) => {
        const asset = assetMap.get(assetId);
        if (!asset) return [];
        if (productPackIds.some((packId) => packMap.get(packId)?.assetIds?.includes(assetId)))
          return [];
        linkedAssetIds.add(asset.id);
        this.addMissingAssetReferences(asset, assetMap, issues);
        return [this.serializeChain(product, null, asset, integrationsByAsset.get(asset.id) || [])];
      });

      return [...packChains, ...highlightChains];
    });

    assets.forEach((asset) => {
      if (!linkedAssetIds.has(asset.id)) {
        issues.push({
          id: `orphan-asset-${asset.id}`,
          type: ASSET_DEPENDENCY_ISSUE_TYPES.ORPHAN_ASSET,
          severity: 'medium',
          title: 'Orphan asset',
          detail: `${asset.title || asset.id} is not linked by any product or asset pack.`,
          relatedIds: [asset.id],
        });
      }
    });

    const backendServices = unique(chains.flatMap((chain) => chain.backendServices));
    const routeCount = new Set(chains.map((chain) => chain.route).filter(Boolean)).size;
    const linkedIntegrationIds = new Set(
      chains.flatMap((chain) => chain.integrations.map((integration) => integration.id)),
    );

    return {
      chains,
      issues,
      issueCounts: Object.values(ASSET_DEPENDENCY_ISSUE_TYPES).reduce(
        (acc, type) => ({ ...acc, [type]: issues.filter((issue) => issue.type === type).length }),
        {} as Record<string, number>,
      ),
      summary: {
        products: products.length,
        assetPacks: packs.length,
        assets: assets.length,
        chains: chains.length,
        routes: routeCount,
        backendServices: backendServices.length,
        integrations: linkedIntegrationIds.size,
        issues: issues.length,
      },
      generatedAt: new Date().toISOString(),
    };
  }

  private serializeChain(
    product: Product,
    pack: AssetPack | null,
    asset: PlatformAsset,
    integrations: IntegrationOffering[],
  ) {
    return {
      id: `${product.id}:${pack?.id || 'direct'}:${asset.id}`,
      product: {
        id: product.id,
        slug: product.slug,
        name: product.name,
      },
      assetPack: pack
        ? {
            id: pack.id,
            slug: pack.slug,
            name: pack.name,
            requiredDependencies: pack.requiredDependencies || [],
          }
        : null,
      asset: {
        id: asset.id,
        title: asset.title,
        assetType: asset.assetType,
        dependencies: asset.dependencies || [],
      },
      route: asset.route || null,
      backendServices: this.resolveBackendServices(asset),
      integrations: integrations.map((integration) => ({
        id: integration.id,
        slug: integration.slug,
        name: integration.name,
        category: integration.category,
        status: integration.status,
      })),
    };
  }

  private groupIntegrationsByAsset(integrations: IntegrationOffering[]) {
    const byAsset = new Map<string, IntegrationOffering[]>();
    integrations.forEach((integration) => {
      if (!integration.linkedAssetId) return;
      byAsset.set(integration.linkedAssetId, [
        ...(byAsset.get(integration.linkedAssetId) || []),
        integration,
      ]);
    });
    return byAsset;
  }

  private addMissingProductReferences(
    product: Product,
    packIds: string[],
    highlightAssetIds: string[],
    packMap: Map<string, AssetPack>,
    assetMap: Map<string, PlatformAsset>,
    issues: DependencyIssue[],
  ) {
    packIds
      .filter((packId) => !packMap.has(packId))
      .forEach((packId) =>
        issues.push({
          id: `missing-product-pack-${product.id}-${packId}`,
          type: ASSET_DEPENDENCY_ISSUE_TYPES.MISSING_DEPENDENCY,
          severity: 'high',
          title: 'Missing product pack dependency',
          detail: `${product.name} references missing asset pack ${packId}.`,
          relatedIds: [product.id, packId],
        }),
      );

    highlightAssetIds
      .filter((assetId) => !assetMap.has(assetId))
      .forEach((assetId) =>
        issues.push({
          id: `missing-product-asset-${product.id}-${assetId}`,
          type: ASSET_DEPENDENCY_ISSUE_TYPES.MISSING_DEPENDENCY,
          severity: 'high',
          title: 'Missing product asset dependency',
          detail: `${product.name} highlights missing asset ${assetId}.`,
          relatedIds: [product.id, assetId],
        }),
      );
  }

  private addMissingPackReferences(
    pack: AssetPack,
    assetMap: Map<string, PlatformAsset>,
    issues: DependencyIssue[],
  ) {
    (pack.assetIds || [])
      .filter((assetId) => !assetMap.has(assetId))
      .forEach((assetId) =>
        issues.push({
          id: `missing-pack-asset-${pack.id}-${assetId}`,
          type: ASSET_DEPENDENCY_ISSUE_TYPES.MISSING_DEPENDENCY,
          severity: 'high',
          title: 'Missing pack asset dependency',
          detail: `${pack.name} references missing asset ${assetId}.`,
          relatedIds: [pack.id, assetId],
        }),
      );

    (pack.requiredDependencies || [])
      .filter((assetId) => !assetMap.has(assetId))
      .forEach((assetId) =>
        issues.push({
          id: `missing-pack-required-${pack.id}-${assetId}`,
          type: ASSET_DEPENDENCY_ISSUE_TYPES.MISSING_DEPENDENCY,
          severity: 'medium',
          title: 'Missing pack required dependency',
          detail: `${pack.name} requires missing dependency ${assetId}.`,
          relatedIds: [pack.id, assetId],
        }),
      );
  }

  private addMissingAssetReferences(
    asset: PlatformAsset,
    assetMap: Map<string, PlatformAsset>,
    issues: DependencyIssue[],
  ) {
    (asset.dependencies || [])
      .filter((assetId) => !assetMap.has(assetId))
      .forEach((assetId) =>
        issues.push({
          id: `missing-asset-dependency-${asset.id}-${assetId}`,
          type: ASSET_DEPENDENCY_ISSUE_TYPES.MISSING_DEPENDENCY,
          severity: 'medium',
          title: 'Missing asset dependency',
          detail: `${asset.title || asset.id} depends on missing asset ${assetId}.`,
          relatedIds: [asset.id, assetId],
        }),
      );
  }

  private addDuplicateIssues(
    scopeLabel: string,
    scopeId: string,
    dependencyLabel: string,
    ids: string[],
    issues: DependencyIssue[],
  ) {
    duplicateValues(ids).forEach((id) => {
      issues.push({
        id: `duplicate-${scopeLabel.replace(/\s+/g, '-')}-${scopeId}-${dependencyLabel.replace(/\s+/g, '-')}-${id}`,
        type: ASSET_DEPENDENCY_ISSUE_TYPES.DUPLICATE_DEPENDENCY,
        severity: 'medium',
        title: 'Duplicate dependency',
        detail: `${scopeLabel} ${scopeId} references ${dependencyLabel} ${id} more than once.`,
        relatedIds: compact([scopeId, id]),
      });
    });
  }

  private resolveBackendServices(asset: PlatformAsset): string[] {
    const services = new Set<string>();

    if (asset.backendStatus) services.add(`backend:${asset.backendStatus}`);
    if (asset.assetType === PlatformAssetType.AI_AGENT || asset.route === '/assistant') {
      services.add('AiModule');
    }
    if (asset.route?.startsWith('/tools') || asset.assetType === PlatformAssetType.CALCULATOR) {
      services.add('ClinicalTools');
    }
    if (asset.assetType === PlatformAssetType.MAP || asset.id.includes('twin')) {
      services.add('DigitalTwinService');
    }
    if (asset.assetType === PlatformAssetType.IOT || asset.id.includes('device')) {
      services.add('PlatformAssetsService');
    }
    if (asset.assetType === PlatformAssetType.FLEET || asset.id.includes('fleet')) {
      services.add('FleetOperations');
    }
    if (asset.assetType === PlatformAssetType.GOVERNANCE || asset.id.includes('audit')) {
      services.add('PlatformGovernanceService');
    }

    if (!services.size) services.add('PlatformAssetsService');
    return [...services];
  }

  private async filterForEntitledAssets(
    products: Product[],
    packs: AssetPack[],
    assets: PlatformAsset[],
    organizationId: string,
    options: { userRole?: string; subscriptionPlan?: string },
  ) {
    const organization = await this.organizationRepository.findOne({
      where: { id: organizationId },
    });
    const [entitledAssetIds, entitlements] = await Promise.all([
      this.platformAssetsService.resolveEntitledAssetIds({ organizationId }),
      this.platformAssetsService.getOrganizationEntitlements(organizationId),
    ]);
    const entitledPackIds = entitlements.map((row) => row.packId);
    const visibleAssets = assets.filter((asset) => {
      const decision = this.entitlementService.resolveDecisionFromContext({
        assetId: asset.id,
        asset,
        organization,
        organizationId,
        userRole: options.userRole,
        subscriptionPlan: options.subscriptionPlan,
        entitledAssetIds,
        entitledPackIds,
        strictEntitlements: this.platformAssetsService.isStrictSaasEntitlementsEnabled(),
      });
      return entitledAssetIds.includes(asset.id) && decision.isLaunchable;
    });
    const visibleAssetIds = new Set(visibleAssets.map((asset) => asset.id));
    const visiblePacks = packs
      .filter((pack) => entitledPackIds.includes(pack.id))
      .map(
        (pack) =>
          ({
            ...pack,
            assetIds: (pack.assetIds || []).filter((assetId) => visibleAssetIds.has(assetId)),
          }) as AssetPack,
      )
      .filter((pack) => pack.assetIds.length);
    const visiblePackIds = new Set(visiblePacks.map((pack) => pack.id));
    const visibleProducts = products
      .map(
        (product) =>
          ({
            ...product,
            packIds: (product.packIds || []).filter((packId) => visiblePackIds.has(packId)),
            highlightAssetIds: (product.highlightAssetIds || []).filter((assetId) =>
              visibleAssetIds.has(assetId),
            ),
          }) as Product,
      )
      .filter((product) => product.packIds.length || product.highlightAssetIds.length);

    return {
      products: visibleProducts,
      packs: visiblePacks,
      assets: visibleAssets,
    };
  }
}
