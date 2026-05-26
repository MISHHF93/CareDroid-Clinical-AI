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
    label: 'Assistant',
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
    id: 'artifacts',
    label: 'Artifacts',
    mobileLabel: 'Artifacts',
    path: '/artifacts',
    matchPaths: ['/artifacts'],
    showInMobile: false,
  },
  {
    id: 'memory',
    label: 'Memory',
    mobileLabel: 'Memory',
    path: '/ai-memory',
    legacyPaths: ['/memory'],
    matchPaths: ['/ai-memory', '/memory'],
    showInMobile: false,
  },
  {
    id: 'training',
    label: 'Training',
    mobileLabel: 'Train',
    path: '/training',
    matchPaths: ['/training'],
    permission: 'VIEW_ANALYTICS',
    showInMobile: false,
  },
  {
    id: 'operations',
    label: 'Operations',
    mobileLabel: 'Ops',
    path: '/operations',
    legacyPaths: ['/fleet'],
    matchPaths: [
      '/operations',
      '/fleet',
      '/devices',
      '/live-map',
      '/hospital-map',
      '/medical-iot',
      '/clinical/alerts',
      '/analytics',
      '/costs',
      '/audit-logs',
    ],
    matchPrefixes: ['/fleet/'],
  },
  {
    id: 'integrations',
    label: 'Integrations',
    mobileLabel: 'FHIR',
    path: '/integrations',
    matchPaths: ['/integrations', '/integrations/fhir', '/integrations/hl7'],
    permission: 'CONFIGURE_SYSTEM',
    showInMobile: false,
  },
  {
    id: 'governance',
    label: 'Governance',
    mobileLabel: 'Gov',
    path: '/governance',
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
    ],
    permission: 'VIEW_AUDIT_LOGS',
    showInMobile: false,
  },
  {
    id: 'maps',
    label: 'Maps',
    mobileLabel: 'Maps',
    path: '/live-map',
    legacyPaths: ['/maps', '/tracking', '/live-tracking'],
    matchPaths: ['/live-map', '/hospital-map', '/maps', '/tracking', '/live-tracking'],
    matchPrefixes: ['/hospital-map/', '/fleet/map', '/fleet/live-map', '/fleet/tracking'],
    showInSidebar: false,
    showInMobile: false,
  },
  {
    id: 'medical-iot',
    label: 'Medical IoT',
    mobileLabel: 'IoT',
    path: '/medical-iot',
    matchPaths: ['/medical-iot'],
    showInSidebar: false,
    showInMobile: false,
  },
  {
    id: 'developer-audit',
    label: 'Developer Audit',
    mobileLabel: 'Audit',
    path: '/tools/catalog',
    matchPaths: ['/tools/catalog', '/catalog'],
    permission: 'CONFIGURE_SYSTEM',
    showInMobile: false,
  },
  {
    id: 'settings',
    label: 'Settings',
    mobileLabel: 'Settings',
    path: '/settings',
    matchPaths: [
      '/settings',
      '/profile',
      '/profile/settings',
      '/profile/activity',
      '/profile/preferences',
      '/profile/workspaces',
      '/profile/security',
      '/profile-settings',
      '/notifications',
      '/team',
      '/consent',
      '/consent-history',
      '/two-factor-setup',
      '/biometric-setup',
      '/onboarding',
    ],
  },
]);

export const PRIMARY_NAV_BY_ID = Object.freeze(
  Object.fromEntries(PRIMARY_NAV_ITEMS.map((item) => [item.id, item]))
);

export const PRIMARY_SIDEBAR_NAV_ITEMS = Object.freeze(
  PRIMARY_NAV_ITEMS.filter((item) => item.showInSidebar !== false)
);

export const PRIMARY_MOBILE_NAV_ITEMS = Object.freeze(
  PRIMARY_SIDEBAR_NAV_ITEMS.filter((item) => item.showInMobile !== false)
);

export const QUICK_COMMAND_NAV_ITEMS = PRIMARY_SIDEBAR_NAV_ITEMS;

export function primaryNavPathMatches(item, pathname) {
  const normalized = pathname || '/';
  if (item.excludePrefixes?.some((prefix) => normalized.startsWith(prefix))) {
    return false;
  }
  if (item.matchPaths?.includes(normalized)) return true;
  return Boolean(item.matchPrefixes?.some((prefix) => normalized.startsWith(prefix)));
}

export function getPrimaryNavItemForPath(pathname) {
  return PRIMARY_NAV_ITEMS.find((item) => primaryNavPathMatches(item, pathname)) || null;
}
