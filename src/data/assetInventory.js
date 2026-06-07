/**
 * Mounted SaaS asset projection.
 *
 * The backend platform asset catalog remains the commercial source of truth.
 * This module gives frontend-only and offline/demo surfaces the same layer
 * shape so routes, dashboards, command launch, and audits can reason about one
 * mounted graph instead of empty pack placeholders.
 */

import { ROUTE_RECORDS } from '../config/routes.config';
import {
  ADVANCED_SIDEBAR_NAV_ITEMS,
  OPERATIONS_SIDEBAR_NAV_ITEMS,
  PRIMARY_SIDEBAR_NAV_ITEMS,
  QUICK_COMMAND_DESTINATION_ITEMS,
  SOLUTIONS_SIDEBAR_NAV_ITEMS,
} from '../config/navigation.config';
import { getPlatformEntitlementContext } from './assetEntitlements';
import { enrichToolWithSegmentation } from './profileToolSegmentation';
import {
  getUserFacingToolInventory,
  getUserFacingToolRegistryProjection,
  TOOL_EXECUTOR_STATUS,
  TOOL_LAUNCH_TYPES,
  TOOL_SURFACES,
} from './toolInventory';

const uniq = (values) => [...new Set(values.flat().filter(Boolean))];
const norm = (value) => String(value || '').trim().toLowerCase();
const hasAny = (haystack, needles) => needles.some((needle) => haystack.includes(needle));

export const SAAS_PRODUCTS = Object.freeze([
  Object.freeze({
    id: 'product-core-platform',
    name: 'CareDroid Core Platform',
    layer: 'subscription',
    packIds: ['core-platform', 'ai-workflow-pack'],
  }),
  Object.freeze({
    id: 'product-emergency-department',
    name: 'Emergency Department Solution',
    layer: 'product',
    packIds: ['emergency-department-pack', 'emergency-medicine'],
  }),
  Object.freeze({
    id: 'product-hospital-operations',
    name: 'Hospital Operations Solution',
    layer: 'product',
    packIds: ['hospital-operations', 'digital-twin-pack'],
  }),
  Object.freeze({
    id: 'product-icu',
    name: 'ICU Suite',
    layer: 'product',
    packIds: ['icu-pack'],
  }),
  Object.freeze({
    id: 'product-cardiology',
    name: 'Cardiology Suite',
    layer: 'product',
    packIds: ['cardiology-pack'],
  }),
  Object.freeze({
    id: 'product-laboratory',
    name: 'Laboratory Intelligence Suite',
    layer: 'product',
    packIds: ['laboratory-intelligence'],
  }),
  Object.freeze({
    id: 'product-medical-iot',
    name: 'Medical IoT Solution',
    layer: 'product',
    packIds: ['medical-iot-pack'],
  }),
  Object.freeze({
    id: 'product-fleet-ems',
    name: 'Fleet & EMS Suite',
    layer: 'product',
    packIds: ['fleet-logistics'],
  }),
  Object.freeze({
    id: 'product-digital-twin',
    name: 'Digital Twin Suite',
    layer: 'product',
    packIds: ['digital-twin-pack'],
  }),
  Object.freeze({
    id: 'product-simulation-training',
    name: 'Simulation & Training Solution',
    layer: 'product',
    packIds: ['simulation-training-pack'],
  }),
  Object.freeze({
    id: 'product-governance',
    name: 'Governance & Compliance Solution',
    layer: 'product',
    packIds: ['governance-compliance-pack'],
  }),
  Object.freeze({
    id: 'product-research',
    name: 'Research & Education Solution',
    layer: 'product',
    packIds: ['research-education'],
  }),
]);

