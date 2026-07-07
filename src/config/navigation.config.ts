/**
 * Compatibility projections for navigation consumers.
 *
 * Canonical source: `unified-navigation.config.ts` (see `canonicalConfigurationModel.ts`).
 * `navigation/primaryNavigation.ts` is still a compatibility re-export.
 */
import {
  NAVIGATION_ITEMS,
  getPilotCustomerNavigationItems,
} from './unified-navigation.config';
import {
  CANONICAL_ROUTES,
  FLEET_MAP_ROUTE_ALIASES,
  LIVE_MAP_ROUTE_ALIASES,
} from './routes.config';
import { FEATURE_REGISTRY_BY_ID } from '../../lib/features/featureRegistry';

function appShellNavItemFromUnified(item) {
  return Object.freeze({
    id: item.id,
    label: item.label,
    mobileLabel: item.mobileLabel || item.label,
    iconKey: item.icon,
    featureGate: item.featureGate,
    featureId: item.featureId || item.featureGate || item.id,
    path: item.path,
    route: item.route,
    activePaths: item.activePaths || [item.path],
    matchPaths: item.activePaths || [item.path],
    roles: item.roles,
    isEmergencyCore: item.isEmergencyCore,
    order: item.order,
  });
}

export const APP_SHELL_NAV_ITEMS = Object.freeze(
  getPilotCustomerNavigationItems(NAVIGATION_ITEMS).map(appShellNavItemFromUnified)
);

export const EMERGENCY_SIDEBAR_NAV_ITEMS = APP_SHELL_NAV_ITEMS;

export const PRIMARY_NAV_ITEMS = APP_SHELL_NAV_ITEMS;

export const ACCOUNT_UTILITY_NAV_ITEMS = Object.freeze([
  {
    id: 'search',
    label: 'Global Search',
    mobileLabel: 'Search',
    path: CANONICAL_ROUTES.search,
    matchPaths: [CANONICAL_ROUTES.search],
    showInMobile: false,
    showInSidebar: false,
    disclosure: 'utility',
  },
  {
    id: 'discover',
    label: 'Discover',
    mobileLabel: 'Discover',
    path: CANONICAL_ROUTES.discover,
    matchPaths: [CANONICAL_ROUTES.discover],
    showInMobile: false,
    showInSidebar: false,
    disclosure: 'contextual',
  },
  {
    id: 'workflows',
    label: 'Workflows',
    mobileLabel: 'Flows',
    path: CANONICAL_ROUTES.workflows,
    matchPaths: [
      CANONICAL_ROUTES.workflows,
      CANONICAL_ROUTES.automation,
      CANONICAL_ROUTES.automationAnalytics,
    ],
    showInMobile: false,
    showInSidebar: false,
    disclosure: 'contextual',
  },
  {
    id: 'customer-portal',
    label: 'Customer Portal',
    mobileLabel: 'Portal',
    path: CANONICAL_ROUTES.customerPortal,
    matchPaths: [CANONICAL_ROUTES.customerPortal],
    showInMobile: false,
    showInSidebar: false,
    disclosure: 'admin',
    permission: 'MANAGE_SUBSCRIPTIONS',
  },
  {
    id: 'knowledge-hub',
    label: 'Knowledge Hub',
    mobileLabel: 'Hub',
    path: CANONICAL_ROUTES.knowledgeHub,
    matchPaths: [CANONICAL_ROUTES.knowledgeHub],
    showInMobile: false,
    showInSidebar: false,
  },
  {
    id: 'knowledge-base',
    label: 'Knowledge Base',
    mobileLabel: 'KB',
    path: CANONICAL_ROUTES.knowledgeBase,
    matchPaths: [CANONICAL_ROUTES.knowledgeBase],
    showInMobile: false,
    showInSidebar: false,
  },
  {
    id: 'marketplace',
    label: 'Marketplace',
    mobileLabel: 'Market',
    path: CANONICAL_ROUTES.marketplace,
    matchPaths: [CANONICAL_ROUTES.marketplace],
    showInMobile: false,
    showInSidebar: false,
  },
  {
    id: 'enterprise-readiness',
    label: 'Enterprise Readiness',
    mobileLabel: 'Ready',
    path: CANONICAL_ROUTES.enterpriseReadiness,
    matchPaths: [CANONICAL_ROUTES.enterpriseReadiness],
    showInMobile: false,
    showInSidebar: false,
  },
  {
    id: 'platform-admin',
    label: 'Platform Admin',
    mobileLabel: 'Admin',
    path: CANONICAL_ROUTES.platformAdmin,
    matchPaths: [CANONICAL_ROUTES.platformAdmin],
    showInMobile: false,
    showInSidebar: false,
  },
  {
    id: 'tenant-admin',
    label: 'Tenant Admin',
    mobileLabel: 'Tenant',
    path: CANONICAL_ROUTES.tenantAdmin,
    matchPaths: [CANONICAL_ROUTES.tenantAdmin],
    showInMobile: false,
    showInSidebar: false,
  },
  {
    id: 'billing',
    label: 'Billing',
    mobileLabel: 'Billing',
    path: CANONICAL_ROUTES.billing,
    matchPaths: [CANONICAL_ROUTES.billing, CANONICAL_ROUTES.usage],
    showInMobile: false,
    showInSidebar: false,
  },
  {
    id: 'notifications',
    label: 'Notifications',
    mobileLabel: 'Alerts',
    path: CANONICAL_ROUTES.notifications,
    matchPaths: [CANONICAL_ROUTES.notifications, '/notification-preferences'],
    showInMobile: false,
    showInSidebar: false,
    disclosure: 'utility',
  },
]);

