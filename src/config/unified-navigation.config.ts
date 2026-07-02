import {
  CANONICAL_PILOT_EXTENSION_NAV_IDS,
  CANONICAL_PILOT_VISIBLE_NAV_IDS,
  CANONICAL_ROUTE_MAP,
  CANONICAL_ROUTES,
} from './routes.config';
import {
  EMERGENCY_ROLE_IDS,
  getEmergencyRoleDefinition,
  normalizeEmergencyRole,
  shouldHideStandaloneIntakeNav,
} from './emergencyRolePermissions';
import { PHYSICIAN_NAV_EXCLUDED_IDS } from '../components/whiteboard/physicianWorkflowModel';
import { getReceptionNavActivePaths } from './emergencyPipelineModel';
import {
  getHiddenNavItemIdsForRole,
  sortNavigationItemsForRole,
} from './emergencyNavPolicy';
import { getNavItemIdsForRole } from './roleClusterNav.config';
import { SAAS_USER_ROLES } from './saasProfileConstants';
import { resolveUserProfileFromSaasRole } from './userProfileCatalog';
import {
  getNavSuiteId,
  getSuiteById,
  type CareDroidSuiteId,
} from '../../lib/features/suiteRegistry';
import {
  canSeeNavigationItem,
  type CompiledCareDroidAccessProfile,
} from '../lib/users/canonicalAccess';
import { CAREDROID_PERMISSIONS } from '../lib/users/permissions';

export const DEFAULT_ROUTE = CANONICAL_ROUTES.emergencyReception;

/** Primary ED operating nav shown during pilot customer mode. */
export const PILOT_CORE_NAV_ITEM_IDS: readonly string[] = Object.freeze(
  CANONICAL_PILOT_VISIBLE_NAV_IDS.filter(
    (id) => !['pulse', 'shift', 'help', 'audit', 'ai-center', 'admin'].includes(id),
  ),
);

/** Secondary utility nav � routable in pilot but deprioritized in the sidebar. */
export const PILOT_UTILITY_NAV_ITEM_IDS: readonly string[] = Object.freeze([
  'pulse',
  'shift',
  'help',
]);

/** Extension/platform nav � hidden in pilot unless entitlements expand visibility. */
export const PILOT_EXTENSION_NAV_ITEM_IDS: readonly string[] = CANONICAL_PILOT_EXTENSION_NAV_IDS;

export const PILOT_CUSTOMER_VISIBLE_NAV_ITEM_IDS: readonly string[] = CANONICAL_PILOT_VISIBLE_NAV_IDS;

/** Receptionist-first pilot: front-desk roles see a minimal nav shell. */
export const PROFILE_SCOPED_PILOT_NAV_IDS: Readonly<Record<string, readonly string[]>> =
  Object.freeze({
    'registration-clerk': Object.freeze(['reception', 'patients', 'pulse', 'shift', 'help']),
    student: Object.freeze(['tools', 'platform', 'pulse']),
    steward: Object.freeze(['platform']),
    'racetrack-admin': Object.freeze(['platform']),
    'race-day-operations-manager': Object.freeze(['platform']),
    'equine-welfare-officer': Object.freeze(['platform']),
    veterinarian: Object.freeze(['platform', 'tools']),
  });

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
    CANONICAL_ROUTES.emergencyBoarding,
  ]),
});

export type NavItem = Readonly<{
  id: string;
  label: string;
  icon: string;
  route: string;
  featureGate: string | null;
  roles?: readonly string[];
  activePaths?: readonly string[];
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
  allowedRoles?: readonly string[];
  requiredPermissions: readonly string[];
  visibleToProfiles: readonly string[];
  priority: number;
  emergencySafe: boolean;
  readOnlyAllowed: boolean;
  isEmergencyCore: boolean;
  suiteId?: CareDroidSuiteId;
  suiteLabel?: string;
  activePaths?: readonly string[];
  mobileLabel?: string;
}>;

const UTILITY_NAV_ITEM_IDS = new Set(['tools', 'platform', 'pulse', 'shift']);

export const NAV_ITEMS: readonly NavItem[] = Object.freeze(
  CANONICAL_ROUTE_MAP.filter((route) => route.showInNav)
    .sort((left, right) => (left.priority ?? 0) - (right.priority ?? 0))
    .map((route) => {
    return Object.freeze({
      id: route.id,
      label: route.label,
      icon: route.icon || 'layout-dashboard',
      route: route.path,
      featureGate: route.featureGate || null,
    } satisfies NavItem);
  }),
) satisfies readonly NavItem[];

