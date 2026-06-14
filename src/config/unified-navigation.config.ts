import { CANONICAL_ROUTES } from './routes.config';
import {
  EMERGENCY_ROLE_IDS,
  getEmergencyRoleDefinition,
  normalizeEmergencyRole,
} from './emergencyRolePermissions';

export const DEFAULT_ROUTE = CANONICAL_ROUTES.emergencyWhiteboard;

export const PILOT_CUSTOMER_VISIBLE_NAV_ITEM_IDS: readonly string[] = Object.freeze([
  'whiteboard',
  'patients',
  'ems',
  'intake',
  'queues',
  'reassessment',
  'capacity',
  'boarding',
  'referrals',
  'copilot',
  'tools',
]);

export const PILOT_CUSTOMER_MODE = Object.freeze({
  enabled: true,
  label: 'Pilot Customer Mode',
  assumptions: Object.freeze({
    patientsPerDay: 100,
    staffRange: '5-10',
    pressureLevel: 'high',
    trainingLevel: 'limited',
  }),
  visibleNavItemIds: PILOT_CUSTOMER_VISIBLE_NAV_ITEM_IDS,
  hiddenNavItemIds: Object.freeze(['analytics', 'settings']),
  retainedDirectRoutes: Object.freeze([
    CANONICAL_ROUTES.emergencyAnalytics,
    CANONICAL_ROUTES.emergencyPulse,
    CANONICAL_ROUTES.emergencySettings,
    CANONICAL_ROUTES.emergencyShift,
  ]),
});

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

const UTILITY_NAV_ITEM_IDS = new Set(['tools']);

export const NAV_ITEMS = Object.freeze([
  {
    id: 'whiteboard',
    label: 'Whiteboard',
    icon: 'layout-dashboard',
    route: CANONICAL_ROUTES.emergencyWhiteboard,
    featureGate: null,
  },
  {
    id: 'patients',
    label: 'Patients',
    icon: 'emergency-patients',
    route: CANONICAL_ROUTES.emergencyPatients,
    featureGate: null,
  },
  {
    id: 'ems',
    label: 'EMS',
    icon: 'ambulance',
    route: CANONICAL_ROUTES.emergencyEms,
    featureGate: 'ems_pipeline',
  },
  {
    id: 'intake',
    label: 'Intake',
    icon: 'intake',
    route: CANONICAL_ROUTES.emergencyIntake,
    featureGate: null,
  },
  {
    id: 'queues',
    label: 'Queues',
    icon: 'queues',
    route: CANONICAL_ROUTES.emergencyQueues,
    featureGate: null,
  },
  {
    id: 'reassessment',
    label: 'Reassess',
    icon: 'reassessment',
    route: CANONICAL_ROUTES.emergencyReassessment,
    featureGate: null,
  },
  {
    id: 'capacity',
    label: 'Capacity',
    icon: 'capacity',
    route: CANONICAL_ROUTES.emergencyCapacity,
    featureGate: 'capacity_intel',
  },
  {
    id: 'boarding',
    label: 'Boarding',
    icon: 'boarding',
    route: CANONICAL_ROUTES.emergencyBoarding,
    featureGate: null,
  },
  {
    id: 'referrals',
    label: 'Referrals',
    icon: 'referrals',
    route: CANONICAL_ROUTES.emergencyReferrals,
    featureGate: 'referral_intel',
  },
  {
    id: 'copilot',
    label: 'Copilot',
    icon: 'ed-copilot',
    route: CANONICAL_ROUTES.emergencyCopilot,
    featureGate: null,
  },
  {
    id: 'tools',
    label: 'Medical Tools',
    icon: 'clinical-tools',
    route: CANONICAL_ROUTES.emergencyTools,
    featureGate: null,
  },
  {
    id: 'analytics',
    label: 'Analytics',
    icon: 'emergency-analytics',
    route: CANONICAL_ROUTES.emergencyAnalytics,
    featureGate: null,
  },
  {
    id: 'settings',
    label: 'Settings',
    icon: 'settings',
    route: CANONICAL_ROUTES.emergencySettings,
    featureGate: null,
  },
] satisfies readonly NavItem[]);

const ROLES = EMERGENCY_ROLE_IDS as Record<string, string>;
const ALL_ROLES = Object.freeze(Object.values(ROLES));
const NAV_FEATURE_IDS = Object.freeze({
  whiteboard: 'emergency_whiteboard',
  patients: 'emergency_patients',
  ems: 'ems_pipeline',
  intake: 'smart_intake',
  queues: 'queue_intelligence',
  reassessment: 'reassessment_engine',
  capacity: 'capacity_intelligence',
  boarding: 'boarding_intelligence',
  referrals: 'referral_intelligence',
  copilot: 'ed_copilot',
  tools: 'clinical_calculator_hub',
  analytics: 'emergency_analytics',
  settings: 'emergency_settings',
} as const);

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

function rolesForRoute(path: string): readonly string[] {
  return Object.freeze(
    ALL_ROLES.filter((role) => getEmergencyRoleDefinition(role).routes.includes(path)),
  );
}

export const NAVIGATION_ITEMS = Object.freeze(
  NAV_ITEMS.map((item, index) =>
    navigationItem({
      ...item,
      path: item.route,
      featureId: NAV_FEATURE_IDS[item.id as keyof typeof NAV_FEATURE_IDS] || item.id,
      order: index + 1,
      roles: item.id === 'settings' ? rolesForRoute(item.route) : ALL_ROLES,
      isEmergencyCore: !UTILITY_NAV_ITEM_IDS.has(item.id),
      mobileLabel: item.id === 'reassessment' ? 'Recheck' : item.label,
      activePaths:
        item.id === 'whiteboard'
          ? [
              CANONICAL_ROUTES.emergencyWhiteboard,
              '/emergency',
            ]
          : item.id === 'settings'
            ? [CANONICAL_ROUTES.emergencySettings, '/settings']
            : undefined,
    }),
  ),
) satisfies readonly NavigationItem[];

export function isPilotCustomerVisibleNavItemId(id: string): boolean {
  return !PILOT_CUSTOMER_MODE.enabled || PILOT_CUSTOMER_VISIBLE_NAV_ITEM_IDS.includes(id);
}

export function getPilotCustomerNavigationItems(
  items: readonly NavigationItem[] = NAVIGATION_ITEMS,
): readonly NavigationItem[] {
  return items.filter((item) => isPilotCustomerVisibleNavItemId(item.id));
}

export function getVisibleNavigation(
  userRole: string | null | undefined,
): readonly NavigationItem[] {
  const normalizedRole = normalizeEmergencyRole(userRole);
  return [
    ...getPilotCustomerNavigationItems(
      NAVIGATION_ITEMS.filter((item) => item.roles.includes(normalizedRole)),
    ),
  ].sort((first, second) => first.order - second.order);
}