export const SECONDARY_NAV_ITEMS = Object.freeze([]);

export const SOLUTIONS_SIDEBAR_NAV_ITEMS = Object.freeze([
  {
    id: 'recommendations',
    label: 'Recommendations',
    mobileLabel: 'Recs',
    path: CANONICAL_ROUTES.recommendations,
    matchPaths: [CANONICAL_ROUTES.recommendations],
    showInMobile: false,
  },
  {
    id: 'products',
    label: 'Products',
    mobileLabel: 'Products',
    path: CANONICAL_ROUTES.products,
    matchPaths: [CANONICAL_ROUTES.products, CANONICAL_ROUTES.plans],
    matchPrefixes: [`${CANONICAL_ROUTES.products}/`, `${CANONICAL_ROUTES.plans}`],
    showInMobile: false,
  },
  {
    id: 'asset-packs',
    label: 'Asset Packs',
    mobileLabel: 'Packs',
    path: CANONICAL_ROUTES.assetPacks,
    matchPaths: [CANONICAL_ROUTES.assetPacks],
    showInMobile: false,
  },
  {
    id: 'departments',
    label: 'Departments',
    mobileLabel: 'Depts',
    path: CANONICAL_ROUTES.departments,
    matchPaths: [CANONICAL_ROUTES.departments],
    showInMobile: false,
  },
  {
    id: 'department-intelligence',
    label: 'Department Intelligence',
    mobileLabel: 'Dept IQ',
    path: CANONICAL_ROUTES.departmentIntelligence,
    matchPaths: [CANONICAL_ROUTES.departmentIntelligence],
    showInMobile: false,
  },
  {
    id: 'service-lines',
    label: 'Service Lines',
    mobileLabel: 'Lines',
    path: CANONICAL_ROUTES.serviceLines,
    matchPaths: [CANONICAL_ROUTES.serviceLines],
    showInMobile: false,
  },
  {
    id: 'integration-readiness',
    label: 'Integration Readiness',
    mobileLabel: 'Integrations',
    path: CANONICAL_ROUTES.integrationReadiness,
    matchPaths: [CANONICAL_ROUTES.integrationReadiness, CANONICAL_ROUTES.integrationsMarketplace],
    showInMobile: false,
  },
  {
    id: 'solution-builder',
    label: 'Solution Builder',
    mobileLabel: 'Builder',
    path: CANONICAL_ROUTES.solutionBuilder,
    matchPaths: [CANONICAL_ROUTES.solutionBuilder],
    showInMobile: false,
  },
  {
    id: 'value-tracking',
    label: 'Value Tracking',
    mobileLabel: 'Value',
    path: CANONICAL_ROUTES.valueTracking,
    matchPaths: [CANONICAL_ROUTES.valueTracking, CANONICAL_ROUTES.outcomes],
    showInMobile: false,
  },
  {
    id: 'product-intelligence',
    label: 'Product Intelligence',
    mobileLabel: 'Product IQ',
    path: CANONICAL_ROUTES.productIntelligence,
    matchPaths: [CANONICAL_ROUTES.productIntelligence],
    showInMobile: false,
  },
  {
    id: 'expansion-opportunities',
    label: 'Expansion Opportunities',
    mobileLabel: 'Expand',
    path: CANONICAL_ROUTES.expansionOpportunities,
    matchPaths: [CANONICAL_ROUTES.expansionOpportunities],
    showInMobile: false,
  },
  {
    id: 'maturity-assessment',
    label: 'Readiness Assessment',
    mobileLabel: 'Ready',
    path: CANONICAL_ROUTES.maturityAssessment,
    matchPaths: [CANONICAL_ROUTES.maturityAssessment],
    showInMobile: false,
  },
  {
    id: 'trackmind-workspace',
    label: 'TrackMind Workspace',
    mobileLabel: 'Workspace',
    path: CANONICAL_ROUTES.trackMindWorkspace,
    matchPaths: [CANONICAL_ROUTES.trackMindWorkspace],
    showInMobile: true,
    trackMindPermission: 'trackmind.workspace.view',
  },
  {
    id: 'trackmind-maturity',
    label: 'TrackMind Maturity',
    mobileLabel: 'TrackMind',
    path: CANONICAL_ROUTES.trackMindMaturity,
    matchPaths: [CANONICAL_ROUTES.trackMindMaturity],
    showInMobile: false,
    trackMindPermission: 'trackmind.maturity.view',
  },
  {
    id: 'enterprise-platform',
    label: 'Enterprise Platform',
    mobileLabel: 'Enterprise',
    path: CANONICAL_ROUTES.enterprisePlatform,
    matchPaths: [CANONICAL_ROUTES.enterprisePlatform],
    showInMobile: false,
    trackMindPermission: 'trackmind.enterprise.view',
  },
  {
    id: 'platform-intelligence',
    label: 'Platform Intelligence',
    mobileLabel: 'Intel',
    path: CANONICAL_ROUTES.platformIntelligence,
    matchPaths: [CANONICAL_ROUTES.platformIntelligence],
    showInMobile: false,
    trackMindPermission: 'trackmind.intelligence.view',
  },
  {
    id: 'customer-success',
    label: 'Success Center',
    mobileLabel: 'Success',
    path: CANONICAL_ROUTES.successCenter,
    matchPaths: [CANONICAL_ROUTES.customerSuccess, CANONICAL_ROUTES.successCenter],
    showInMobile: false,
  },
  {
    id: 'specialties',
    label: 'Specialties',
    mobileLabel: 'Specialty',
    path: CANONICAL_ROUTES.specialties,
    matchPaths: [CANONICAL_ROUTES.specialties],
    matchPrefixes: [`${CANONICAL_ROUTES.specialties}/`],
    showInMobile: false,
  },
  {
    id: 'care-pathways',
    label: 'Pathways',
    mobileLabel: 'Path',
    path: CANONICAL_ROUTES.carePathways,
    matchPaths: [CANONICAL_ROUTES.carePathways],
    matchPrefixes: [`${CANONICAL_ROUTES.carePathways}/`],
    showInMobile: false,
  },
  {
    id: 'agents',
    label: 'AI Agents',
    mobileLabel: 'Agents',
    path: CANONICAL_ROUTES.agents,
    matchPaths: [CANONICAL_ROUTES.agents],
    showInMobile: false,
  },
]);

