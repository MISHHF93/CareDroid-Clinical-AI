/**
 * Primary clinical operating system navigation.
 *
 * Existing deep links remain valid; these items define the simplified visible IA
 * used by the shell while route modules keep legacy paths working underneath.
 */
export const PRIMARY_NAV_ITEMS = Object.freeze([
  {
    id: 'home',
    label: 'Dashboard',
    mobileLabel: 'Dashboard',
    path: '/dashboard',
    legacyPaths: ['/home'],
    matchPaths: ['/home', '/dashboard'],
  },
  {
    id: 'assistant',
    label: 'AI Assistant',
    mobileLabel: 'AI',
    path: '/assistant',
    legacyPaths: ['/chat', '/ai', '/copilot'],
    matchPaths: ['/assistant', '/chat', '/ai', '/copilot'],
  },
  {
    id: 'tools',
    label: 'Tools',
    mobileLabel: 'Tools',
    path: '/tools',
    legacyPaths: ['/all-tools', '/clinical-tools'],
    matchPaths: ['/tools', '/all-tools', '/clinical-tools', '/calculators'],
    matchPrefixes: ['/tools/'],
    excludePrefixes: ['/tools/catalog'],
  },
  {
    id: 'profile',
    label: 'Profile',
    mobileLabel: 'Profile',
    path: '/profile',
    matchPaths: ['/profile', '/profile/activity', '/profile/tool-preferences', '/profile/workspaces', '/profile/security'],
  },
  {
    id: 'settings',
    label: 'Settings',
    mobileLabel: 'Settings',
    path: '/settings',
    matchPaths: [
      '/settings',
      '/profile/settings',
      '/profile/preferences',
      '/profile-settings',
      '/notifications',
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
    path: '/digital-twin',
    matchPaths: ['/digital-twin'],
    matchPrefixes: ['/digital-twin/'],
    showInMobile: false,
  },
  {
    id: 'live-map',
    label: 'Live Map',
    mobileLabel: 'Live',
    path: '/live-map',
    legacyPaths: ['/maps', '/tracking', '/live-tracking'],
    matchPaths: ['/live-map', '/maps', '/tracking', '/live-tracking'],
    showInMobile: false,
  },
  {
    id: 'hospital-map',
    label: 'Hospital Map',
    mobileLabel: 'Map',
    path: '/hospital-map',
    matchPaths: ['/hospital-map'],
    matchPrefixes: ['/hospital-map/'],
  },
  {
    id: 'medical-iot',
    label: 'Medical IoT',
    mobileLabel: 'IoT',
    path: '/medical-iot',
    matchPaths: ['/medical-iot'],
    showInMobile: false,
  },
  {
    id: 'devices',
    label: 'Devices',
    mobileLabel: 'Devices',
    path: '/devices',
    matchPaths: ['/devices'],
    showInMobile: false,
  },
  {
    id: 'fleet',
    label: 'Fleet',
    mobileLabel: 'Fleet',
    path: '/fleet/map',
    legacyPaths: ['/fleet', '/fleet/live-map', '/fleet/tracking'],
    matchPaths: ['/fleet', '/fleet/map', '/fleet/command', '/fleet/live-map', '/fleet/tracking'],
    matchPrefixes: ['/fleet/'],
    showInMobile: false,
  },
]);

export const ADVANCED_SIDEBAR_NAV_ITEMS = Object.freeze([
  {
    id: 'developer-audit',
    label: 'Developer Catalog',
    mobileLabel: 'Dev',
    path: '/tools/catalog',
    matchPaths: ['/tools/catalog'],
    permission: 'CONFIGURE_SYSTEM',
    showInMobile: false,
  },
  {
    id: 'system-health',
    label: 'System Health',
    mobileLabel: 'Health',
    path: '/system-health',
    matchPaths: ['/system-health', '/operations/service-health'],
    permission: ['VIEW_OPERATIONS', 'VIEW_OBSERVABILITY'],
    requireAllPermissions: true,
    showInMobile: false,
  },
  {
    id: 'governance',
    label: 'Governance',
    mobileLabel: 'Gov',
    path: '/ai-governance',
    matchPaths: [
      '/governance',
      '/governance/ai',
      '/governance/model-usage',
      '/governance/costs',
      '/governance/clinical-safety',
      '/governance/consent',
      '/governance/privacy',
      '/ai-governance',
      '/privacy',
      '/regulatory',
      '/human-review',
    ],
    permission: 'VIEW_GOVERNANCE',
    showInMobile: false,
  },
  {
    id: 'security',
    label: 'Security',
    mobileLabel: 'Sec',
    path: '/security',
    matchPaths: [
      '/security',
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
    label: 'Audit Logs',
    mobileLabel: 'Audit',
    path: '/audit-logs',
    matchPaths: ['/audit', '/audit-logs', '/audit/ai', '/audit/phi', '/audit/integrations', '/audit/policy'],
    permission: 'VIEW_AUDIT_LOGS',
    showInMobile: false,
  },
]);

export const PRIMARY_NAV_BY_ID = Object.freeze(
  Object.fromEntries(
    [...PRIMARY_NAV_ITEMS, ...OPERATIONS_SIDEBAR_NAV_ITEMS, ...ADVANCED_SIDEBAR_NAV_ITEMS].map((item) => [
      item.id,
      item,
    ])
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
