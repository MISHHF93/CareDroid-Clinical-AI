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
    mobileLabel: 'Dash',
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
    matchPaths: ['/tools', '/all-tools', '/clinical-tools'],
    matchPrefixes: ['/tools/'],
    excludePrefixes: [
      '/tools/calculators',
      '/tools/patient-summary-ai',
      '/tools/timeline-ai',
      '/tools/ambient-scribe',
      '/tools/order-set-ai',
      '/tools/clinical-audit',
      '/tools/catalog',
    ],
  },
  {
    id: 'calculators',
    label: 'Calculators',
    mobileLabel: 'Calcs',
    path: '/tools/calculators',
    matchPaths: ['/tools/calculators', '/calculators'],
    matchPrefixes: ['/tools/calculators/'],
  },
  {
    id: 'hospital-map',
    label: 'Hospital Map',
    mobileLabel: 'Map',
    path: '/hospital-map',
    legacyPaths: ['/maps', '/tracking', '/live-tracking'],
    matchPaths: ['/hospital-map', '/live-map', '/maps', '/tracking', '/live-tracking'],
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
    id: 'fleet',
    label: 'Fleet',
    mobileLabel: 'Fleet',
    path: '/fleet/map',
    legacyPaths: ['/fleet', '/fleet/live-map', '/fleet/tracking'],
    matchPaths: ['/fleet', '/fleet/map', '/fleet/command', '/fleet/live-map', '/fleet/tracking'],
    matchPrefixes: ['/fleet/'],
    showInMobile: false,
  },
  {
    id: 'profile',
    label: 'Profile',
    mobileLabel: 'Profile',
    path: '/profile',
    matchPaths: ['/profile', '/profile/activity', '/profile/workspaces', '/profile/security'],
    showInMobile: false,
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
      '/team',
      '/consent',
      '/consent-history',
      '/two-factor-setup',
      '/biometric-setup',
      '/onboarding',
    ],
    showInMobile: false,
  },
]);

export const ADVANCED_SIDEBAR_NAV_ITEMS = Object.freeze([
  {
    id: 'developer-audit',
    label: 'Developer Catalog / Source Audit',
    mobileLabel: 'Dev',
    path: '/tools/catalog',
    matchPaths: ['/tools/catalog', '/catalog'],
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
      '/security',
      '/privacy',
      '/regulatory',
      '/human-review',
    ],
    permission: 'VIEW_GOVERNANCE',
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
  Object.fromEntries([...PRIMARY_NAV_ITEMS, ...ADVANCED_SIDEBAR_NAV_ITEMS].map((item) => [item.id, item]))
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
  ...ADVANCED_SIDEBAR_NAV_ITEMS,
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
    ADVANCED_SIDEBAR_NAV_ITEMS.find((item) => primaryNavPathMatches(item, pathname)) ||
    null
  );
}
