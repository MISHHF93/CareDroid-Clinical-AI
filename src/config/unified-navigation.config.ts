import { CANONICAL_ROUTES } from './routes.config';
import {
  EMERGENCY_ROLE_IDS,
  getEmergencyRoleDefinition,
  normalizeEmergencyRole,
  shouldHideStandaloneIntakeNav,
} from './emergencyRolePermissions';
import { PHYSICIAN_NAV_EXCLUDED_IDS } from '../components/whiteboard/physicianWorkflowModel';
import { getReceptionNavActivePaths } from './emergencyPipelineModel.js';
import {
  getHiddenNavItemIdsForRole,
  sortNavigationItemsForRole,
} from './emergencyNavPolicy.js';
import { SAAS_USER_ROLES } from './saasProfileConstants';
import { resolveUserProfileFromSaasRole } from './userProfileCatalog';

export const DEFAULT_ROUTE = CANONICAL_ROUTES.emergencyReception;

export const PILOT_CUSTOMER_VISIBLE_NAV_ITEM_IDS: readonly string[] = Object.freeze([
  'reception',
  'whiteboard',
  'intake',
  'ems',
  'patients',
  'queues',
  'reassessment',
  'capacity',
  'boarding',
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
  hiddenNavItemIds: Object.freeze([]),
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

const UTILITY_NAV_ITEM_IDS = new Set(['tools', 'platform', 'pulse', 'shift']);

export const NAV_ITEMS = Object.freeze([
  {
    id: 'reception',
    label: 'Reception',
    icon: 'user-check',
    route: CANONICAL_ROUTES.emergencyReception,
    featureGate: null,
  },
  {
    id: 'whiteboard',
    label: 'Whiteboard',
    icon: 'layout-dashboard',
    route: CANONICAL_ROUTES.emergencyWhiteboard,
    featureGate: null,
  },
  {
    id: 'intake',
    label: 'Intake',
    icon: 'intake',
    route: CANONICAL_ROUTES.emergencyIntake,
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
    id: 'patients',
    label: 'Patients',
    icon: 'emergency-patients',
    route: CANONICAL_ROUTES.emergencyPatients,
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
  {
    id: 'integrations',
    label: 'Integrations',
    icon: 'integrations',
    route: CANONICAL_ROUTES.integrationHub,
    featureGate: null,
  },
  {
    id: 'cosmos',
    label: 'Cosmos',
    icon: 'chart-bar',
    route: CANONICAL_ROUTES.cosmosViewer,
    featureGate: null,
  },
  {
    id: 'platform',
    label: 'Platform',
    icon: 'platform',
    route: CANONICAL_ROUTES.workspace,
    featureGate: null,
  },
  {
    id: 'pulse',
    label: 'Pulse',
    icon: 'activity',
    route: CANONICAL_ROUTES.emergencyPulse,
    featureGate: null,
  },
  {
    id: 'shift',
    label: 'Shift',
    icon: 'clock',
    route: CANONICAL_ROUTES.emergencyShift,
    featureGate: null,
  },
] satisfies readonly NavItem[]);

const ROLES = EMERGENCY_ROLE_IDS as Record<string, string>;
const ALL_ROLES = Object.freeze(Object.values(ROLES));
const NAV_FEATURE_IDS = Object.freeze({
  reception: 'reception_workspace',
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
  integrations: 'integration_hub',
  cosmos: 'cosmos_viewer',
  platform: 'platform_navigation',
  pulse: 'department_pulse',
  shift: 'shift_summary',
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
  const emergencyRoles = Object.freeze(
    ALL_ROLES.filter((role) => getEmergencyRoleDefinition(role).routes.includes(path)),
  );
  const saasRoles = Object.freeze(
    SAAS_USER_ROLES.filter((role) => {
      const profile = resolveUserProfileFromSaasRole(role);
      return profile.navigationRoutes.includes(path);
    }),
  );
  return Object.freeze([...new Set([...emergencyRoles, ...saasRoles])]);
}

export function getVisibleNavigationForSaasRole(
  saasRole: string | null | undefined,
): readonly NavigationItem[] {
  const profile = resolveUserProfileFromSaasRole(saasRole);
  const allowedRoutes = new Set(profile.navigationRoutes);
  const emergencyRole = profile.emergencyRoleId
    ? normalizeEmergencyRole(profile.emergencyRoleId)
    : normalizeEmergencyRole(saasRole);
  const hiddenForRole = getHiddenNavItemIdsForRole(emergencyRole, {
    hideStandaloneIntake: shouldHideStandaloneIntakeNav(emergencyRole),
  });

  const visibleItems = getPilotCustomerNavigationItems(
    NAVIGATION_ITEMS.filter(
      (item) =>
        (allowedRoutes.has(item.route) || item.roles.includes(emergencyRole)) &&
        !hiddenForRole.has(item.id),
    ),
  );

  return sortNavigationItemsForRole(visibleItems, emergencyRole);
}

export const NAVIGATION_ITEMS = Object.freeze(
  NAV_ITEMS.map((item, index) =>
    navigationItem({
      ...item,
      path: item.route,
      featureId: NAV_FEATURE_IDS[item.id as keyof typeof NAV_FEATURE_IDS] || item.id,
      order: index + 1,
      roles: rolesForRoute(item.route),
      isEmergencyCore: !UTILITY_NAV_ITEM_IDS.has(item.id),
      mobileLabel: item.id === 'reassessment' ? 'Recheck' : item.label,
      activePaths:
        item.id === 'reception'
          ? getReceptionNavActivePaths()
          : item.id === 'whiteboard'
          ? [
              CANONICAL_ROUTES.emergencyWhiteboard,
              '/emergency',
            ]
          : item.id === 'settings'
            ? [CANONICAL_ROUTES.emergencySettings, '/settings']
            : item.id === 'platform'
              ? [CANONICAL_ROUTES.workspace, CANONICAL_ROUTES.workspaces, '/app']
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
  options: { saasRole?: string | null } = {},
): readonly NavigationItem[] {
  if (options.saasRole && (SAAS_USER_ROLES as readonly string[]).includes(options.saasRole)) {
    return getVisibleNavigationForSaasRole(options.saasRole);
  }
  const normalizedRole = normalizeEmergencyRole(userRole);
  const hiddenForRole = getHiddenNavItemIdsForRole(normalizedRole, {
    hideStandaloneIntake: shouldHideStandaloneIntakeNav(normalizedRole),
  });

  const visibleItems = getPilotCustomerNavigationItems(
    NAVIGATION_ITEMS.filter(
      (item) => item.roles.includes(normalizedRole) && !hiddenForRole.has(item.id),
    ),
  );

  return sortNavigationItemsForRole(visibleItems, normalizedRole);
}
