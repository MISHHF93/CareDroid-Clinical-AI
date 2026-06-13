import { CANONICAL_ROUTES } from './routes.config';
import { EMERGENCY_ROLE_IDS, normalizeEmergencyRole } from './emergencyRolePermissions';

export const DEFAULT_ROUTE = CANONICAL_ROUTES.emergencyWhiteboard;

export type NavigationItem = Readonly<{
  id: string;
  label: string;
  path: string;
  icon: string;
  order: number;
  roles: readonly string[];
  isEmergencyCore: boolean;
  activePaths?: readonly string[];
  mobileLabel?: string;
}>;

const ROLES = EMERGENCY_ROLE_IDS as Record<string, string>;
const ALL_ROLES = Object.freeze(Object.values(ROLES));
const CLINICAL_ROLES = Object.freeze([
  ROLES.admin,
  ROLES.edManager,
  ROLES.chargeNurse,
  ROLES.triageNurse,
  ROLES.physician,
  ROLES.readOnlyViewer,
]);

function navigationItem(item: NavigationItem): NavigationItem {
  return Object.freeze({
    ...item,
    roles: Object.freeze([...item.roles]),
    activePaths: Object.freeze(item.activePaths ? [...item.activePaths] : [item.path]),
  });
}

export const NAVIGATION_ITEMS = Object.freeze([
  navigationItem({
    id: 'emergency_whiteboard',
    label: 'Whiteboard',
    path: CANONICAL_ROUTES.emergencyWhiteboard,
    icon: 'emergency-whiteboard',
    order: 1,
    roles: ALL_ROLES,
    isEmergencyCore: true,
    mobileLabel: 'Board',
    activePaths: [CANONICAL_ROUTES.emergencyWhiteboard, '/emergency'],
  }),
  navigationItem({
    id: 'ems',
    label: 'EMS',
    path: CANONICAL_ROUTES.emergencyEms,
    icon: 'ems',
    order: 2,
    roles: ALL_ROLES,
    isEmergencyCore: true,
    mobileLabel: 'EMS',
  }),
  navigationItem({
    id: 'referrals',
    label: 'Referrals',
    path: CANONICAL_ROUTES.emergencyReferrals,
    icon: 'referrals',
    order: 3,
    roles: CLINICAL_ROLES,
    isEmergencyCore: true,
    mobileLabel: 'Refs',
  }),
  navigationItem({
    id: 'capacity',
    label: 'Capacity',
    path: CANONICAL_ROUTES.emergencyCapacity,
    icon: 'capacity',
    order: 4,
    roles: ALL_ROLES,
    isEmergencyCore: true,
    mobileLabel: 'Cap',
  }),
  navigationItem({
    id: 'tools',
    label: 'Tools',
    path: CANONICAL_ROUTES.emergencyTools,
    icon: 'clinical-tools',
    order: 5,
    roles: CLINICAL_ROLES,
    isEmergencyCore: true,
    mobileLabel: 'Tools',
  }),
  navigationItem({
    id: 'shift',
    label: 'Shift',
    path: CANONICAL_ROUTES.emergencyShift,
    icon: 'shift-summary',
    order: 6,
    roles: CLINICAL_ROLES,
    isEmergencyCore: true,
    mobileLabel: 'Shift',
  }),
  navigationItem({
    id: 'settings',
    label: 'Settings',
    path: CANONICAL_ROUTES.emergencySettings,
    icon: 'emergency-settings',
    order: 7,
    roles: [ROLES.admin],
    isEmergencyCore: true,
    mobileLabel: 'Settings',
  }),
] satisfies readonly NavigationItem[]);

export function getVisibleNavigation(userRole: string | null | undefined): readonly NavigationItem[] {
  const normalizedRole = normalizeEmergencyRole(userRole);
  return NAVIGATION_ITEMS
    .filter((item) => item.roles.includes(normalizedRole))
    .sort((first, second) => first.order - second.order);
}
