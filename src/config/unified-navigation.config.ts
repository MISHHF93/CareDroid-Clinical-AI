import { CANONICAL_ROUTES } from './routes.config';
import { EMERGENCY_ROLE_IDS, normalizeEmergencyRole } from './emergencyRolePermissions';

export const DEFAULT_ROUTE = CANONICAL_ROUTES.emergencyWhiteboard;

export type NavItem = Readonly<{
  id: string;
  label: string;
  icon: string;
  route: string;
  featureGate: string | null;
}>;

export type NavigationItem = Readonly<{
  id: string;
  label: string;
  path: string;
  route: string;
  icon: string;
  featureGate: string | null;
  featureId: string;
  order: number;
  roles: readonly string[];
  isEmergencyCore: boolean;
  activePaths?: readonly string[];
  mobileLabel?: string;
}>;

export const NAV_ITEMS = Object.freeze([
  { id: 'whiteboard', label: 'Emergency Whiteboard', icon: 'layout-dashboard', route: '/emergency', featureGate: null },
  { id: 'pulse', label: 'Department Pulse', icon: 'department-pulse', route: '/emergency/pulse', featureGate: null },
  { id: 'ems', label: 'EMS Pipeline', icon: 'ambulance', route: '/emergency/ems', featureGate: 'ems_pipeline' },
  { id: 'referrals', label: 'Referrals', icon: 'send', route: '/emergency/referrals', featureGate: 'referral_intel' },
  { id: 'capacity', label: 'Capacity', icon: 'chart-bar', route: '/emergency/capacity', featureGate: 'capacity_intel' },
  { id: 'tools', label: 'Clinical Tools', icon: 'stethoscope', route: '/emergency/tools', featureGate: 'clinical_tools' },
  { id: 'shift', label: 'Shift Summary', icon: 'report-analytics', route: '/emergency/shift', featureGate: null },
  { id: 'settings', label: 'Settings', icon: 'settings', route: '/settings', featureGate: null },
] satisfies readonly NavItem[]);

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

export const FEATURE_GATE_ALIASES = Object.freeze({
  referral_intel: 'referral_intelligence',
  capacity_intel: 'capacity_intelligence',
  clinical_tools: 'clinical_calculator_hub',
} as const);

export function resolveFeatureGate(featureGate: string | null | undefined): string | null {
  if (!featureGate) return null;
  return FEATURE_GATE_ALIASES[featureGate as keyof typeof FEATURE_GATE_ALIASES] || featureGate;
}

function navigationItem(item: NavigationItem): NavigationItem {
  return Object.freeze({
    ...item,
    roles: Object.freeze([...item.roles]),
    activePaths: Object.freeze(item.activePaths ? [...item.activePaths] : [item.path]),
  });
}

export const NAVIGATION_ITEMS = Object.freeze([
  navigationItem({
    ...NAV_ITEMS[0],
    path: CANONICAL_ROUTES.emergencyWhiteboard,
    featureId: 'emergency_whiteboard',
    order: 1,
    roles: ALL_ROLES,
    isEmergencyCore: true,
    mobileLabel: 'Board',
    activePaths: [CANONICAL_ROUTES.emergencyWhiteboard, '/emergency'],
  }),
  navigationItem({
    ...NAV_ITEMS[1],
    path: NAV_ITEMS[1].route,
    featureId: 'department_pulse',
    order: 2,
    roles: ALL_ROLES,
    isEmergencyCore: true,
    mobileLabel: 'Pulse',
  }),
  navigationItem({
    ...NAV_ITEMS[2],
    path: NAV_ITEMS[2].route,
    featureId: 'ems_pipeline',
    order: 3,
    roles: ALL_ROLES,
    isEmergencyCore: true,
    mobileLabel: 'EMS',
  }),
  navigationItem({
    ...NAV_ITEMS[3],
    path: NAV_ITEMS[3].route,
    featureId: 'referral_intelligence',
    order: 4,
    roles: CLINICAL_ROLES,
    isEmergencyCore: true,
    mobileLabel: 'Refs',
  }),
  navigationItem({
    ...NAV_ITEMS[4],
    path: NAV_ITEMS[4].route,
    featureId: 'capacity_intelligence',
    order: 5,
    roles: ALL_ROLES,
    isEmergencyCore: true,
    mobileLabel: 'Cap',
  }),
  navigationItem({
    ...NAV_ITEMS[5],
    path: NAV_ITEMS[5].route,
    featureId: 'clinical_calculator_hub',
    order: 6,
    roles: CLINICAL_ROLES,
    isEmergencyCore: true,
    mobileLabel: 'Tools',
  }),
  navigationItem({
    ...NAV_ITEMS[6],
    path: NAV_ITEMS[6].route,
    featureId: 'shift_summary',
    order: 7,
    roles: CLINICAL_ROLES,
    isEmergencyCore: true,
    mobileLabel: 'Shift',
  }),
  navigationItem({
    ...NAV_ITEMS[7],
    path: NAV_ITEMS[7].route,
    featureId: 'emergency_settings',
    order: 8,
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