export const OPERATIONS_SIDEBAR_NAV_ITEMS = Object.freeze([
  {
    id: 'workflow-mining',
    label: 'Workflow Mining',
    mobileLabel: 'Journeys',
    path: CANONICAL_ROUTES.workflowMining,
    matchPaths: [CANONICAL_ROUTES.workflowMining],
    showInMobile: false,
  },
  {
    id: 'workspace-dependency-graph',
    label: 'Workspace Graph',
    mobileLabel: 'Graph',
    path: CANONICAL_ROUTES.workspaceDependencyGraph,
    matchPaths: [CANONICAL_ROUTES.workspaceDependencyGraph],
    showInMobile: false,
  },
  {
    id: 'digital-twin-intelligence',
    label: 'Twin Intelligence',
    mobileLabel: 'Twin AI',
    path: CANONICAL_ROUTES.digitalTwinIntelligence,
    matchPaths: [CANONICAL_ROUTES.digitalTwinIntelligence],
    matchPrefixes: [`${CANONICAL_ROUTES.digitalTwinIntelligence}/`],
    showInMobile: false,
  },
  {
    id: 'digital-twin',
    label: 'Digital Twin',
    mobileLabel: 'Twin',
    path: CANONICAL_ROUTES.digitalTwin,
    matchPaths: [CANONICAL_ROUTES.digitalTwin],
    matchPrefixes: [`${CANONICAL_ROUTES.digitalTwin}/`],
    showInMobile: false,
  },
  {
    id: 'hospital-map',
    label: 'Hospital Map',
    mobileLabel: 'Map',
    path: CANONICAL_ROUTES.hospitalMap,
    matchPaths: [CANONICAL_ROUTES.hospitalMap],
    matchPrefixes: [`${CANONICAL_ROUTES.hospitalMap}/`],
  },
  {
    id: 'medical-iot',
    label: 'Medical IoT',
    mobileLabel: 'IoT',
    path: CANONICAL_ROUTES.medicalIot,
    matchPaths: [CANONICAL_ROUTES.medicalIot],
    showInMobile: false,
  },
  {
    id: 'devices',
    label: 'Devices',
    mobileLabel: 'Devices',
    path: CANONICAL_ROUTES.devices,
    matchPaths: [CANONICAL_ROUTES.devices],
    showInMobile: false,
  },
  {
    id: 'fleet',
    label: 'Fleet Map',
    mobileLabel: 'Fleet',
    path: CANONICAL_ROUTES.fleetMap,
    legacyPaths: [...FLEET_MAP_ROUTE_ALIASES],
    matchPaths: [
      CANONICAL_ROUTES.fleetMap,
      CANONICAL_ROUTES.fleetCommand,
      ...FLEET_MAP_ROUTE_ALIASES,
    ],
    matchPrefixes: ['/fleet/'],
    showInMobile: false,
  },
  {
    id: 'live-map',
    label: 'Live Map',
    mobileLabel: 'Live',
    path: CANONICAL_ROUTES.liveMap,
    legacyPaths: [...LIVE_MAP_ROUTE_ALIASES],
    matchPaths: [CANONICAL_ROUTES.liveMap, ...LIVE_MAP_ROUTE_ALIASES],
    showInMobile: false,
  },
  {
    id: 'usage',
    label: 'Usage',
    mobileLabel: 'Usage',
    path: CANONICAL_ROUTES.usage,
    matchPaths: [CANONICAL_ROUTES.usage],
    permission: 'VIEW_ANALYTICS',
    showInMobile: false,
  },
]);

