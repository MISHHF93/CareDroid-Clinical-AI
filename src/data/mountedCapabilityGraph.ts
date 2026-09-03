import { ROUTE_RECORDS } from '../config/routes.config';
import {
  ADVANCED_SIDEBAR_NAV_ITEMS,
  OPERATIONS_SIDEBAR_NAV_ITEMS,
  PRIMARY_SIDEBAR_NAV_ITEMS,
  QUICK_COMMAND_DESTINATION_ITEMS,
  SOLUTIONS_SIDEBAR_NAV_ITEMS,
} from '../config/navigation.config';
import { getBackendCapabilityStatus } from '../config/backendApiCapabilities';
import {
  getUserFacingToolInventory,
  getUserFacingToolRegistryProjection,
  TOOL_EXECUTOR_STATUS,
  TOOL_LAUNCH_TYPES,
  TOOL_SURFACES,
} from './toolInventory';

const uniq = (values) => [...new Set(values.flat().filter(Boolean))];
const norm = (value) =>
  String(value || '')
    .trim()
    .toLowerCase();
const hasAny = (haystack, needles) => needles.some((needle) => haystack.includes(needle));

export const MOUNTED_CAPABILITY_GRAPH_VERSION = 1;

export const SUPPORT_STATUSES = Object.freeze({
  LIVE: 'live',
  DEMO: 'demo',
  DEMO_READY: 'demo-ready',
  DEMO_ONLY: 'demo-only',
  BACKEND_BACKED: 'backend-backed',
  LOCAL_DETERMINISTIC: 'local-deterministic',
  AI_ASSISTED: 'ai-assisted',
  FRONTEND_ONLY: 'frontend-only',
  BACKEND_ONLY: 'backend-only',
  UNSUPPORTED: 'unsupported',
  DISABLED: 'disabled',
});

export const LIFECYCLE_STATUSES = Object.freeze({
  DRAFT: 'draft',
  BETA: 'beta',
  ACTIVE: 'active',
  DEPRECATED: 'deprecated',
  ARCHIVED: 'archived',
});

export const PACK_ID_ALIASES = Object.freeze({
  'clinical-core': 'core-platform',
  critical: 'icu-pack',
  'critical-care': 'icu-pack',
  'medical-iot': 'medical-iot-pack',
  iot: 'medical-iot-pack',
  'education-simulation': 'simulation-training-pack',
  simulation: 'simulation-training-pack',
  training: 'simulation-training-pack',
  'research-intelligence': 'research-education',
  research: 'research-education',
  'governance-risk': 'governance-compliance-pack',
  governance: 'governance-compliance-pack',
  'ai-evaluation-lab': 'governance-compliance-pack',
});

