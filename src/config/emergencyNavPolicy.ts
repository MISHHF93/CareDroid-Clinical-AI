import { normalizeEmergencyRole } from './emergencyRolePermissions';
import { isReceptionFirstUxEnabled, RECEPTION_FIRST_UX } from './receptionFirstUx.config';
import { PHYSICIAN_NAV_EXCLUDED_IDS, PHYSICIAN_NAV_ORDER } from '../components/whiteboard/physicianWorkflowModel';

const RECEPTION_FIRST_NAV_ORDER = Object.freeze([
  'reception',
  'patients',
  'ems',
  'queues',
  'whiteboard',
  'reassessment',
  'capacity',
  'referrals',
  'copilot',
  'tools',
  'analytics',
  'settings',
  'integrations',
  'cosmos',
  'platform',
  'pulse',
  'shift',
  'fleet',
  'surveillance',
  'simulation',
  'laboratory',
  'knowledge',
  'audit',
  'ai-center',
]);

const ROLE_NAV_ORDER_OVERRIDES = Object.freeze({
  triage_nurse: ['reception', 'whiteboard', 'patients', 'queues', 'reassessment', 'copilot', 'tools', 'platform', 'ems'],
  charge_nurse: [
    'reception',
    'whiteboard',
    'patients',
    'queues',
    'reassessment',
    'capacity',
    'referrals',
    'copilot',
    'tools',
    'analytics',
    'platform',
    'ems',
    'fleet',
    'surveillance',
    'simulation',
    'laboratory',
    'knowledge',
    'audit',
    'ai-center',
  ],
  ed_manager: [
    'reception',
    'whiteboard',
    'patients',
    'queues',
    'reassessment',
    'capacity',
    'referrals',
    'copilot',
    'tools',
    'analytics',
    'platform',
    'ems',
    'fleet',
    'surveillance',
    'simulation',
    'laboratory',
    'knowledge',
    'audit',
    'ai-center',
    'admin',
  ],
  read_only_viewer: [
    'whiteboard',
    'reception',
    'patients',
    'queues',
    'reassessment',
    'capacity',
    'referrals',
    'copilot',
    'tools',
    'analytics',
    'integrations',
    'cosmos',
    'platform',
    'ems',
    'fleet',
    'surveillance',
    'simulation',
    'laboratory',
    'knowledge',
    'audit',
  ],
  physician: PHYSICIAN_NAV_ORDER,
  ems_user: ['ems', 'whiteboard', 'patients', 'capacity', 'tools', 'platform'],
  registration_clerk: ['reception', 'patients', 'pulse', 'shift'],
});

const ROLE_NAV_EXCLUDED_OVERRIDES = Object.freeze({
  registration_clerk: ['queues', 'tools', 'platform', 'settings', 'integrations', 'analytics', 'cosmos', 'copilot', 'intake', 'whiteboard'],
  physician: PHYSICIAN_NAV_EXCLUDED_IDS,
});

export function getRoleNavOrder(role) {
  const normalizedRole = normalizeEmergencyRole(role);
  if (isReceptionFirstUxEnabled() && RECEPTION_FIRST_UX.demoteCommandCenterInNav) {
    const roleOrder = ROLE_NAV_ORDER_OVERRIDES[normalizedRole];
    if (roleOrder?.length) return roleOrder;
    return RECEPTION_FIRST_NAV_ORDER;
  }
  return ROLE_NAV_ORDER_OVERRIDES[normalizedRole] || null;
}

export function getRoleNavExcludedIds(role) {
  return ROLE_NAV_EXCLUDED_OVERRIDES[normalizeEmergencyRole(role)] || [];
}

export function sortNavigationItemsForRole(items, role) {
  const override = getRoleNavOrder(role);
  if (!override?.length) {
    return [...items].sort((first, second) => first.order - second.order);
  }

  const orderIndex = new Map(override.map((id, index) => [id, index]));
  return [...items].sort((first, second) => {
    const firstIndex = orderIndex.get(first.id) ?? Number.MAX_SAFE_INTEGER;
    const secondIndex = orderIndex.get(second.id) ?? Number.MAX_SAFE_INTEGER;
    if (firstIndex !== secondIndex) return (firstIndex as number) - (secondIndex as number);
    return (first as any).order - (second as any).order;
  });
}

export function getHiddenNavItemIdsForRole(role, options: any = {}) {
  const hidden = new Set(getRoleNavExcludedIds(role));
  if (options.hideStandaloneIntake) hidden.add('intake');
  return hidden;
}

/** Paths that belong conceptually to another nav section when their own item is absent. */
const NAV_PARENT_FALLBACK: Record<string, string> = {
  '/emergency/intake': 'reception',
  '/emergency/register': 'reception',
  '/emergency/smart-intake': 'reception',
};

/**
 * Resolve which nav item id is "active" for a given pathname.
 * Picks the most specific (longest) route match so broad catch-all activePaths
 * (e.g. whiteboard's "/emergency") don't shadow specific items.
 * When no item directly matches (e.g. intake is hidden), falls back to the
 * canonical parent section defined in NAV_PARENT_FALLBACK.
 */
export function resolveActiveNavigationItemId(
  items: readonly { id: string; route?: string; path?: string; activePaths?: readonly string[] }[],
  pathname: string,
  _search?: string,
): string | null {
  // Pass 1: primary route match (most specific wins)
  let bestId: string | null = null;
  let bestLen = -1;
  for (const item of items) {
    const primaryRoute = item.route || item.path;
    if (primaryRoute && (pathname === primaryRoute || pathname.startsWith(primaryRoute + '/'))) {
      if (primaryRoute.length > bestLen) {
        bestId = item.id;
        bestLen = primaryRoute.length;
      }
    }
  }
  if (bestId) return bestId;

  // Pass 2: explicit parent fallback for paths whose own item may be hidden
  const parentId = NAV_PARENT_FALLBACK[pathname];
  if (parentId && items.some((item) => item.id === parentId)) return parentId;

  // Pass 3: activePaths (broad catch-alls like whiteboard's "/emergency")
  for (const item of items) {
    if (item.activePaths) {
      for (const p of item.activePaths) {
        if (pathname === p || pathname.startsWith(p + '/')) {
          if (p.length > bestLen) {
            bestId = item.id;
            bestLen = p.length;
          }
        }
      }
    }
  }
  return bestId;
}

export { ROLE_NAV_ORDER_OVERRIDES, ROLE_NAV_EXCLUDED_OVERRIDES, RECEPTION_FIRST_NAV_ORDER };