export const ADVANCED_SIDEBAR_NAV_ITEMS = Object.freeze([
  {
    id: 'organization',
    label: 'Organization',
    mobileLabel: 'Org',
    path: CANONICAL_ROUTES.organization,
    matchPaths: [
      CANONICAL_ROUTES.organization,
      CANONICAL_ROUTES.organizationSettings,
      CANONICAL_ROUTES.organizationPacks,
      CANONICAL_ROUTES.organizationAssets,
      CANONICAL_ROUTES.organizationIntelligence,
    ],
    matchPrefixes: ['/organization/', '/settings/organization/'],
    permission: 'MANAGE_ORGANIZATION',
    showInMobile: false,
  },
  {
    id: 'executive',
    label: 'Executive',
    mobileLabel: 'Exec',
    path: CANONICAL_ROUTES.executive,
    matchPaths: [CANONICAL_ROUTES.executive],
    permission: 'VIEW_ANALYTICS',
    showInMobile: false,
  },
  {
    id: 'configuration-studio',
    label: 'Configuration Studio',
    mobileLabel: 'Config',
    path: CANONICAL_ROUTES.configurationStudio,
    matchPaths: [CANONICAL_ROUTES.configurationStudio],
    permission: 'CONFIGURE_SYSTEM',
    showInMobile: false,
  },
  {
    id: 'developer-audit',
    label: 'Developer Catalog',
    mobileLabel: 'Dev',
    path: CANONICAL_ROUTES.developerCatalog,
    matchPaths: [CANONICAL_ROUTES.developerCatalog],
    permission: 'CONFIGURE_SYSTEM',
    showInMobile: false,
  },
  {
    id: 'system-health',
    label: 'System Health',
    mobileLabel: 'Health',
    path: CANONICAL_ROUTES.systemHealth,
    matchPaths: [CANONICAL_ROUTES.systemHealth],
    permission: ['VIEW_OPERATIONS', 'VIEW_OBSERVABILITY'],
    requireAllPermissions: true,
    showInMobile: false,
  },
  {
    id: 'saas-health',
    label: 'SaaS Health',
    mobileLabel: 'SaaS',
    path: CANONICAL_ROUTES.saasHealth,
    matchPaths: [CANONICAL_ROUTES.saasHealth],
    permission: ['VIEW_OPERATIONS', 'VIEW_OBSERVABILITY'],
    requireAllPermissions: true,
    showInMobile: false,
  },
  {
    id: 'feature-flags',
    label: 'Feature Flags',
    mobileLabel: 'Flags',
    path: CANONICAL_ROUTES.featureFlags,
    matchPaths: [CANONICAL_ROUTES.featureFlags],
    permission: 'CONFIGURE_SYSTEM',
    showInMobile: false,
  },
  {
    id: 'plugins',
    label: 'Plugins',
    mobileLabel: 'Plugins',
    path: CANONICAL_ROUTES.plugins,
    matchPaths: [CANONICAL_ROUTES.plugins],
    permission: 'CONFIGURE_SYSTEM',
    showInMobile: false,
  },
  {
    id: 'dependency-map',
    label: 'Dependency Map',
    mobileLabel: 'Deps',
    path: CANONICAL_ROUTES.dependencyMap,
    matchPaths: [CANONICAL_ROUTES.dependencyMap],
    permission: 'CONFIGURE_SYSTEM',
    showInMobile: false,
  },
  {
    id: 'dependency-graph',
    label: 'Dependency Graph',
    mobileLabel: 'Graph',
    path: CANONICAL_ROUTES.dependencyGraph,
    matchPaths: [CANONICAL_ROUTES.dependencyGraph],
    permission: 'CONFIGURE_SYSTEM',
    showInMobile: false,
  },
  {
    id: 'governance-registry',
    label: 'Governance Registry',
    mobileLabel: 'Registry',
    path: CANONICAL_ROUTES.governanceRegistry,
    matchPaths: [CANONICAL_ROUTES.governanceRegistry],
    permission: 'VIEW_GOVERNANCE',
    showInMobile: false,
  },
  {
    id: 'data-lineage',
    label: 'Data Lineage',
    mobileLabel: 'Lineage',
    path: CANONICAL_ROUTES.dataLineage,
    matchPaths: [CANONICAL_ROUTES.dataLineage],
    permission: 'VIEW_AUDIT_LOGS',
    showInMobile: false,
  },
  {
    id: 'self-diagnostics',
    label: 'Self Diagnostics',
    mobileLabel: 'Diag',
    path: CANONICAL_ROUTES.selfDiagnostics,
    matchPaths: [CANONICAL_ROUTES.selfDiagnostics],
    permission: ['VIEW_OPERATIONS', 'VIEW_OBSERVABILITY'],
    requireAllPermissions: true,
    showInMobile: false,
  },
  {
    id: 'platform-learning-engine',
    label: 'Learning Engine',
    mobileLabel: 'Learn',
    path: CANONICAL_ROUTES.platformLearningEngine,
    matchPaths: [CANONICAL_ROUTES.platformLearningEngine],
    permission: 'VIEW_ANALYTICS',
    showInMobile: false,
  },
  {
    id: 'brain',
    label: 'Brain',
    mobileLabel: 'Brain',
    path: CANONICAL_ROUTES.brain,
    matchPaths: [CANONICAL_ROUTES.brain],
    permission: 'VIEW_ANALYTICS',
    showInMobile: false,
  },
  {
    id: 'business-brain',
    label: 'Business Brain',
    mobileLabel: 'Biz Brain',
    path: CANONICAL_ROUTES.businessBrain,
    matchPaths: [CANONICAL_ROUTES.businessBrain],
    permission: 'VIEW_ANALYTICS',
    showInMobile: false,
  },
  {
    id: 'ai-evaluation',
    label: 'AI Evaluation',
    mobileLabel: 'Eval',
    path: CANONICAL_ROUTES.aiEvaluation,
    matchPaths: [CANONICAL_ROUTES.aiEvaluation, '/ai/evaluation'],
    permission: 'VIEW_ANALYTICS',
    showInMobile: false,
  },
  {
    id: 'governance',
    label: 'Governance',
    mobileLabel: 'Gov',
    path: CANONICAL_ROUTES.emergencyAiGovernance,
    matchPaths: [
      '/governance',
      '/governance/ai',
      '/governance/model-usage',
      '/governance/costs',
      '/governance/clinical-safety',
      '/governance/consent',
      '/governance/privacy',
      CANONICAL_ROUTES.emergencyAiGovernance,
      CANONICAL_ROUTES.aiGovernance,
      '/privacy',
    ],
    permission: 'VIEW_GOVERNANCE',
    showInMobile: false,
  },
  {
    id: 'security',
    label: 'Security',
    mobileLabel: 'Sec',
    path: CANONICAL_ROUTES.security,
    matchPaths: [
      CANONICAL_ROUTES.security,
      '/governance/ai-security',
      '/governance/ai-security/policy',
      '/governance/ai-security/model-access',
      '/governance/ai-security/incidents',
    ],
    permission: 'VIEW_AI_SECURITY',
    showInMobile: false,
  },
  {
    id: 'audit',
    label: 'Audit',
    mobileLabel: 'Audit',
    path: CANONICAL_ROUTES.audit,
    matchPaths: [
      CANONICAL_ROUTES.audit,
      '/audit-logs',
      '/audit/ai',
      '/audit/phi',
      '/audit/integrations',
      '/audit/policy',
    ],
    permission: 'VIEW_AUDIT_LOGS',
    showInMobile: false,
  },
  {
    id: 'regulatory',
    label: 'Regulatory',
    mobileLabel: 'Reg',
    path: CANONICAL_ROUTES.regulatory,
    matchPaths: [
      CANONICAL_ROUTES.regulatory,
      '/governance/regulatory',
      '/governance/regulatory/capabilities',
      '/governance/regulatory/intended-use',
      '/governance/regulatory/evidence',
    ],
    permission: 'VIEW_REGULATORY',
    showInMobile: false,
  },
  {
    id: 'assets',
    label: 'Assets',
    mobileLabel: 'Assets',
    path: CANONICAL_ROUTES.assets,
    matchPaths: [CANONICAL_ROUTES.assets],
    matchPrefixes: [`${CANONICAL_ROUTES.assets}/`],
    showInMobile: false,
  },
]);

