import { CANONICAL_ROUTES } from './routes.config';
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
import { SAAS_USER_ROLES } from './saasProfileConstants';
import { resolveUserProfileFromSaasRole } from './userProfileCatalog';
import {
  getNavSuiteId,
  getSuiteById,
  type CareDroidSuiteId,
} from '../../lib/features/suiteRegistry';
import {
  canAccessRoute,
  type CompiledCareDroidAccessProfile,
} from '../lib/users/canonicalAccess';
import { CAREDROID_PERMISSIONS } from '../lib/users/permissions';

export const DEFAULT_ROUTE = CANONICAL_ROUTES.emergencyReception;

/** Primary ED operating nav shown during pilot customer mode. */
export const PILOT_CORE_NAV_ITEM_IDS: readonly string[] = Object.freeze([
  'reception',
  'whiteboard',
  'ems',
  'patients',
  'queues',
  'reassessment',
  'capacity',
  'referrals',
  'copilot',
  'tools',
  'analytics',
  'settings',
]);

/** Secondary utility nav — routable in pilot but deprioritized in the sidebar. */
export const PILOT_UTILITY_NAV_ITEM_IDS: readonly string[] = Object.freeze([
  'pulse',
  'shift',
]);

/** Extension/platform nav — hidden in pilot unless entitlements expand visibility. */
export const PILOT_EXTENSION_NAV_ITEM_IDS: readonly string[] = Object.freeze([
  'intake',
  'integrations',
  'cosmos',
  'platform',
  'fleet',
  'surveillance',
  'simulation',
  'laboratory',
  'knowledge',
  'audit',
  'ai-center',
  'admin',
]);

export const PILOT_CUSTOMER_VISIBLE_NAV_ITEM_IDS: readonly string[] = Object.freeze([
  ...PILOT_CORE_NAV_ITEM_IDS,
  ...PILOT_UTILITY_NAV_ITEM_IDS,
]);

