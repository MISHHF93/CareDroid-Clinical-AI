/**
 * Primary clinical operating system navigation.
 *
 * Existing deep links remain valid; these items define the simplified visible IA
 * used by the shell while route modules keep legacy paths working underneath.
 */
export const PRIMARY_NAV_ITEMS = Object.freeze([
  {
    id: 'home',
    label: 'Home',
    mobileLabel: 'Home',
    path: '/home',
    legacyPaths: ['/dashboard'],
    matchPaths: ['/home', '/dashboard'],
  },
  {
    id: 'assistant',
    label: 'Assistant',
    mobileLabel: 'AI',
    path: '/assistant',
    legacyPaths: ['/chat'],
    matchPaths: ['/assistant', '/chat'],
  },
  {
    id: 'tools',
    label: 'Tools',
    mobileLabel: 'Tools',
    path: '/tools',
    matchPaths: ['/tools'],
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
    matchPaths: ['/operations', '/clinical/alerts', '/analytics', '/costs', '/audit-logs'],
    matchPrefixes: ['/fleet/'],
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
      '/tools/catalog',
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