export const PRIMARY_NAV_BY_ID = Object.freeze(
  Object.fromEntries(
    [
      ...PRIMARY_NAV_ITEMS,
      ...SECONDARY_NAV_ITEMS,
      ...SOLUTIONS_SIDEBAR_NAV_ITEMS,
      ...OPERATIONS_SIDEBAR_NAV_ITEMS,
      ...ADVANCED_SIDEBAR_NAV_ITEMS,
      ...ACCOUNT_UTILITY_NAV_ITEMS,
    ].map((item) => [item.id, item])
  )
);

export const PRIMARY_SIDEBAR_NAV_ITEMS = Object.freeze(
  PRIMARY_NAV_ITEMS.filter((item) => (item as any).showInSidebar !== false)
);

export const PRIMARY_MOBILE_NAV_ITEMS = Object.freeze(
  PRIMARY_SIDEBAR_NAV_ITEMS.filter((item) => (item as any).showInMobile !== false)
);

const NORMAL_PRIMARY_NAV_IDS = new Set([
  ...APP_SHELL_NAV_ITEMS.map((item) => item.id),
]);
const UTILITY_NAV_IDS = new Set(['search', 'notifications']);
const ADMIN_NAV_PERMISSION_BY_ID = Object.freeze({
  'customer-portal': ['MANAGE_SUBSCRIPTIONS'],
  'enterprise-readiness': ['VIEW_ANALYTICS'],
  'platform-admin': ['CONFIGURE_SYSTEM', 'MANAGE_USERS'],
  'tenant-admin': ['MANAGE_USERS', 'MANAGE_ORGANIZATION'],
  billing: ['MANAGE_SUBSCRIPTIONS'],
});

