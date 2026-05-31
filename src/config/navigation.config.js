/**
 * Canonical clinical operating system navigation.
 *
 * Sidebar/drawer and quick command destinations consume this module directly.
 * `navigation/primaryNavigation.js` is now a compatibility re-export.
 */
import { CANONICAL_ROUTES } from './routes.config';

export const PRIMARY_NAV_ITEMS = Object.freeze([
  {
    id: 'home',
    label: 'Dashboard',
    mobileLabel: 'Dashboard',
    path: CANONICAL_ROUTES.dashboard,
    legacyPaths: ['/home'],
    matchPaths: ['/home', CANONICAL_ROUTES.dashboard],
  },
  {
    id: 'assistant',
    label: 'Assistant',
    mobileLabel: 'AI',
    path: CANONICAL_ROUTES.assistant,
    legacyPaths: ['/chat', '/ai', '/copilot'],
    matchPaths: [CANONICAL_ROUTES.assistant, '/chat', '/ai', '/copilot'],
  },
  {
    id: 'tools',
    label: 'Tools',
    mobileLabel: 'Tools',
    path: CANONICAL_ROUTES.tools,
    legacyPaths: ['/all-tools', '/clinical-tools', '/catalog'],
    matchPaths: [
      CANONICAL_ROUTES.tools,
      '/all-tools',
      '/clinical-tools',
      '/catalog',
      '/calculators',
      CANONICAL_ROUTES.protocols,
      CANONICAL_ROUTES.research,
      CANONICAL_ROUTES.documentation,
      CANONICAL_ROUTES.knowledgeGraph,
      CANONICAL_ROUTES.predictiveAnalytics,
      CANONICAL_ROUTES.clinicalDecisionSupport,
      CANONICAL_ROUTES.competencies,
      CANONICAL_ROUTES.credentials,
      CANONICAL_ROUTES.simulation,
      CANONICAL_ROUTES.simulationOutcomes,
      CANONICAL_ROUTES.laboratory,
      CANONICAL_ROUTES.medical3dViewer,
      '/medical-simulation',
      '/lab',
      '/anatomy-viewer',
    ],
    matchPrefixes: [`${CANONICAL_ROUTES.tools}/`, `${CANONICAL_ROUTES.simulation}/`],
    excludePrefixes: [CANONICAL_ROUTES.developerCatalog],
  },
  {
    id: 'operations',
    label: 'Operations',
    mobileLabel: 'Ops',
    path: CANONICAL_ROUTES.operations,
    matchPaths: [CANONICAL_ROUTES.operations, CANONICAL_ROUTES.operationsCenter],
  },
  {
    id: 'profile',
    label: 'Profile',
    mobileLabel: 'Profile',
    path: CANONICAL_ROUTES.profile,
    matchPaths: [
      CANONICAL_ROUTES.profile,
      '/profile/activity',
      CANONICAL_ROUTES.profileToolPreferences,
      '/profile/workspaces',
      '/profile/security',
    ],
  },
  {
    id: 'settings',
    label: 'Settings',
    mobileLabel: 'Settings',
    path: CANONICAL_ROUTES.settings,
    matchPaths: [
      CANONICAL_ROUTES.settings,
      CANONICAL_ROUTES.profileSettings,
      '/profile/preferences',
      '/profile-settings',
      CANONICAL_ROUTES.notifications,
      '/notification-preferences',
      '/team',
      '/consent',
      '/consent-history',
      '/two-factor-setup',
      '/biometric-setup',
      '/onboarding',
    ],
  },
]);

export const OPERATIONS_SIDEBAR_NAV_ITEMS = Object.freeze([
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
    legacyPaths: ['/fleet', '/fleet/live-map', '/fleet/tracking'],
    matchPaths: [
      '/fleet',
      CANONICAL_ROUTES.fleetMap,
      '/fleet/command',
      '/fleet/live-map',
      '/fleet/tracking',
    ],
    matchPrefixes: ['/fleet/'],
    showInMobile: false,
  },
  {
    id: 'live-map',
    label: 'Live Map',
    mobileLabel: 'Live',
    path: CANONICAL_ROUTES.liveMap,
    legacyPaths: ['/maps', '/tracking', '/live-tracking'],
    matchPaths: [CANONICAL_ROUTES.liveMap, '/maps', '/tracking', '/live-tracking'],
    showInMobile: false,
  },
]);

export const ADVANCED_SIDEBAR_NAV_ITEMS = Object.freeze([
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
    matchPaths: [CANONICAL_ROUTES.systemHealth, '/operations/service-health'],
    permission: ['VIEW_OPERATIONS', 'VIEW_OBSERVABILITY'],
    requireAllPermissions: true,
    showInMobile: false,
  },
  {
    id: 'governance',
    label: 'Governance',
    mobileLabel: 'Gov',
    path: CANONICAL_ROUTES.aiGovernance,
    matchPaths: [
      '/governance',
      '/governance/ai',
      '/governance/model-usage',
      '/governance/costs',
      '/governance/clinical-safety',
      '/governance/consent',
      '/governance/privacy',
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
    [...PRIMARY_NAV_ITEMS, ...OPERATIONS_SIDEBAR_NAV_ITEMS, ...ADVANCED_SIDEBAR_NAV_ITEMS].map(
      (item) => [item.id, item]
    )
  )
);

export const PRIMARY_SIDEBAR_NAV_ITEMS = Object.freeze(
  PRIMARY_NAV_ITEMS.filter((item) => item.showInSidebar !== false)
);

export const PRIMARY_MOBILE_NAV_ITEMS = Object.freeze(
  PRIMARY_SIDEBAR_NAV_ITEMS.filter((item) => item.showInMobile !== false)
);

export const QUICK_COMMAND_NAV_ITEMS = PRIMARY_SIDEBAR_NAV_ITEMS;
export const QUICK_COMMAND_DESTINATION_ITEMS = Object.freeze([
  ...PRIMARY_SIDEBAR_NAV_ITEMS,
  ...OPERATIONS_SIDEBAR_NAV_ITEMS,
  ...ADVANCED_SIDEBAR_NAV_ITEMS,
  {
    id: 'workspace',
    label: 'Workspace',
    mobileLabel: 'Work',
    path: '/workspaces',
    matchPaths: ['/workspaces', '/workspace', '/workspace/clinical'],
    matchPrefixes: ['/workspace/'],
  },
]);

export function primaryNavPathMatches(item, pathname) {
  const normalized = pathname || '/';
  if (item.excludePrefixes?.some((prefix) => normalized.startsWith(prefix))) {
    return false;
  }
  if (item.matchPaths?.includes(normalized)) return true;
  return Boolean(item.matchPrefixes?.some((prefix) => normalized.startsWith(prefix)));
}

export function getPrimaryNavItemForPath(pathname) {
  return (
    PRIMARY_NAV_ITEMS.find((item) => primaryNavPathMatches(item, pathname)) ||
    OPERATIONS_SIDEBAR_NAV_ITEMS.find((item) => primaryNavPathMatches(item, pathname)) ||
    ADVANCED_SIDEBAR_NAV_ITEMS.find((item) => primaryNavPathMatches(item, pathname)) ||
    null
  );
}