export const ASSET_PACKS = Object.freeze([
  Object.freeze({ id: 'core-platform', name: 'Core Platform', workspaceIds: ['clinical', 'operations'] }),
  Object.freeze({ id: 'ai-workflow-pack', name: 'AI Workflow Pack', workspaceIds: ['assistant', 'ai-workflow'] }),
  Object.freeze({ id: 'emergency-medicine', name: 'Emergency Medicine Pack', workspaceIds: ['emergency', 'clinical'] }),
  Object.freeze({ id: 'emergency-department-pack', name: 'Emergency Department Pack', workspaceIds: ['emergency'] }),
  Object.freeze({ id: 'icu-pack', name: 'ICU Pack', workspaceIds: ['icu', 'clinical'] }),
  Object.freeze({ id: 'cardiology-pack', name: 'Cardiology Pack', workspaceIds: ['cardiology', 'clinical'] }),
  Object.freeze({ id: 'laboratory-intelligence', name: 'Laboratory Intelligence Pack', workspaceIds: ['laboratory'] }),
  Object.freeze({ id: 'medical-iot-pack', name: 'Medical IoT Pack', workspaceIds: ['medical-iot', 'operations'] }),
  Object.freeze({ id: 'fleet-logistics', name: 'Fleet Logistics Pack', workspaceIds: ['fleet', 'operations'] }),
  Object.freeze({ id: 'hospital-operations', name: 'Hospital Operations Pack', workspaceIds: ['operations'] }),
  Object.freeze({ id: 'digital-twin-pack', name: 'Digital Twin Pack', workspaceIds: ['operations', 'maps'] }),
  Object.freeze({ id: 'simulation-training-pack', name: 'Simulation Training Pack', workspaceIds: ['education', 'simulation'] }),
  Object.freeze({ id: 'governance-compliance-pack', name: 'Governance Compliance Pack', workspaceIds: ['governance', 'audit'] }),
  Object.freeze({ id: 'research-education', name: 'Research Education Pack', workspaceIds: ['research', 'education'] }),
]);

export const CANONICAL_WORKSPACE_IDS = Object.freeze([
  'emergency',
  'icu',
  'laboratory',
  'operations',
  'fleet',
  'medical-iot',
  'education',
  'governance',
  'research',
  'cardiology',
]);

const PRODUCT_IDS_BY_PACK_ID = SAAS_PRODUCTS.reduce((acc, product) => {
  for (const packId of product.packIds) {
    acc[packId] = uniq([acc[packId] || [], product.id]);
  }
  return acc;
}, {});

const PACK_IDS_BY_ID = ASSET_PACKS.reduce((acc, pack) => {
  acc[pack.id] = pack;
  return acc;
}, {});

const PACKS_BY_CONTEXT_ASSET = (context) => {
  const packByAsset = new Map();
  for (const pack of [
    ...(context?.availablePacks || []),
    ...(context?.entitledPacks || []),
  ]) {
    for (const assetId of pack.assetIds || pack.assets || []) {
      const id = typeof assetId === 'string' ? assetId : assetId?.id;
      if (!id) continue;
      packByAsset.set(id, uniq([packByAsset.get(id) || [], pack.id]));
    }
  }
  return packByAsset;
};