/** Receptionist-first pilot: front-desk roles see a minimal nav shell. */
export const PROFILE_SCOPED_PILOT_NAV_IDS: Readonly<Record<string, readonly string[]>> =
  Object.freeze({
    'registration-clerk': Object.freeze(['reception', 'patients', 'pulse', 'shift']),
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

export const NAV_ITEMS: readonly NavItem[] = Object.freeze([
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
    label: 'Flow & Capacity',
    icon: 'capacity',
    route: CANONICAL_ROUTES.emergencyCapacity,
    featureGate: 'capacity_intel',
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
  // Additional pages brought in for full navigation normalization
  {
    id: 'fleet',
    label: 'Fleet',
    icon: 'ambulance',
    route: CANONICAL_ROUTES.fleetCommand,
    featureGate: null,
  },
  {
    id: 'surveillance',
    label: 'Surveillance',
    icon: 'activity',
    route: CANONICAL_ROUTES.surveillanceNexus,
    featureGate: null,
  },
  {
    id: 'simulation',
    label: 'Simulation',
    icon: 'list-check',
    route: CANONICAL_ROUTES.simulation,
    featureGate: null,
  },
  {
    id: 'laboratory',
    label: 'Laboratory',
    icon: 'stethoscope',
    route: CANONICAL_ROUTES.laboratory,
    featureGate: null,
  },
  {
    id: 'knowledge',
    label: 'Knowledge Graph',
    icon: 'chart-bar',
    route: CANONICAL_ROUTES.knowledgeGraph,
    featureGate: null,
  },
  {
    id: 'audit',
    label: 'Audit',
    icon: 'report',
    route: CANONICAL_ROUTES.audit,
    featureGate: null,
  },
  {
    id: 'ai-center',
    label: 'AI Center',
    icon: 'robot',
    route: CANONICAL_ROUTES.aiCommandCenter,
    featureGate: null,
  },
  {
    id: 'admin',
    label: 'Admin',
    icon: 'settings',
    route: CANONICAL_ROUTES.adminOperations,
    featureGate: null,
  },
] satisfies readonly NavItem[]);

const ROLES = EMERGENCY_ROLE_IDS as Record<string, string>;
const ALL_ROLES = Object.freeze(Object.values(ROLES));
const NAV_FEATURE_IDS = Object.freeze({
  reception: 'reception_workspace',
  'command-center': 'emergency_whiteboard',
  whiteboard: 'emergency_whiteboard',
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
  'ai-chief': 'ed_copilot',
  staff: 'staff_command',
  departments: 'department_capacity',
  reports: 'operational_reports',
  settings: 'emergency_settings',
  integrations: 'integration_hub',
  cosmos: 'cosmos_viewer',
  platform: 'platform_navigation',
  pulse: 'department_pulse',
  shift: 'shift_summary',
  fleet: 'fleet_management',
  surveillance: 'surveillance_nexus',
  simulation: 'simulation_academy',
  laboratory: 'laboratory',
  knowledge: 'knowledge_graph',
  audit: 'audit',
  'ai-center': 'ai_command_center',
  admin: 'admin_console',
} as const);

const NAV_REQUIRED_PERMISSIONS: Readonly<Record<string, readonly string[]>> = Object.freeze({
  reception: [CAREDROID_PERMISSIONS.PATIENT_READ],
  whiteboard: [CAREDROID_PERMISSIONS.PATIENT_READ],
  patients: [CAREDROID_PERMISSIONS.PATIENT_READ],
  intake: [CAREDROID_PERMISSIONS.PATIENT_CREATE],
  ems: [CAREDROID_PERMISSIONS.PATIENT_READ],
  queues: [CAREDROID_PERMISSIONS.PATIENT_READ, CAREDROID_PERMISSIONS.TRIAGE_READ],
  reassessment: [CAREDROID_PERMISSIONS.PATIENT_READ, CAREDROID_PERMISSIONS.TRIAGE_READ],
  capacity: [CAREDROID_PERMISSIONS.ANALYTICS_READ],
  referrals: [CAREDROID_PERMISSIONS.PATIENT_READ],
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

const READ_ONLY_NAV_ITEM_IDS = new Set(['whiteboard', 'alerts', 'analytics', 'help', 'audit', 'laboratory']);

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
  NAV_ITEMS.map((item, index) =>
    navigationItem({
      ...item,
      path: item.route,
      featureId: NAV_FEATURE_IDS[item.id as keyof typeof NAV_FEATURE_IDS] || item.id,
      order: index + 1,
      roles: item.roles || rolesForRoute(item.route),
      allowedRoles: item.roles || rolesForRoute(item.route),
      requiredPermissions: NAV_REQUIRED_PERMISSIONS[item.id] || [],
      visibleToProfiles: rolesForRoute(item.route),
      priority: index + 1,
      emergencySafe: item.route.startsWith('/emergency') || item.route === CANONICAL_ROUTES.workspace,
      readOnlyAllowed: READ_ONLY_NAV_ITEM_IDS.has(item.id),
      isEmergencyCore: !UTILITY_NAV_ITEM_IDS.has(item.id),
      mobileLabel: item.id === 'reassessment' ? 'Recheck' : item.label,
      activePaths:
        item.activePaths
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
              ? [CANONICAL_ROUTES.workspace, CANONICAL_ROUTES.workspaces, '/app']
            : undefined,
    }),
  ),
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
    const visibleItems = getPilotCustomerNavigationItems(
      NAVIGATION_ITEMS.filter(
        (item) =>
          canAccessRoute(options.compiledProfile as CompiledCareDroidAccessProfile, item.route) &&
          (!options.compiledProfile?.readOnly || item.readOnlyAllowed),
      ),
    );
    return sortNavigationItemsForRole(visibleItems, options.compiledProfile.role.emergencyRoleId);
  }
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
