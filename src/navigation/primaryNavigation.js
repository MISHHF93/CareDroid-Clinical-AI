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
      '/tools/patient-summary-ai',
      '/tools/timeline-ai',
      '/tools/ambient-scribe',
      '/tools/order-set-ai',
      '/tools/clinical-audit',
    ],
  },
  {
    id: 'patients',
    label: 'Patients',
    mobileLabel: 'Patients',
    path: '/patients',
    matchPaths: ['/patients'],
    matchPrefixes: [
      '/tools/patient-summary-ai',
      '/tools/timeline-ai',
      '/tools/ambient-scribe',
      '/tools/order-set-ai',
    ],
  },
  {
    id: 'operations',
    label: 'Operations',
    mobileLabel: 'Ops',
    path: '/operations',
    legacyPaths: ['/fleet'],
    matchPaths: ['/operations', '/fleet', '/clinical/alerts', '/analytics', '/costs', '/audit-logs'],
    matchPrefixes: ['/fleet/'],
  },
  {
    id: 'medical-iot',
    label: 'Medical IoT',
    mobileLabel: 'IoT',
    path: '/medical-iot',
    matchPaths: ['/medical-iot'],
  },
  {
    id: 'settings',
    label: 'Settings',
    mobileLabel: 'Settings',
    path: '/settings',
    matchPaths: [
      '/settings',
      '/profile',
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