function inferPackIds(tool) {
  const text = norm(
    [
      tool.id,
      tool.name,
      tool.label,
      tool.category,
      tool.presentationCategory,
      tool.surface,
      tool.route,
      tool.path,
      ...(tool.tags || []),
      ...(tool.workspaceTags || []),
      ...(tool.nluProfileIds || []),
    ].join(' ')
  );

  const packs = [];
  if (hasAny(text, ['assistant', 'ai', 'scribe', 'summary', 'differential', 'order set', 'timeline'])) {
    packs.push('ai-workflow-pack', 'core-platform');
  }
  if (hasAny(text, ['qsofa', 'news2', 'sofa', 'nihss', 'stroke', 'trauma', 'emergency', 'sepsis', 'triage'])) {
    packs.push('emergency-medicine', 'emergency-department-pack');
  }
  if (hasAny(text, ['icu', 'critical', 'ventilator', 'rox', 'oxygenation', 'apache'])) {
    packs.push('icu-pack');
  }
  if (hasAny(text, ['cardio', 'heart', 'stemi', 'acs', 'timi', 'grace', 'ecg', 'atrial', 'chads', 'has-bled'])) {
    packs.push('cardiology-pack');
  }
  if (hasAny(text, ['lab', 'abg', 'pharmacy', 'drug', 'medication', 'dose', 'antibiotic'])) {
    packs.push('laboratory-intelligence');
  }
  if (hasAny(text, ['iot', 'device', 'telemetry', 'biomedical', 'maintenance'])) {
    packs.push('medical-iot-pack');
  }
  if (hasAny(text, ['fleet', 'dispatch', 'route optimizer', 'predictive maintenance', 'eta'])) {
    packs.push('fleet-logistics');
  }
  if (hasAny(text, ['hospital map', 'digital twin', 'operations', 'capacity', 'occupancy', 'incident', 'asset tracking', 'live map'])) {
    packs.push('hospital-operations', 'digital-twin-pack');
  }
  if (hasAny(text, ['simulation', 'scenario', 'competenc', 'credential', 'education', 'training', 'debrief'])) {
    packs.push('simulation-training-pack');
  }
  if (hasAny(text, ['governance', 'security', 'audit', 'regulatory', 'privacy', 'system health', 'lineage', 'feature flag'])) {
    packs.push('governance-compliance-pack');
  }
  if (hasAny(text, ['research', 'evidence', 'guideline', 'rag', 'knowledge graph'])) {
    packs.push('research-education');
  }
  if (!packs.length) packs.push('core-platform');
  return uniq(packs);
}

function productIdsForPackIds(packIds) {
  return uniq(packIds.flatMap((packId) => PRODUCT_IDS_BY_PACK_ID[packId] || []));
}

function workspaceIdsFor(packIds, tool) {
  const segmentation = enrichToolWithSegmentation({
    ...tool,
    label: tool.label || tool.name,
    route: tool.route || tool.path,
  });
  return uniq([
    ...(segmentation.workspaceTags || []),
    ...packIds.flatMap((packId) => PACK_IDS_BY_ID[packId]?.workspaceIds || []),
  ]).map((id) => (id === 'iot' || id === 'hospital-operations' ? 'operations' : id));
}

function roleIdsFor(tool) {
  const segmentation = enrichToolWithSegmentation({
    ...tool,
    label: tool.label || tool.name,
    route: tool.route || tool.path,
  });
  return uniq(segmentation.intendedRoles || []);
}

function assetTypeFor(tool) {
  if (tool.hasDedicatedForm || tool.calculatorSlug) return 'calculator';
  if (tool.surface === TOOL_SURFACES.IOT_DASHBOARD || tool.category === 'IoT') return 'iot-module';
  if (tool.surface === TOOL_SURFACES.FLEET_PAGE || tool.category === 'Fleet') return 'fleet-module';
  if (tool.surface === TOOL_SURFACES.HOSPITAL_OPERATIONS || /map/i.test(tool.category || '')) return 'map';
  if (/simulation/i.test(tool.category || '')) return 'simulation';
  if (/governance|audit|security|regulatory/i.test(`${tool.id} ${tool.category}`)) return 'governance';
  if (tool.launchType === TOOL_LAUNCH_TYPES.CHAT_ASSISTED || /ai/i.test(tool.category || '')) return 'ai-assisted-tool';
  if (tool.surface === TOOL_SURFACES.HUB) return 'hub';
  return 'tool';
}

