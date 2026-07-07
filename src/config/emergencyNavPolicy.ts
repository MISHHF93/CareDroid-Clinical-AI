import { normalizeEmergencyRole } from './emergencyRolePermissions';
import { isReceptionFirstUxEnabled, RECEPTION_FIRST_UX } from './receptionFirstUx.config';
import { getNavItemIdsForRole, HOSPITAL_ROLE_NAV_IDS } from './roleClusterNav.config';

const RECEPTION_FIRST_NAV_ORDER = Object.freeze([
  'reception',
  'patients',
  'ems',
  'queues',
  'whiteboard',
  'reassessment',
  'capacity',
  'hospital-map',
  'referrals',
  'copilot',
  'tools',
  'analytics',
  'predictive-analytics',
  'executive',
  'ai-center',
  'medical-iot',
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
]);

// Derived from cluster config — all 21 hospital roles + legacy emergency role aliases.
// Exported for backward compatibility with existing tests.
const ROLE_NAV_ORDER_OVERRIDES: Readonly<Record<string, readonly string[]>> = Object.freeze({
  ...HOSPITAL_ROLE_NAV_IDS,
  physician:        HOSPITAL_ROLE_NAV_IDS.emergency_physician,
  ems_user:         HOSPITAL_ROLE_NAV_IDS.paramedic,
  ed_manager:       HOSPITAL_ROLE_NAV_IDS.ed_director,
  admin:            HOSPITAL_ROLE_NAV_IDS.hospital_admin,
  read_only_viewer: HOSPITAL_ROLE_NAV_IDS.demo_observer,
  public_display:   HOSPITAL_ROLE_NAV_IDS.demo_observer,
});

// Hiding is now handled entirely by getHiddenNavItemIdsForRole via the cluster allowlist.
const ROLE_NAV_EXCLUDED_OVERRIDES: Readonly<Record<string, readonly string[]>> = Object.freeze({});

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

export function sortNavigationItemsForRole(items: readonly any[], role: string): readonly any[] {
  const orderedIds = getNavItemIdsForRole(role);
  const orderIndex = new Map(orderedIds.map((id, i) => [id, i]));
  return [...items].sort((a, b) => {
    const ai = orderIndex.get(a.id) ?? Number.MAX_SAFE_INTEGER;
    const bi = orderIndex.get(b.id) ?? Number.MAX_SAFE_INTEGER;
    if (ai !== bi) return ai - bi;
    return (a.order ?? 0) - (b.order ?? 0);
  });
}

// Full list of known sidebar item IDs — used to compute the hidden set from a role's allowlist.
const ALL_KNOWN_NAV_ITEM_IDS: readonly string[] = Object.freeze([
  'command-center', 'reception', 'whiteboard', 'dispatch', 'ems', 'ed-readiness',
  'patients', 'queues', 'triage', 'reassessment', 'alerts', 'capacity', 'referrals',
  'diagnostics', 'handoffs', 'copilot', 'tools', 'analytics', 'reports', 'settings',
  'pulse', 'shift', 'help', 'admin', 'audit',
  'intake', 'integrations', 'cosmos', 'platform', 'fleet', 'surveillance',
  'simulation', 'laboratory', 'knowledge', 'ai-center',
  // Extended platform pages
  'hospital-map', 'executive', 'predictive-analytics', 'medical-iot',
]);

export function getHiddenNavItemIdsForRole(role: string, options: any = {}): Set<string> {
  const allowedIds = new Set(getNavItemIdsForRole(role));
  const hidden = new Set<string>();
  for (const id of ALL_KNOWN_NAV_ITEM_IDS) {
    if (!allowedIds.has(id)) hidden.add(id);
  }
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