const ROLES = EMERGENCY_ROLE_IDS as Record<string, string>;
const ALL_ROLES = Object.freeze(Object.values(ROLES));
const NAV_FEATURE_IDS = Object.freeze({
  reception: 'reception_workspace',
  'command-center': 'emergency_whiteboard',
  whiteboard: 'emergency_whiteboard',
  dispatch: 'dispatch_console',
  'ed-readiness': 'ed_readiness',
  patients: 'emergency_patients',
  ems: 'ems_pipeline',
  intake: 'smart_intake',
  queue: 'queue_intelligence',
  triage: 'triage_workspace',
  queues: 'queue_intelligence',
  reassessment: 'reassessment_engine',
  capacity: 'capacity_intelligence',
  boarding: 'boarding_intelligence',
  referrals: 'referral_intelligence',
  copilot: 'ed_copilot',
  tools: 'clinical_calculator_hub',
  analytics: 'emergency_analytics',
  alerts: 'clinical_alerts',
  diagnostics: 'diagnostics_coordination',
  handoffs: 'handoff_service',
  reports: 'operational_reports',
  'ai-chief': 'ed_copilot',
  staff: 'staff_command',
  departments: 'department_capacity',
  settings: 'emergency_settings',
  integrations: 'integration_hub',
  cosmos: 'cosmos_viewer',
  platform: 'platform_navigation',
  pulse: 'department_pulse',
  shift: 'shift_summary',
  help: 'user_manual',
  fleet: 'fleet_management',
  surveillance: 'surveillance_nexus',
  simulation: 'simulation_academy',
  laboratory: 'laboratory',
  knowledge: 'knowledge_graph',
  audit: 'audit',
  'ai-center': 'ai_command_center',
  admin: 'admin_console',
  'hospital-map': 'hospital_map',
  executive: 'executive_command_center',
  'predictive-analytics': 'predictive_analytics',
  'medical-iot': 'medical_iot',
} as const);

const NAV_REQUIRED_PERMISSIONS: Readonly<Record<string, readonly string[]>> = Object.freeze({
  reception: [CAREDROID_PERMISSIONS.PATIENT_READ],
  'command-center': [CAREDROID_PERMISSIONS.PATIENT_READ],
  whiteboard: [CAREDROID_PERMISSIONS.PATIENT_READ],
  dispatch: [CAREDROID_PERMISSIONS.PATIENT_READ],
  'ed-readiness': [CAREDROID_PERMISSIONS.PATIENT_READ],
  patients: [CAREDROID_PERMISSIONS.PATIENT_READ],
  intake: [CAREDROID_PERMISSIONS.PATIENT_CREATE],
  ems: [CAREDROID_PERMISSIONS.PATIENT_READ],
  queues: [CAREDROID_PERMISSIONS.PATIENT_READ],
  reassessment: [CAREDROID_PERMISSIONS.PATIENT_READ, CAREDROID_PERMISSIONS.TRIAGE_READ],
  capacity: [CAREDROID_PERMISSIONS.ANALYTICS_READ],
  referrals: [CAREDROID_PERMISSIONS.PATIENT_READ],
  alerts: [CAREDROID_PERMISSIONS.ALERT_READ],
  diagnostics: [CAREDROID_PERMISSIONS.PATIENT_READ],
  handoffs: [CAREDROID_PERMISSIONS.PATIENT_READ],
  reports: [CAREDROID_PERMISSIONS.ANALYTICS_READ],
  copilot: [CAREDROID_PERMISSIONS.AI_READ],
  tools: [CAREDROID_PERMISSIONS.PATIENT_READ],
  analytics: [CAREDROID_PERMISSIONS.ANALYTICS_READ],
  settings: [CAREDROID_PERMISSIONS.SETTINGS_READ],
  pulse: [CAREDROID_PERMISSIONS.ANALYTICS_READ],
  shift: [CAREDROID_PERMISSIONS.STAFF_READ],
  laboratory: [CAREDROID_PERMISSIONS.LABS_READ],
  audit: [CAREDROID_PERMISSIONS.AUDIT_READ],
  admin: [CAREDROID_PERMISSIONS.SETTINGS_READ],
});

const READ_ONLY_NAV_ITEM_IDS = new Set(['command-center', 'whiteboard', 'alerts', 'analytics', 'reports', 'help', 'audit', 'laboratory', 'diagnostics']);

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
  const suiteId = item.suiteId ?? getNavSuiteId(item.id);
  const suite = suiteId ? getSuiteById(suiteId) : undefined;
  return Object.freeze({
    ...item,
    suiteId,
    suiteLabel: suite?.label,
    roles: Object.freeze([...item.roles]),
    allowedRoles: Object.freeze([...(item.allowedRoles || item.roles)]),
    requiredPermissions: Object.freeze([...(item.requiredPermissions || [])]),
    visibleToProfiles: Object.freeze([...(item.visibleToProfiles || [])]),
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
    profile.saasRole,
  );

  return sortNavigationItemsForRole(visibleItems, emergencyRole);
}