export const SAAS_PRODUCTS = Object.freeze([
  Object.freeze({
    id: 'product-core-platform',
    name: 'CareDroid Core Platform',
    layer: 'subscription',
    packIds: ['core-platform', 'ai-workflow-pack'],
  }),
  Object.freeze({
    id: 'product-emergency-department',
    name: 'Emergency Flow Intelligence Platform',
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
  Object.freeze({
    id: 'core-platform',
    name: 'Core Platform',
    workspaceIds: ['clinical', 'operations'],
  }),
  Object.freeze({
    id: 'ai-workflow-pack',
    name: 'AI Workflow Pack',
    workspaceIds: ['assistant', 'ai-workflow'],
  }),
  Object.freeze({
    id: 'emergency-medicine',
    name: 'Emergency Medicine Pack',
    workspaceIds: ['emergency', 'clinical'],
  }),
  Object.freeze({
    id: 'emergency-department-pack',
    name: 'Emergency Department Pack',
    workspaceIds: ['emergency'],
  }),
  Object.freeze({ id: 'icu-pack', name: 'ICU Pack', workspaceIds: ['icu', 'clinical'] }),
  Object.freeze({
    id: 'cardiology-pack',
    name: 'Cardiology Pack',
    workspaceIds: ['cardiology', 'clinical'],
  }),
  Object.freeze({
    id: 'laboratory-intelligence',
    name: 'Laboratory Intelligence Pack',
    workspaceIds: ['laboratory'],
  }),
  Object.freeze({
    id: 'medical-iot-pack',
    name: 'Medical IoT Pack',
    workspaceIds: ['medical-iot', 'operations'],
  }),
  Object.freeze({
    id: 'fleet-logistics',
    name: 'Fleet Logistics Pack',
    workspaceIds: ['fleet', 'operations'],
  }),
  Object.freeze({
    id: 'hospital-operations',
    name: 'Hospital Operations Pack',
    workspaceIds: ['operations'],
  }),
  Object.freeze({
    id: 'digital-twin-pack',
    name: 'Digital Twin Pack',
    workspaceIds: ['operations', 'maps'],
  }),
  Object.freeze({
    id: 'simulation-training-pack',
    name: 'Simulation Training Pack',
    workspaceIds: ['education', 'simulation'],
  }),
  Object.freeze({
    id: 'governance-compliance-pack',
    name: 'Governance Compliance Pack',
    workspaceIds: ['governance', 'audit'],
  }),
  Object.freeze({
    id: 'research-education',
    name: 'Research Education Pack',
    workspaceIds: ['research', 'education'],
  }),
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

const PACK_BY_ID = new Map(ASSET_PACKS.map((pack) => [pack.id, pack]));
const PRODUCT_IDS_BY_PACK_ID = SAAS_PRODUCTS.reduce((acc, product) => {
  for (const packId of product.packIds) {
    acc[packId] = uniq([acc[packId] || [], product.id]);
  }
  return acc;
}, {});

const CAPABILITY_PACK_OVERRIDES = Object.freeze({
  assistant: ['core-platform', 'ai-workflow-pack'],
  calculators: ['core-platform', 'emergency-medicine'],
  'digital-operations-center': ['hospital-operations', 'digital-twin-pack'],
  'hospital-operations-command': ['hospital-operations', 'digital-twin-pack'],
  'hospital-map': ['hospital-operations', 'digital-twin-pack'],
  'digital-twin': ['digital-twin-pack', 'hospital-operations'],
  'digital-twin-intelligence': ['digital-twin-pack', 'hospital-operations'],
  'medical-iot-dashboard': ['medical-iot-pack'],
  'telemetry-monitoring': ['medical-iot-pack'],
  'device-maintenance': ['medical-iot-pack'],
  'device-fleet-management': ['medical-iot-pack', 'hospital-operations'],
  'fleet-dashboard': ['fleet-logistics'],
  'fleet-live-map': ['fleet-logistics'],
  'live-map': ['fleet-logistics', 'hospital-operations', 'medical-iot-pack'],
  'route-optimizer': ['fleet-logistics'],
  'predictive-maintenance': ['fleet-logistics', 'medical-iot-pack'],
  'dispatch-ai': ['fleet-logistics', 'ai-workflow-pack'],
  laboratory: ['laboratory-intelligence'],
  'laboratory-dashboard': ['laboratory-intelligence'],
  'lab-interp': ['laboratory-intelligence'],
  'abg-interpreter': ['laboratory-intelligence'],
  'simulation-suite': ['simulation-training-pack'],
  'scenario-player': ['simulation-training-pack'],
  'simulation-outcomes': ['simulation-training-pack'],
  competencies: ['simulation-training-pack'],
  credentials: ['simulation-training-pack'],
  'medical-3d-viewer': ['simulation-training-pack', 'research-education'],
  'research-evidence-hub': ['research-education'],
  'clinical-knowledge-graph': ['research-education', 'ai-workflow-pack'],
  'clinical-documentation-assistant': ['ai-workflow-pack', 'core-platform'],
  'predictive-analytics-dashboard': ['ai-workflow-pack', 'hospital-operations'],
  'clinical-decision-support': ['ai-workflow-pack', 'core-platform'],
  'ai-governance': ['governance-compliance-pack'],
  'ai-security': ['governance-compliance-pack'],
  'clinical-audit': ['governance-compliance-pack'],
  'ai-explainability': ['governance-compliance-pack', 'ai-workflow-pack'],
  'feature-flags': ['governance-compliance-pack'],
  'system-health': ['core-platform', 'governance-compliance-pack'],
});

const FALLBACK_ROLES = Object.freeze([
  'emergency-physician',
  'icu-physician',
  'nurse',
  'hospital-administrator',
  'platform-admin',
]);

export function normalizeAssetPackId(packId) {
  const id = norm(packId);
  return PACK_ID_ALIASES[id] || id;
}

export function normalizeAssetPackIds(packIds = [] as any[]) {
  return uniq(packIds.flat().map(normalizeAssetPackId)).filter((id) =>
    PACK_BY_ID.has(id as any),
  ) as any[];
}

export function productIdsForPackIds(packIds = [] as any[]) {
  return uniq(
    normalizeAssetPackIds(packIds).flatMap((packId) => PRODUCT_IDS_BY_PACK_ID[packId] || []),
  );
}

export function workspaceIdsForPackIds(packIds = [] as any[]) {
  return uniq(
    normalizeAssetPackIds(packIds)
      .flatMap((packId) => PACK_BY_ID.get(packId)?.workspaceIds || [])
      .map((id) => (id === 'iot' || id === 'hospital-operations' ? 'operations' : id)),
  );
}

function inferredPackIdsForCapability(tool) {
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
      ...(tool.aliases || []),
    ].join(' '),
  );

  const packs = [] as any[];
  if (
    hasAny(text, ['assistant', 'ai', 'scribe', 'summary', 'differential', 'order set', 'timeline'])
  ) {
    packs.push('ai-workflow-pack', 'core-platform');
  }
  if (
    hasAny(text, [
      'qsofa',
      'news2',
      'sofa',
      'nihss',
      'stroke',
      'trauma',
      'emergency',
      'sepsis',
      'triage',
    ])
  ) {
    packs.push('emergency-medicine', 'emergency-department-pack');
  }
  if (hasAny(text, ['icu', 'critical', 'ventilator', 'rox', 'oxygenation', 'apache'])) {
    packs.push('icu-pack');
  }
  if (
    hasAny(text, [
      'cardio',
      'heart',
      'stemi',
      'acs',
      'timi',
      'grace',
      'ecg',
      'atrial',
      'chads',
      'has-bled',
    ])
  ) {
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
  if (
    hasAny(text, [
      'hospital map',
      'digital twin',
      'operations',
      'capacity',
      'occupancy',
      'incident',
      'asset tracking',
      'live map',
    ])
  ) {
    packs.push('hospital-operations', 'digital-twin-pack');
  }
  if (
    hasAny(text, [
      'simulation',
      'scenario',
      'competenc',
      'credential',
      'education',
      'training',
      'debrief',
    ])
  ) {
    packs.push('simulation-training-pack');
  }
  if (
    hasAny(text, [
      'governance',
      'security',
      'audit',
      'regulatory',
      'privacy',
      'system health',
      'lineage',
      'feature flag',
    ])
  ) {
    packs.push('governance-compliance-pack');
  }
  if (hasAny(text, ['research', 'evidence', 'guideline', 'rag', 'knowledge graph'])) {
    packs.push('research-education');
  }
  if (!packs.length) packs.push('core-platform');
  return normalizeAssetPackIds(packs);
}

function mountedPackIdsForTool(tool, contextPackIds = [] as any[]) {
  return normalizeAssetPackIds([
    contextPackIds,
    CAPABILITY_PACK_OVERRIDES[tool.id] || [],
    inferredPackIdsForCapability(tool),
  ]);
}

function normalizeDemoLiveStatus(tool, backendSupport) {
  if (
    backendSupport === SUPPORT_STATUSES.UNSUPPORTED ||
    tool.executorStatus === TOOL_EXECUTOR_STATUS.UNSUPPORTED
  ) {
    return SUPPORT_STATUSES.UNSUPPORTED;
  }
  if (
    tool.launchType === TOOL_LAUNCH_TYPES.BACKEND_BACKED &&
    tool.executorStatus === TOOL_EXECUTOR_STATUS.REGISTERED
  ) {
    return SUPPORT_STATUSES.LIVE;
  }
  if (tool.launchType === TOOL_LAUNCH_TYPES.CHAT_ASSISTED) return SUPPORT_STATUSES.DEMO_READY;
  if (
    [
      TOOL_LAUNCH_TYPES.LOCAL_ONLY,
      TOOL_LAUNCH_TYPES.FLEET_LOCAL,
      TOOL_LAUNCH_TYPES.IOT_LOCAL,
    ].includes(tool.launchType)
  ) {
    return SUPPORT_STATUSES.LIVE;
  }
  if (backendSupport === SUPPORT_STATUSES.BACKEND_BACKED) return SUPPORT_STATUSES.DEMO;
  return SUPPORT_STATUSES.DEMO_ONLY;
}

function backendSupportForTool(tool) {
  if (tool.executorStatus === TOOL_EXECUTOR_STATUS.UNSUPPORTED) return SUPPORT_STATUSES.UNSUPPORTED;
  if (tool.executorStatus === TOOL_EXECUTOR_STATUS.REGISTERED)
    return SUPPORT_STATUSES.BACKEND_BACKED;
  if (tool.endpoint) {
    const capability = tool.auditRefs?.capability || tool.capability;
    const capabilityStatus = capability ? getBackendCapabilityStatus(capability) : null;
    if (capabilityStatus === 'demo') return SUPPORT_STATUSES.DEMO;
    if (capabilityStatus === 'disabled') return SUPPORT_STATUSES.DISABLED;
    return SUPPORT_STATUSES.BACKEND_BACKED;
  }
  if (tool.launchType === TOOL_LAUNCH_TYPES.CHAT_ASSISTED) return SUPPORT_STATUSES.AI_ASSISTED;
  if (
    [
      TOOL_LAUNCH_TYPES.LOCAL_ONLY,
      TOOL_LAUNCH_TYPES.FLEET_LOCAL,
      TOOL_LAUNCH_TYPES.IOT_LOCAL,
    ].includes(tool.launchType)
  ) {
    return SUPPORT_STATUSES.LOCAL_DETERMINISTIC;
  }
  return SUPPORT_STATUSES.FRONTEND_ONLY;
}

function routeSurface(route) {
  if (!route) return null;
  if (
    route.startsWith('/fleet') ||
    [
      '/operations',
      '/hospital-map',
      '/medical-iot',
      '/devices',
      '/live-map',
      '/digital-twin',
    ].includes(route)
  ) {
    return 'operations';
  }
  if (
    route.startsWith('/tools') ||
    [
      '/protocols',
      '/research',
      '/documentation',
      '/knowledge-graph',
      '/simulation',
      '/laboratory',
      '/3d-viewer',
    ].includes(route)
  ) {
    return 'tools';
  }
  if (route.startsWith('/profile')) return 'profile';
  if (
    route.startsWith('/settings') ||
    route.includes('admin') ||
    route.includes('governance') ||
    route.includes('security') ||
    route.includes('audit')
  ) {
    return 'advanced';
  }
  return 'dashboard';
}

function aiAliasesForTool(tool) {
  return uniq([
    tool.id,
    tool.nluToolId,
    ...(tool.nluProfileIds || []),
    ...(tool.aliases || []),
    tool.label,
    tool.name,
    tool.category,
  ]).map((value) => String(value).toLowerCase());
}

export function buildMountedCapability(tool, contextPackIds = [] as any[]) {
  const route = tool.route || tool.path || tool.navigationPath || null;
  const packIds = mountedPackIdsForTool(tool, contextPackIds);
  const productIds = productIdsForPackIds(packIds);
  const workspaceIds = uniq([
    ...(tool.workspaceIds || []),
    ...(tool.workspaceTags || []),
    ...workspaceIdsForPackIds(packIds),
  ]);
  const backendSupport = backendSupportForTool(tool);
  const demoStatus = normalizeDemoLiveStatus(tool, backendSupport);
  const roleIds = uniq([
    ...(tool.roleIds || []),
    ...(tool.intendedRoles || []),
    ...(tool.permissionPolicy?.permissions?.includes('CONFIGURE_SYSTEM') ? ['platform-admin'] : []),
    ...FALLBACK_ROLES,
  ]);

  return Object.freeze({
    version: MOUNTED_CAPABILITY_GRAPH_VERSION,
    capabilityId: tool.id,
    assetId: tool.id,
    title: tool.label || tool.name || tool.id,
    description:
      tool.description || tool.safetyCopy || tool.notes || 'Mounted CareDroid platform capability.',
    productIds,
    packIds,
    workspaceIds,
    roleIds,
    route,
    aliases: uniq([tool.nluToolId, ...(tool.nluProfileIds || []), ...(tool.aliases || [])]),
    aiAliases: aiAliasesForTool(tool),
    lifecycleStatus: tool.lifecycleState || LIFECYCLE_STATUSES.ACTIVE,
    demoStatus,
    backendSupport,
    frontendComponent: tool.component || null,
    backendEndpoint: tool.endpoint || null,
    uiSurface: tool.surface || routeSurface(route) || TOOL_SURFACES.TOOL_PAGE,
    routeSurface: routeSurface(route),
    dashboardVisible: Boolean(route),
    toolsVisible: routeSurface(route) === 'tools' || tool.surface === TOOL_SURFACES.CALCULATOR_FORM,
    operationsVisible: routeSurface(route) === 'operations',
    commandVisible: Boolean(route || tool.chatSeed),
    searchVisible: Boolean(route || tool.chatSeed),
    directRoute: Boolean(route && !tool.chatSeed),
    sourceKind: tool.auditRefs?.sourceKind || tool.sourceKind || 'toolInventory',
  });
}

let cachedGraph: any = null;

export function buildMountedCapabilityGraph({
  tools = getUserFacingToolInventory(),
  registryProjection = getUserFacingToolRegistryProjection(),
}: any = {}) {
  const registryById = new Map(registryProjection.map((tool) => [tool.id, tool]));
  const capabilities = tools.map((tool) =>
    buildMountedCapability({ ...tool, ...(registryById.get(tool.id) as any), id: tool.id }),
  );
  return Object.freeze({
    version: MOUNTED_CAPABILITY_GRAPH_VERSION,
    capabilities: Object.freeze(capabilities),
    byId: Object.freeze(
      Object.fromEntries(capabilities.map((capability) => [capability.capabilityId, capability])),
    ),
    products: SAAS_PRODUCTS,
    packs: ASSET_PACKS,
    routes: ROUTE_RECORDS,
    navigation: Object.freeze([
      ...PRIMARY_SIDEBAR_NAV_ITEMS,
      ...SOLUTIONS_SIDEBAR_NAV_ITEMS,
      ...OPERATIONS_SIDEBAR_NAV_ITEMS,
      ...ADVANCED_SIDEBAR_NAV_ITEMS,
      ...QUICK_COMMAND_DESTINATION_ITEMS,
    ]),
  });
}

export function getMountedCapabilityGraph() {
  if (!cachedGraph) cachedGraph = buildMountedCapabilityGraph();
  return cachedGraph;
}

export function getMountedCapabilityById(capabilityId) {
  return getMountedCapabilityGraph().byId[capabilityId] || null;
}

export function getMountedCapabilityMetadata(tool, contextPackIds = [] as any[]) {
  const mounted = getMountedCapabilityById(tool.id);
  return mounted || buildMountedCapability(tool, contextPackIds);
}
