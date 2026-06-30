/**
 * Sidebar navigation grouping — reduces scan load with calm section labels.
 * Maps canonical route navigationGroup values to pilot-facing group titles.
 */
import { CANONICAL_ROUTE_MAP } from './routes.config';

export const SIDEBAR_GROUP_ORDER = Object.freeze([
  'Command',
  'Emergency',
  'Patients',
  'Operations',
  'Clinical',
  'Intelligence',
  'Analytics',
  'Administration',
  'Help',
] as const);

export type SidebarGroupId = (typeof SIDEBAR_GROUP_ORDER)[number];

const GROUP_LABELS: Readonly<Record<string, SidebarGroupId>> = Object.freeze({
  Command: 'Command',
  Emergency: 'Emergency',
  Patients: 'Patients',
  Operations: 'Operations',
  Clinical: 'Clinical',
  Intelligence: 'Intelligence',
  Analytics: 'Analytics',
  Administration: 'Administration',
  Help: 'Help',
  // Legacy route.config aliases
  'AI': 'Intelligence',
  'Admin': 'Administration',
});

const NAV_ID_GROUP_OVERRIDES: Readonly<Record<string, SidebarGroupId>> = Object.freeze({
  'command-center': 'Command',
  whiteboard: 'Command',
  reception: 'Emergency',
  dispatch: 'Emergency',
  ems: 'Emergency',
  'ed-readiness': 'Emergency',
  triage: 'Emergency',
  alerts: 'Emergency',
  capacity: 'Operations',
  handoffs: 'Operations',
  diagnostics: 'Operations',
  patients: 'Patients',
  queues: 'Patients',
  reassessment: 'Patients',
  referrals: 'Patients',
  boarding: 'Patients',
  copilot: 'Intelligence',
  'ai-chief': 'Intelligence',
  'ai-center': 'Intelligence',
  tools: 'Clinical',
  analytics: 'Analytics',
  reports: 'Analytics',
  pulse: 'Analytics',
  shift: 'Analytics',
  settings: 'Administration',
  admin: 'Administration',
  audit: 'Administration',
  help: 'Help',
  account: 'Help',
  'admin-console': 'Administration',
});

const routeGroupById = Object.freeze(
  Object.fromEntries(
    CANONICAL_ROUTE_MAP.map((route) => [
      route.id,
      GROUP_LABELS[(route as { navigationGroup?: string }).navigationGroup || ''] || 'Emergency',
    ]),
  ),
);

export function resolveSidebarGroupForNavItem(navItemId: string): SidebarGroupId {
  return NAV_ID_GROUP_OVERRIDES[navItemId] || routeGroupById[navItemId] || 'Emergency';
}

export function groupSidebarNavItems<T extends { id: string }>(
  items: readonly T[],
): ReadonlyArray<{ group: SidebarGroupId; items: readonly T[] }> {
  const buckets = new Map<SidebarGroupId, T[]>();
  for (const item of items) {
    const group = resolveSidebarGroupForNavItem(item.id);
    const list = buckets.get(group) || [];
    list.push(item);
    buckets.set(group, list);
  }
  return SIDEBAR_GROUP_ORDER.filter((group) => buckets.has(group)).map((group) =>
    Object.freeze({ group, items: Object.freeze(buckets.get(group) || []) }),
  );
}