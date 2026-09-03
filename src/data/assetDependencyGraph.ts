import { FEATURE_FLAG_CATEGORIES, FEATURE_FLAG_REGISTRY } from '../config/featureFlags.config';
import { getCanonicalToolInventory } from './toolInventory';

export const ASSET_DEPENDENCY_ISSUE_TYPES = Object.freeze({
  MISSING_DEPENDENCY: 'missing-dependency',
  DUPLICATE_DEPENDENCY: 'duplicate-dependency',
  ORPHAN_ASSET: 'orphan-asset',
});

const DEMO_INTEGRATIONS = Object.freeze([
  { id: 'int-fhir', name: 'FHIR', category: 'interoperability', status: 'beta' },
  { id: 'int-hl7', name: 'HL7', category: 'interoperability', status: 'beta' },
]);

function productForCategory(category: string) {
  const id = category.toLowerCase().replace(/\s+/g, '-');
  return {
    id,
    slug: id,
    name: `${category} Capability Platform`,
  };
}

function backendServicesFor(record: any) {
  if (!record?.endpoint) return ['BrowserLocal'];
  if (record.endpoint.includes('/clinical-intelligence')) return ['ClinicalIntelligence'];
  if (record.endpoint.includes('/platform')) return ['PlatformAssets'];
  if (record.executorStatus === 'registered') return ['ToolOrchestrator'];
  return ['PlatformAssets'];
}

function integrationsFor(record: any) {
  if (!record) return [];
  if (record.sourceKind === 'plugin') return [DEMO_INTEGRATIONS[0]];
  if (record.category === 'Calculator' || record.presentationCategory === 'Calculator') {
    return [DEMO_INTEGRATIONS[1]];
  }
  return [];
}

export function buildLocalAssetDependencyGraph({
  flags = FEATURE_FLAG_REGISTRY,
  inventoryRecords = getCanonicalToolInventory(),
  maxChains = 24,
}: any = {}) {
  const inventoryById = new Map(inventoryRecords.map((record) => [record.id, record]));
  const chains: any[] = [];
  const issues: any[] = [];
  const linkedAssetIds = new Set<string>();
  const chainKeys = new Set<string>();

  for (const flag of flags) {
    const product = productForCategory(flag.category);
    const assetPack = {
      id: flag.id,
      slug: flag.id,
      name: flag.name,
      requiredDependencies: [],
    };

    for (const assetId of flag.assetIds || []) {
      const record: any = inventoryById.get(assetId);
      const chainId = `${product.id}:${assetPack.id}:${assetId}`;
      if (chainKeys.has(chainId)) {
        issues.push({
          id: `duplicate-${chainId}`,
          type: ASSET_DEPENDENCY_ISSUE_TYPES.DUPLICATE_DEPENDENCY,
          severity: 'medium',
          title: 'Duplicate asset dependency',
          detail: `${assetId} is linked from multiple rollout chains.`,
          relatedIds: [chainId],
        });
        continue;
      }
      chainKeys.add(chainId);
      linkedAssetIds.add(assetId);

      if (!record) {
        issues.push({
          id: `missing-${chainId}`,
          type: ASSET_DEPENDENCY_ISSUE_TYPES.MISSING_DEPENDENCY,
          severity: 'high',
          title: 'Missing asset dependency',
          detail: `${flag.name} references asset ${assetId} that is not in unified inventory.`,
          relatedIds: [flag.id, assetId],
        });
      }

      chains.push({
        id: chainId,
        product,
        assetPack,
        asset: {
          id: assetId,
          title: record?.label || record?.name || assetId,
          assetType: record?.sourceKind || record?.category || 'tool',
          dependencies: [],
        },
        route: record?.route || record?.navigationPath || flag.route,
        backendServices: backendServicesFor(record),
        integrations: integrationsFor(record),
      });

      if (chains.length >= maxChains) break;
    }
    if (chains.length >= maxChains) break;
  }

  const orphanAssets = inventoryRecords
    .filter((record) => !linkedAssetIds.has(record.id))
    .slice(0, 8);

  for (const record of orphanAssets) {
    issues.push({
      id: `orphan-${record.id}`,
      type: ASSET_DEPENDENCY_ISSUE_TYPES.ORPHAN_ASSET,
      severity: 'low',
      title: 'Orphan asset',
      detail: `${record.label || record.id} is in inventory but not linked to a rollout pack chain.`,
      relatedIds: [record.id],
    });
  }

  const issueCounts = Object.values(ASSET_DEPENDENCY_ISSUE_TYPES).reduce<Record<string, number>>(
    (acc, type) => {
      acc[type] = issues.filter((issue) => issue.type === type).length;
      return acc;
    },
    {},
  );

  const routes = new Set(chains.map((chain) => chain.route).filter(Boolean));
  const backendServices = new Set(chains.flatMap((chain) => chain.backendServices));
  const integrations = new Set(
    chains.flatMap((chain) => chain.integrations.map((item) => item.id)),
  );

  return {
    generatedAt: new Date(0).toISOString(),
    summary: {
      products: new Set(chains.map((chain) => chain.product.id)).size,
      assetPacks: new Set(chains.map((chain) => chain.assetPack.id)).size,
      assets: chains.length,
      routes: routes.size,
      backendServices: backendServices.size,
      integrations: integrations.size,
      categories: Object.values(FEATURE_FLAG_CATEGORIES).length,
    },
    issueCounts,
    issues,
    chains,
  };
}