function normalizePermissionList(permission) {
  if (!permission) return [];
  return Array.isArray(permission) ? permission : [permission];
}

function hasRequiredPermission(item, permissionSet) {
  const permissions = normalizePermissionList(item.permission);
  if (!permissions.length) return true;
  if (item.requireAllPermissions) {
    return permissions.every((permission) => permissionSet.has(permission));
  }
  return permissions.some((permission) => permissionSet.has(permission));
}

export function canExposeNavigationItem(
  item,
  { permissions = [] as any[], includeContextual = false, relevantDestinationIds = [] as any[] }: any = {}
) {
  if (!item?.id || !item.path) return false;
  const permissionSet = new Set(permissions || []);
  const relevantIds = new Set(relevantDestinationIds || []);
  if (!hasRequiredPermission(item, permissionSet)) return false;

  if (NORMAL_PRIMARY_NAV_IDS.has(item.id) || UTILITY_NAV_IDS.has(item.id)) return true;
  if (item.id === 'settings') return false;

  const adminPermissions = ADMIN_NAV_PERMISSION_BY_ID[item.id];
  if (adminPermissions) {
    return adminPermissions.some((permission) => permissionSet.has(permission));
  }

  if (relevantIds.has(item.id)) return true;
  return includeContextual && item.disclosure !== 'admin';
}