function executionFor(tool) {
  if (tool.launchType === TOOL_LAUNCH_TYPES.UNSUPPORTED_PLANNED || tool.executorStatus === TOOL_EXECUTOR_STATUS.UNSUPPORTED) {
    return {
      supportStatus: 'unsupported',
      mode: 'unsupported',
      label: 'Unsupported/planned',
    };
  }
  if (tool.launchType === TOOL_LAUNCH_TYPES.BACKEND_BACKED && tool.endpoint) {
    return {
      supportStatus: 'backend-backed',
      mode: 'api',
      endpoint: tool.endpoint,
      apiClient: tool.auditRefs?.apiClient || tool.apiClient,
      label: 'Backend backed',
    };
  }
  if (tool.launchType === TOOL_LAUNCH_TYPES.CHAT_ASSISTED) {
    return {
      supportStatus: 'ai-assisted',
      mode: 'chat',
      endpoint: '/api/chat/message',
      label: 'AI assisted',
    };
  }
  if (
    [
      TOOL_LAUNCH_TYPES.LOCAL_ONLY,
      TOOL_LAUNCH_TYPES.FLEET_LOCAL,
      TOOL_LAUNCH_TYPES.IOT_LOCAL,
      TOOL_LAUNCH_TYPES.HOSPITAL_LOCAL,
    ].includes(tool.launchType)
  ) {
    return {
      supportStatus: 'local-deterministic',
      mode: 'local',
      label: 'Local deterministic',
    };
  }
  if (tool.endpoint) {
    return {
      supportStatus: 'backend-backed',
      mode: 'platform-api',
      endpoint: tool.endpoint,
      apiClient: tool.auditRefs?.apiClient || tool.apiClient,
      label: 'Platform API',
    };
  }
  return {
    supportStatus: 'demo-only',
    mode: 'frontend-demo',
    label: 'Demo only',
  };
}

function demoStatusFor(tool, execution) {
  if (execution.supportStatus === 'unsupported') return 'unsupported';
  if (execution.supportStatus === 'backend-backed' && tool.executorStatus === TOOL_EXECUTOR_STATUS.REGISTERED) return 'live';
  if (execution.supportStatus === 'local-deterministic') return 'live';
  if (execution.supportStatus === 'ai-assisted') return 'demo-ready';
  return 'demo-only';
}

function governanceFor(tool, execution) {
  const segmentation = enrichToolWithSegmentation({
    ...tool,
    label: tool.label || tool.name,
    route: tool.route || tool.path,
  });
  const riskLevel = tool.riskLevel || segmentation.clinicalRiskLevel || 'medium';
  const highRisk = ['high', 'critical'].includes(riskLevel);
  return {
    owner: highRisk ? 'Clinical Safety Board' : 'Clinical Platform Owner',
    steward: 'Clinical Informatics Steward',
    approver: highRisk ? 'Clinical Safety Board' : 'Asset Steward',
    riskLevel,
    requiresHumanReview: Boolean(segmentation.requiresHumanReview || highRisk),
    auditRequirement:
      execution.supportStatus === 'backend-backed' || highRisk ? 'required' : 'standard',
    reviewSchedule: highRisk ? 'quarterly' : 'annual',
    validationStatus: demoStatusFor(tool, execution),
  };
}

function entitlementFor(id, context) {
  const entitledIds = new Set(context?.entitledAssetIds || []);
  const hiddenIds = new Set(context?.roleProfile?.hiddenAssetIds || []);
  if (hiddenIds.has(id)) return false;
  return entitledIds.size ? entitledIds.has(id) : true;
}