export const NAVIGATION_ITEMS = Object.freeze(
  NAV_ITEMS.map((item, index) => {
    const routeRecord = CANONICAL_ROUTE_MAP.find((route) => route.id === item.id);
    const emergencyRolesFromPath = rolesForRoute(item.route);
    const routeRoles =
      item.roles ||
      routeRecord?.emergencyRoles ||
      (emergencyRolesFromPath.length > 0 ? emergencyRolesFromPath : undefined) ||
      routeRecord?.allowedRoles ||
      [];
    const priority = routeRecord?.priority ?? index + 1;
    return navigationItem({
      ...item,
      path: item.route,
      featureId: NAV_FEATURE_IDS[item.id as keyof typeof NAV_FEATURE_IDS] || item.id,
      order: index + 1,
      roles: routeRoles,
      allowedRoles: routeRoles,
      requiredPermissions: routeRecord?.requiredPermissions || NAV_REQUIRED_PERMISSIONS[item.id] || [],
      visibleToProfiles: routeRecord?.userProfileVisibility || rolesForRoute(item.route),
      priority,
      emergencySafe:
        routeRecord?.emergencySafe ??
        (item.route.startsWith('/emergency') ||
          item.route === CANONICAL_ROUTES.workspace ||
          item.route === CANONICAL_ROUTES.platformStart),
      readOnlyAllowed: routeRecord?.readOnlyAllowed ?? READ_ONLY_NAV_ITEM_IDS.has(item.id),
      isEmergencyCore: !UTILITY_NAV_ITEM_IDS.has(item.id),
      mobileLabel: item.id === 'reassessment' ? 'Recheck' : item.label,
      activePaths:
        routeRecord?.activePaths
          ? routeRecord.activePaths
          : item.activePaths
            ? item.activePaths
        : item.id === 'reception'
          ? getReceptionNavActivePaths()
          : item.id === 'whiteboard'
          ? [
              CANONICAL_ROUTES.emergencyWhiteboard,
              '/emergency',
            ]
          : item.id === 'settings'
            ? [CANONICAL_ROUTES.emergencySettings, '/settings']
            : item.id === 'platform'
              ? [
                  CANONICAL_ROUTES.platformStart,
                  CANONICAL_ROUTES.workspace,
                  CANONICAL_ROUTES.workspaces,
                  '/app',
                ]
            : undefined,
    });
  }),
) satisfies readonly NavigationItem[];

export function isPilotCustomerVisibleNavItemId(id: string, saasRole?: string | null): boolean {
  if (!PILOT_CUSTOMER_MODE.enabled) return true;
  const scoped = saasRole ? PROFILE_SCOPED_PILOT_NAV_IDS[normalizeSaasRoleForNav(saasRole)] : null;
  if (scoped?.length) return scoped.includes(id);
  return PILOT_CUSTOMER_VISIBLE_NAV_ITEM_IDS.includes(id);
}

function normalizeSaasRoleForNav(role: string): string {
  return String(role || '').trim();
}

export function getPilotCustomerNavigationItems(
  items: readonly NavigationItem[] = NAVIGATION_ITEMS,
  saasRole?: string | null,
): readonly NavigationItem[] {
  return items.filter((item) => isPilotCustomerVisibleNavItemId(item.id, saasRole));
}

export function getVisibleNavigation(
  userRole: string | null | undefined,
  options: { saasRole?: string | null; compiledProfile?: CompiledCareDroidAccessProfile | null } = {},
): readonly NavigationItem[] {
  if (options.compiledProfile) {
    const profile = options.compiledProfile as CompiledCareDroidAccessProfile;
    const hospitalRole: string = (profile.role.hospitalRole as string) || profile.role.emergencyRoleId;
    const hiddenForRole = getHiddenNavItemIdsForRole(hospitalRole);
    const visibleItems = getPilotCustomerNavigationItems(
      NAVIGATION_ITEMS.filter(
        (item) => canSeeNavigationItem(profile, item) && !hiddenForRole.has(item.id),
      ),
    );
    return sortNavigationItemsForRole(visibleItems, hospitalRole);
  }
  if (options.saasRole && (SAAS_USER_ROLES as readonly string[]).includes(options.saasRole)) {
    return getVisibleNavigationForSaasRole(options.saasRole);
  }
  const normalizedRole = normalizeEmergencyRole(userRole);
  const allowedNavIds = new Set(getNavItemIdsForRole(normalizedRole));
  if (shouldHideStandaloneIntakeNav(normalizedRole)) {
    allowedNavIds.delete('intake');
  }

  const visibleItems = getPilotCustomerNavigationItems(
    NAVIGATION_ITEMS.filter((item) => allowedNavIds.has(item.id)),
  );

  return sortNavigationItemsForRole(visibleItems, normalizedRole);
}