function uniqueNavItemsByPath(items) {
  const seen = new Set();
  return items.filter((item) => {
    if (!item.path || seen.has(item.path)) return false;
    seen.add(item.path);
    return true;
  });
}

function quickCommandDestinationFromAppShellItem(item) {
  return Object.freeze({
    id: item.id,
    label: item.label,
    mobileLabel: item.mobileLabel,
    path: item.path,
    matchPaths: item.matchPaths || item.activePaths || [item.path],
  });
}

export const QUICK_COMMAND_NAV_ITEMS = Object.freeze(
  APP_SHELL_NAV_ITEMS.map(quickCommandDestinationFromAppShellItem)
);
export const QUICK_COMMAND_DESTINATION_ITEMS = QUICK_COMMAND_NAV_ITEMS;

export function primaryNavPathMatches(item, pathname) {
  const normalized = pathname || '/';
  if (item.excludePrefixes?.some((prefix) => normalized.startsWith(prefix))) {
    return false;
  }
  if (item.path === normalized) return true;
  if (item.matchPaths?.includes(normalized)) return true;
  return Boolean(item.matchPrefixes?.some((prefix) => normalized.startsWith(prefix)));
}

export function getPrimaryNavItemForPath(pathname) {
  return (
    PRIMARY_NAV_ITEMS.find((item) => primaryNavPathMatches(item, pathname)) ||
    SECONDARY_NAV_ITEMS.find((item) => primaryNavPathMatches(item, pathname)) ||
    SOLUTIONS_SIDEBAR_NAV_ITEMS.find((item) => primaryNavPathMatches(item, pathname)) ||
    OPERATIONS_SIDEBAR_NAV_ITEMS.find((item) => primaryNavPathMatches(item, pathname)) ||
    ADVANCED_SIDEBAR_NAV_ITEMS.find((item) => primaryNavPathMatches(item, pathname)) ||
    ACCOUNT_UTILITY_NAV_ITEMS.find((item) => primaryNavPathMatches(item, pathname)) ||
    null
  );
}

/** Canonical sidebar builder — filters APP_SHELL_NAV_ITEMS by feature gate. */
export function buildSidebarItems(isEnabled) {
  return APP_SHELL_NAV_ITEMS.map((item) => {
    const feature = FEATURE_REGISTRY_BY_ID[item.featureId];
    if (item.featureGate && (!feature || !isEnabled(feature.id))) return null;
    return {
      id: item.id,
      featureId: item.featureId,
      label: item.label,
      path: item.path,
      icon: null,
      activePaths: item.activePaths,
      tier: feature?.tier || 'core',
    };
  }).filter(Boolean);
}