function mountedAssetFromTool(tool, context, contextPackByAsset) {
  const route = tool.route || tool.path || tool.navigationPath;
  const contextPackIds = contextPackByAsset.get(tool.id) || [];
  const packIds = uniq([contextPackIds, inferPackIds(tool)]);
  const productIds = productIdsForPackIds(packIds);
  const execution = executionFor(tool);
  const workspaceIds = workspaceIdsFor(packIds, tool);
  const roleIds = roleIdsFor(tool);

  return {
    id: tool.id,
    canonicalInventoryId: tool.canonicalInventoryId || tool.id,
    assetType: assetTypeFor(tool),
    title: tool.label || tool.name || tool.id,
    description: tool.description || tool.safetyCopy || tool.notes || 'Mounted CareDroid platform asset.',
    category: tool.category || 'Clinical',
    route,
    lifecycle: tool.lifecycleState || 'active',
    demoStatus: demoStatusFor(tool, execution),
    entitled: entitlementFor(tool.id, context),
    packIds,
    productIds,
    workspaceIds,
    roleIds,
    intendedRoles: roleIds,
    layers: {
      tenant: context?.organization?.id || 'tenant-context',
      subscription: context?.subscription?.tier || context?.organization?.settings?.subscriptionTier || 'plan-gated',
      products: productIds,
      assetPacks: packIds,
      asset: tool.id,
      workspaces: workspaceIds,
      usersRoles: roleIds,
      ui: route,
      backendServices: execution.endpoint || execution.mode,
      governanceAnalytics: execution.supportStatus,
    },
    commercial: {
      productIds,
      packIds,
      pricingTier: packIds.some((id) => ['medical-iot-pack', 'digital-twin-pack', 'governance-compliance-pack'].includes(id))
        ? 'enterprise'
        : 'standard',
    },
    access: {
      organizationTypes: context?.organization?.organizationType ? [context.organization.organizationType] : ['hospital'],
      workspaceIds,
      roleIds,
      permissions: tool.permissionPolicy?.permissions || tool.auditRefs?.permissionPolicy?.permissions || [],
      entitled: entitlementFor(tool.id, context),
    },
    execution,
    governance: governanceFor(tool, execution),
    mounting: {
      route,
      navigationPath: tool.navigationPath || route,
      sidebarVisible: Boolean(tool.sidebarVisible),
      catalogVisible: tool.userCatalogVisible !== false,
      commandLaunchable: Boolean(route || tool.chatSeed),
    },
    evidence: {
      sourceFiles: uniq([tool.component, tool.auditRefs?.apiClient]),
      sourceKind: tool.auditRefs?.sourceKind || tool.sourceKind || 'toolInventory',
      tests: tool.auditRefs?.testCoverage || tool.testCoverage || [],
      backendStatus: execution.supportStatus,
    },
  };
}

export function buildAssetInventoryProjection(context = getPlatformEntitlementContext()) {
  const contextPackByAsset = PACKS_BY_CONTEXT_ASSET(context);
  const inventory = getUserFacingToolInventory();
  const registryProjection = new Map(
    getUserFacingToolRegistryProjection().map((tool) => [tool.id, tool])
  );

  return inventory.map((tool) => {
    const registry = registryProjection.get(tool.id);
    return mountedAssetFromTool({ ...tool, ...registry, id: tool.id }, context, contextPackByAsset);
  });
}

const SYSTEM_ROUTE_GROUPS = new Set([
  'auth',
  'primary',
  'tools',
  'operations',
  'account',
  'advanced',
  'organization',
  'products',
  'secondary',
]);

export function buildRouteOwnershipProjection({
  assets = buildAssetInventoryProjection(),
  routeRecords = ROUTE_RECORDS,
} = {}) {
  const assetsByRoute = new Map();
  for (const asset of assets) {
    if (!asset.route) continue;
    assetsByRoute.set(asset.route, uniq([assetsByRoute.get(asset.route) || [], asset.id]));
  }
  return routeRecords.map((route) => {
    const assetIds = assetsByRoute.get(route.path) || [];
    const ownerType = assetIds.length
      ? 'asset'
      : SYSTEM_ROUTE_GROUPS.has(route.navGroup)
        ? 'system'
        : route.notes
          ? 'documented-system'
          : 'unowned';
    return {
      routeId: route.id,
      path: route.path,
      navGroup: route.navGroup,
      componentKey: route.componentKey,
      ownerType,
      assetIds,
      systemPurpose: ownerType === 'asset' ? null : route.notes || `${route.navGroup} route`,
    };
  });
}

export function buildNavigationMountProjection() {
  const sections = [
    ['primary', PRIMARY_SIDEBAR_NAV_ITEMS],
    ['solutions', SOLUTIONS_SIDEBAR_NAV_ITEMS],
    ['operations', OPERATIONS_SIDEBAR_NAV_ITEMS],
    ['advanced', ADVANCED_SIDEBAR_NAV_ITEMS],
    ['command', QUICK_COMMAND_DESTINATION_ITEMS],
  ];
  return sections.flatMap(([section, items]) =>
    items.map((item) => ({
      ...item,
      section,
      sidebarVisible: section !== 'command' && item.showInSidebar !== false,
      commandVisible: section === 'command',
    }))
  );
}
