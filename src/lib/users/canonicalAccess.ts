import {
  CANONICAL_ROUTE_MAP,
  CANONICAL_ROUTES,
  canRouteRecordIncludeProfile,
  getDefaultRouteForProfile,
  getRouteByPath,
  normalizeRoutePath,
} from '../../config/routes.config';
import {
  EMERGENCY_ACTIONS,
  EMERGENCY_ROLE_IDS,
  getEmergencyRoleDefinition,
  normalizeEmergencyRole,
} from '../../config/emergencyRolePermissions';
import {
  CAREDROID_PERMISSIONS,
  getPermissionsForRole,
  type CareDroidPermission,
} from './permissions';
import {
  CAREDROID_ROLE_LABELS,
  getDashboardWidgets,
  getRoleLabel,
  ROLE_TO_EMERGENCY_ROLE,
} from './roleAccess';
import type {
  AccessScope,
  BackendUserRole,
  CareDroidUserProfile,
  DashboardProfile,
  HospitalRole,
} from './userTypes';

export type CanonicalRoleMapping = Readonly<{
  hospitalRole: HospitalRole;
  emergencyRoleId: string;
  saasRole: string;
  backendRole: BackendUserRole;
  roleProfileId: string;
  aliases: readonly string[];
  readOnly: boolean;
  clinical: boolean;
  admin: boolean;
  dataMinimizationLevel: CareDroidUserProfile['dataMinimizationLevel'];
  breakGlassAllowed: boolean;
  mfaRequired: boolean;
}>;

export type CompiledCareDroidAccessProfile = Readonly<{
  user: CareDroidUserProfile;
  role: CanonicalRoleMapping;
  aliases: readonly string[];
  permissions: readonly string[];
  routeAccess: readonly string[];
  navigationAccess: readonly string[];
  dashboardWidgets: DashboardProfile;
  aiCapabilities: Readonly<{
    canUseAIChief: boolean;
    canRequest: boolean;
    canReview: boolean;
    canOverride: boolean;
    reviewScope: AccessScope;
  }>;
  alertCapabilities: Readonly<{
    canReceiveCriticalAlerts: boolean;
    canAcknowledge: boolean;
    canEscalate: boolean;
    ownershipScope: AccessScope;
  }>;
  staffAssignmentScope: AccessScope;
  dataAccessScope: AccessScope;
  readOnly: boolean;
  emergencyAccess: Readonly<{
    roleId: string;
    allowedActions: readonly string[];
  }>;
  adminAccess: boolean;
}>;

const P = CAREDROID_PERMISSIONS;

export const CAREDROID_ORGANIZATION_ID = 'org-virtual-city-health';
export const CAREDROID_NETWORK_ID = 'network-virtual-city';

export const HOSPITAL_SITE_IDS: Readonly<Record<string, string>> = Object.freeze({
  'Central City Hospital': 'site-central-city',
  'Northside Emergency Centre': 'site-northside',
  'Riverside General Hospital': 'site-riverside',
  "Eastview Children's Hospital": 'site-eastview',
  "Westbridge Women's & Trauma Centre": 'site-westbridge',
});

export const DEPARTMENT_IDS: Readonly<Record<string, string>> = Object.freeze({
  'Emergency Department': 'dept-emergency',
  Triage: 'dept-triage',
  Registration: 'dept-registration',
  ICU: 'dept-icu',
  Cardiology: 'dept-cardiology',
  Neurology: 'dept-neurology',
  Radiology: 'dept-radiology',
  Laboratory: 'dept-laboratory',
  Pharmacy: 'dept-pharmacy',
  Pediatrics: 'dept-pediatrics',
  Obstetrics: 'dept-obstetrics',
  Surgery: 'dept-surgery',
  'Mental Health': 'dept-mental-health',
  Security: 'dept-security',
  Administration: 'dept-administration',
  IT: 'dept-it',
  'Patient Flow': 'dept-patient-flow',
});

const ALL_CAREDROID_ROUTES = Object.freeze([
  ...CANONICAL_ROUTE_MAP.map((route) => route.path),
  CANONICAL_ROUTES.emergencyReception,
  CANONICAL_ROUTES.emergencyCommandCenter,
  CANONICAL_ROUTES.emergencyWhiteboard,
  CANONICAL_ROUTES.emergencyPatients,
  CANONICAL_ROUTES.emergencyJourney,
  CANONICAL_ROUTES.emergencyEms,
  CANONICAL_ROUTES.emergencyDispatch,
  CANONICAL_ROUTES.emergencyEdReadiness,
  CANONICAL_ROUTES.emergencyIntake,
  CANONICAL_ROUTES.emergencyQueues,
  CANONICAL_ROUTES.emergencyReassessment,
  CANONICAL_ROUTES.emergencyCapacity,
  CANONICAL_ROUTES.emergencyBoarding,
  CANONICAL_ROUTES.emergencyReferrals,
  CANONICAL_ROUTES.emergencyAlerts,
  CANONICAL_ROUTES.emergencyCopilot,
  CANONICAL_ROUTES.emergencyDocumentation,
  CANONICAL_ROUTES.emergencyTools,
  CANONICAL_ROUTES.emergencyPulse,
  CANONICAL_ROUTES.emergencyShift,
  CANONICAL_ROUTES.emergencyAnalytics,
  CANONICAL_ROUTES.emergencyDiagnostics,
  CANONICAL_ROUTES.emergencyHandoffs,
  CANONICAL_ROUTES.emergencyReports,
  CANONICAL_ROUTES.emergencySettings,
  CANONICAL_ROUTES.emergencyHelp,
  CANONICAL_ROUTES.triage,
  CANONICAL_ROUTES.workspace,
  CANONICAL_ROUTES.laboratory,
  CANONICAL_ROUTES.audit,
  CANONICAL_ROUTES.aiCommandCenter,
  CANONICAL_ROUTES.adminOperations,
]);

export const CANONICAL_ROLE_CATALOG: Readonly<Record<HospitalRole, CanonicalRoleMapping>> =
  Object.freeze({
    super_admin: role('super_admin', 'admin', 'platform-admin', 'admin', {
      admin: true,
      breakGlassAllowed: true,
      aliases: ['admin', 'super-admin', 'platform-admin'],
    }),
    hospital_admin: role('hospital_admin', 'ed_manager', 'hospital-administrator', 'admin', {
      admin: true,
      dataMinimizationLevel: 'operational',
      aliases: ['hospital-admin', 'hospital-administrator'],
    }),
    ed_director: role('ed_director', 'ed_manager', 'emergency-physician', 'physician', {
      clinical: true,
      admin: true,
      breakGlassAllowed: true,
      aliases: ['ed-director', 'medical-director'],
    }),
    charge_nurse: role('charge_nurse', 'charge_nurse', 'nurse', 'nurse', {
      clinical: true,
      aliases: ['charge-nurse', 'shift-command'],
    }),
    triage_nurse: role('triage_nurse', 'triage_nurse', 'nurse', 'nurse', {
      clinical: true,
      aliases: ['triage-nurse'],
    }),
    registered_nurse: role('registered_nurse', 'triage_nurse', 'nurse', 'nurse', {
      clinical: true,
      aliases: ['registered-nurse', 'rn', 'nurse'],
    }),
    emergency_physician: role('emergency_physician', 'physician', 'emergency-physician', 'physician', {
      clinical: true,
      breakGlassAllowed: true,
      aliases: ['emergency-physician', 'doctor', 'md'],
    }),
    attending_physician: role('attending_physician', 'physician', 'emergency-physician', 'physician', {
      clinical: true,
      breakGlassAllowed: true,
      aliases: ['attending', 'attending-physician'],
    }),
    resident_physician: role('resident_physician', 'physician', 'emergency-physician', 'physician', {
      clinical: true,
      aliases: ['resident', 'resident-physician'],
    }),
    specialist: role('specialist', 'physician', 'cardiologist', 'physician', {
      clinical: true,
      aliases: ['consultant', 'specialist-physician'],
    }),
    paramedic: role('paramedic', 'ems_user', 'ems-user', 'nurse', {
      clinical: true,
      aliases: ['ems', 'ems-user'],
    }),
    dispatcher: role('dispatcher', 'dispatcher', 'dispatcher', 'student', {
      dataMinimizationLevel: 'operational',
      aliases: ['call-taker', '911-operator', 'cad-operator'],
    }),
    ems_coordinator: role('ems_coordinator', 'ems_coordinator', 'ems-coordinator', 'nurse', {
      dataMinimizationLevel: 'operational',
      aliases: ['ems-coordinator', 'ems-operations-manager'],
    }),
    registration_clerk: role('registration_clerk', 'registration_clerk', 'registration-clerk', 'student', {
      dataMinimizationLevel: 'clinical',
      aliases: ['registration-clerk', 'registrar', 'receptionist'],
    }),
    patient_flow_coordinator: role('patient_flow_coordinator', 'ed_manager', 'hospital-administrator', 'admin', {
      dataMinimizationLevel: 'operational',
      aliases: ['patient-flow-coordinator', 'flow-coordinator', 'bed-manager'],
    }),
    lab_technician: role('lab_technician', 'read_only_viewer', 'lab-technician', 'student', {
      readOnly: true,
      dataMinimizationLevel: 'clinical',
      aliases: ['lab-technician'],
    }),
    radiology_technician: role('radiology_technician', 'read_only_viewer', 'lab-technician', 'student', {
      readOnly: true,
      dataMinimizationLevel: 'clinical',
      aliases: ['radiology-technician', 'imaging-technician'],
    }),
    pharmacist: role('pharmacist', 'read_only_viewer', 'pharmacist', 'nurse', {
      dataMinimizationLevel: 'clinical',
      aliases: ['clinical-pharmacist'],
    }),
    social_worker: role('social_worker', 'read_only_viewer', 'nurse', 'student', {
      readOnly: true,
      dataMinimizationLevel: 'clinical',
      aliases: ['social-worker'],
    }),
    security_officer: role('security_officer', 'read_only_viewer', 'compliance-officer', 'student', {
      readOnly: true,
      dataMinimizationLevel: 'metadata_only',
      aliases: ['security-officer'],
    }),
    it_admin: role('it_admin', 'admin', 'platform-admin', 'admin', {
      admin: true,
      dataMinimizationLevel: 'metadata_only',
      aliases: ['it-admin', 'technical-admin'],
    }),
    quality_safety_officer: role('quality_safety_officer', 'read_only_viewer', 'compliance-officer', 'admin', {
      readOnly: true,
      dataMinimizationLevel: 'audit',
      aliases: ['quality-safety-officer', 'quality-officer'],
    }),
    demo_observer: role('demo_observer', 'read_only_viewer', 'demo-observer', 'student', {
      readOnly: true,
      dataMinimizationLevel: 'metadata_only',
      aliases: ['demo-observer', 'read-only-viewer'],
    }),
  });

const ALIAS_TO_HOSPITAL_ROLE: Readonly<Record<string, HospitalRole>> = Object.freeze(
  Object.entries(CANONICAL_ROLE_CATALOG).reduce<Record<string, HospitalRole>>((acc, [roleId, mapping]) => {
    acc[normalizeAlias(roleId)] = roleId as HospitalRole;
    const emergencyAlias = normalizeAlias(mapping.emergencyRoleId);
    const saasAlias = normalizeAlias(mapping.saasRole);
    if (!acc[emergencyAlias]) acc[emergencyAlias] = roleId as HospitalRole;
    if (!acc[saasAlias]) acc[saasAlias] = roleId as HospitalRole;
    mapping.aliases.forEach((alias) => {
      const normalizedAlias = normalizeAlias(alias);
      if (!acc[normalizedAlias]) acc[normalizedAlias] = roleId as HospitalRole;
    });
    return acc;
  }, {
    nurse: 'registered_nurse',
    rn: 'registered_nurse',
    physician: 'emergency_physician',
    admin: 'it_admin',
  }),
);

const ROUTE_REQUIRED_PERMISSIONS: Readonly<Record<string, readonly CareDroidPermission[]>> =
  Object.freeze(
    Object.fromEntries(
      CANONICAL_ROUTE_MAP.flatMap((route) =>
        [route.path, ...(route.aliases || [])].map((path) => [
          normalizeRoutePath(path),
          route.requiredPermissions as readonly CareDroidPermission[],
        ]),
      ),
    ),
  );

// Maps emergency action strings to the CareDroid permission required to perform them.
// null = action is always denied (future module placeholder).
// undefined (key absent) = no CareDroid permission gate; allowed if the emergency role grants it.
// Used in compileCareDroidAccessProfile to filter emergencyAccess.allowedActions so that
// a user whose hospitalRole maps to a higher emergency role (e.g. registered_nurse → triage_nurse)
// cannot perform actions their CareDroid permissions don't support.
const EMERGENCY_ACTION_CAREDROID_PERMISSION: Readonly<Record<string, CareDroidPermission | null>> =
  Object.freeze({
    'patient.create': P.PATIENT_CREATE,
    'patient.demographics.edit': P.PATIENT_UPDATE,
    'patient.transition': P.PATIENT_UPDATE,
    'patient.assignStaff': P.STAFF_ASSIGN,
    'patient.assignRoom': P.PATIENT_ASSIGN,
    'patient.escalate': P.TRIAGE_ESCALATE,
    'patient.discharge': P.PATIENT_DISCHARGE,
    'encounter.create': P.PATIENT_UPDATE,
    'intake.verify': P.PATIENT_CREATE,
    'triage.assign_acuity': P.TRIAGE_CREATE,
    'queue.move': P.PATIENT_UPDATE,
    'vitals.write': P.PATIENT_UPDATE,
    'notes.write': P.PATIENT_UPDATE,
    'flags.manage': P.PATIENT_UPDATE,
    'reassessment.complete': P.TRIAGE_UPDATE,
    'ems.prepareBay': P.PATIENT_READ,
    'ems.convertArrival': P.PATIENT_UPDATE,
    'ems.handoff.complete': P.PATIENT_UPDATE,
    'referral.create': P.PATIENT_ASSIGN,
    'transfers.manage': P.PATIENT_ASSIGN,
    'capacity.manage': P.ANALYTICS_READ,
    'boarding.manage': P.ANALYTICS_READ,
    'workload.reassign': P.STAFF_ASSIGN,
    'reception.escalate': P.PATIENT_CREATE,
    'copilot.use': P.AI_REQUEST,
    'analytics.view': P.ANALYTICS_READ,
    'simulation.run': P.ANALYTICS_READ,
    'settings.manage': P.SETTINGS_UPDATE,
    'display.public.waitboard': P.PATIENT_READ,
    'display.public.publish': P.PATIENT_READ,
    'display.whiteboard.readonly': P.PATIENT_READ,
    // Future module placeholders — denied until implemented
    'federated.manage': null,
    'digitalTwin.run': null,
    'aiGovernance.view': null,
  });

function role(
  hospitalRole: HospitalRole,
  emergencyRoleId: string,
  saasRole: string,
  backendRole: BackendUserRole,
  options: Partial<Omit<CanonicalRoleMapping, 'hospitalRole' | 'emergencyRoleId' | 'saasRole' | 'backendRole' | 'roleProfileId'>> = {},
): CanonicalRoleMapping {
  return Object.freeze({
    hospitalRole,
    emergencyRoleId,
    saasRole,
    backendRole,
    roleProfileId: hospitalRole,
    aliases: Object.freeze(options.aliases || []),
    readOnly: Boolean(options.readOnly),
    clinical: Boolean(options.clinical),
    admin: Boolean(options.admin),
    dataMinimizationLevel: options.dataMinimizationLevel || 'none',
    breakGlassAllowed: Boolean(options.breakGlassAllowed),
    mfaRequired: options.mfaRequired ?? Boolean(options.admin),
  });
}

function normalizeAlias(value: string): string {
  return String(value || '').trim().toLowerCase().replace(/-/g, '_');
}

function filterActionsByCareDroidPermissions(
  actions: readonly string[],
  permissions: readonly string[],
): readonly string[] {
  return Object.freeze(
    actions.filter((action) => {
      const required = EMERGENCY_ACTION_CAREDROID_PERMISSION[action];
      if (required === null) return false;
      if (required === undefined) return true;
      return (permissions as string[]).includes(required);
    }),
  );
}

function unique<T>(values: readonly T[]): readonly T[] {
  return Object.freeze([...new Set(values)]);
}

function departmentScope(profile: Pick<CareDroidUserProfile, 'departmentId' | 'hospitalSiteId' | 'assignedPatients'>, scope: AccessScope['scope']): AccessScope {
  return Object.freeze({
    scope,
    departments: profile.departmentId ? Object.freeze([profile.departmentId]) : undefined,
    sites: profile.hospitalSiteId ? Object.freeze([profile.hospitalSiteId]) : undefined,
    patientIds: profile.assignedPatients?.length ? Object.freeze([...profile.assignedPatients]) : undefined,
  });
}

function buildRouteAccess(roleMapping: CanonicalRoleMapping, permissions: readonly string[]): readonly string[] {
  const emergencyDefinition = getEmergencyRoleDefinition(roleMapping.emergencyRoleId);
  const emergencyRoutes = emergencyDefinition?.routes || [];
  const permissionRoutes = ALL_CAREDROID_ROUTES.filter((route) => {
    const required = ROUTE_REQUIRED_PERMISSIONS[route] || [];
    return required.every((permission) => permissions.includes(permission));
  });
  const routeAccess = unique([...emergencyRoutes, ...permissionRoutes]);

  if (roleMapping.readOnly) {
    return routeAccess.filter((route) =>
      [
        CANONICAL_ROUTES.emergencyWhiteboard,
        CANONICAL_ROUTES.emergencyCommandCenter,
        CANONICAL_ROUTES.emergencyAlerts,
        CANONICAL_ROUTES.emergencyAnalytics,
        CANONICAL_ROUTES.emergencyReports,
        CANONICAL_ROUTES.emergencyHelp,
        CANONICAL_ROUTES.audit,
        CANONICAL_ROUTES.laboratory,
        CANONICAL_ROUTES.emergencyDiagnostics,
        CANONICAL_ROUTES.emergencyPatients,
      ].includes(route),
    );
  }

  return routeAccess;
}

function buildDashboardProfile(role: HospitalRole, defaultRoute: string): DashboardProfile {
  const widgets = getDashboardWidgets(role);
  return Object.freeze({
    defaultRoute,
    primaryWidgets: widgets.primary,
    secondaryWidgets: widgets.secondary || [],
  });
}

function routeAccessMatches(accessRoute: string, requestedPath: string): boolean {
  const normalizedAccess = normalizeRoutePath(accessRoute);
  const normalizedRequested = normalizeRoutePath(requestedPath);
  if (normalizedRequested === normalizedAccess || normalizedRequested.startsWith(`${normalizedAccess}/`)) {
    return true;
  }
  const routeRecord = getRouteByPath(normalizedRequested);
  return Boolean(
    routeRecord &&
      [routeRecord.path, routeRecord.redirectTo, ...(routeRecord.aliases || [])]
        .filter(Boolean)
        .some((path) => normalizeRoutePath(path) === normalizedAccess),
  );
}

function pickDefaultRoute(role: HospitalRole, routeAccess: readonly string[]): string {
  const preferred = getDefaultRouteForProfile(role);
  if (routeAccess.some((route) => routeAccessMatches(route, preferred))) return preferred;
  const preferredRecord = getRouteByPath(preferred);
  if (
    preferredRecord?.redirectTo &&
    routeAccess.some((route) => routeAccessMatches(route, preferredRecord.redirectTo))
  ) {
    return preferred;
  }
  return routeAccess[0] || CANONICAL_ROUTES.emergencyReception;
}

export function resolveHospitalRole(roleLike: unknown): HospitalRole {
  const normalized = normalizeAlias(String(roleLike || ''));
  return ALIAS_TO_HOSPITAL_ROLE[normalized] || 'demo_observer';
}

export function getCanonicalRoleMapping(roleLike: unknown): CanonicalRoleMapping {
  return CANONICAL_ROLE_CATALOG[resolveHospitalRole(roleLike)];
}

export function normalizeCareDroidProfile(
  partial: Partial<CareDroidUserProfile> & Pick<CareDroidUserProfile, 'id' | 'employeeId' | 'fullName' | 'preferredName' | 'email' | 'phone' | 'avatarUrl' | 'role' | 'title' | 'department' | 'hospitalSite' | 'cityZone' | 'shiftStatus' | 'shiftStart' | 'shiftEnd' | 'licenseNumber' | 'specialties' | 'availabilityStatus' | 'escalationLevel'>,
): CareDroidUserProfile {
  const roleMapping = getCanonicalRoleMapping(partial.role);
  const permissions = unique([...(partial.permissions || []), ...getPermissionsForRole(roleMapping.hospitalRole)]);
  const assignedPatients = Object.freeze([...(partial.assignedPatients || [])]);
  const baseProfile = {
    ...partial,
    organizationId: partial.organizationId || CAREDROID_ORGANIZATION_ID,
    networkId: partial.networkId || CAREDROID_NETWORK_ID,
    hospitalSiteId: partial.hospitalSiteId || HOSPITAL_SITE_IDS[partial.hospitalSite] || normalizeAlias(partial.hospitalSite),
    departmentId: partial.departmentId || DEPARTMENT_IDS[partial.department] || normalizeAlias(partial.department),
    unitId: partial.unitId || `${DEPARTMENT_IDS[partial.department] || normalizeAlias(partial.department)}-unit`,
    careTeamIds: Object.freeze([...(partial.careTeamIds || [])]),
    role: roleMapping.hospitalRole,
    emergencyRoleId: partial.emergencyRoleId || roleMapping.emergencyRoleId,
    saasRole: partial.saasRole || roleMapping.saasRole,
    backendRole: partial.backendRole || roleMapping.backendRole,
    roleProfileId: partial.roleProfileId || roleMapping.roleProfileId,
    credentials: Object.freeze([...(partial.credentials || deriveCredentials(partial, roleMapping))]),
    notificationChannels: Object.freeze([
      ...(partial.notificationChannels || [{ type: 'in_app' as const, value: partial.id }]),
    ]),
    assignedPatients,
    permissions,
    currentLoad: partial.currentLoad ?? assignedPatients.length,
    readOnly: partial.readOnly ?? roleMapping.readOnly,
    mfaRequired: partial.mfaRequired ?? roleMapping.mfaRequired,
    breakGlassAllowed: partial.breakGlassAllowed ?? roleMapping.breakGlassAllowed,
    dataMinimizationLevel: partial.dataMinimizationLevel || roleMapping.dataMinimizationLevel,
    canReceiveCriticalAlerts:
      partial.canReceiveCriticalAlerts ??
      (permissions.includes(P.ALERT_ACKNOWLEDGE) && !roleMapping.readOnly),
    canUseAIChief:
      partial.canUseAIChief ??
      ((permissions.includes(P.AI_REQUEST) || permissions.includes(P.AI_REVIEW)) && !roleMapping.readOnly),
    lastActiveAt: partial.lastActiveAt || new Date().toISOString(),
  } as CareDroidUserProfile;

  const routeAccess = buildRouteAccess(roleMapping, permissions);
  const dashboardProfile = buildDashboardProfile(
    roleMapping.hospitalRole,
    pickDefaultRoute(roleMapping.hospitalRole, routeAccess),
  );
  const patientScope = partial.patientAccessScope || departmentScope(baseProfile, roleMapping.admin ? 'site' : roleMapping.clinical ? 'department' : 'assigned');

  return Object.freeze({
    ...baseProfile,
    routeAccess,
    dashboardProfile,
    alertOwnershipScope:
      partial.alertOwnershipScope || departmentScope(baseProfile, roleMapping.admin ? 'site' : 'department'),
    aiReviewScope:
      partial.aiReviewScope || departmentScope(baseProfile, roleMapping.clinical ? 'department' : 'none'),
    patientAccessScope: patientScope,
    auditScope:
      partial.auditScope || departmentScope(baseProfile, roleMapping.admin || roleMapping.hospitalRole === 'quality_safety_officer' ? 'site' : 'self'),
  });
}

function deriveCredentials(
  profile: Partial<CareDroidUserProfile>,
  roleMapping: CanonicalRoleMapping,
): readonly string[] {
  if (profile.credentials?.length) return profile.credentials;
  if (profile.licenseNumber) {
    if (roleMapping.backendRole === 'physician') return ['MD'];
    if (roleMapping.backendRole === 'nurse') return ['RN'];
  }
  return roleMapping.admin ? ['Admin'] : [];
}

export function compileCareDroidAccessProfile(profile: CareDroidUserProfile): CompiledCareDroidAccessProfile {
  const user = normalizeCareDroidProfile(profile);
  const roleMapping = getCanonicalRoleMapping(user.role);
  const permissions = user.permissions;
  const emergencyDefinitionActions = getEmergencyRoleDefinition(user.emergencyRoleId)?.actions || [];
  const allowedActions = filterActionsByCareDroidPermissions(emergencyDefinitionActions, permissions);
  return Object.freeze({
    user,
    role: roleMapping,
    aliases: unique([user.role, user.emergencyRoleId, user.saasRole, user.backendRole, ...roleMapping.aliases]),
    permissions,
    routeAccess: user.routeAccess,
    navigationAccess: user.routeAccess,
    dashboardWidgets: user.dashboardProfile,
    aiCapabilities: Object.freeze({
      canUseAIChief: user.canUseAIChief,
      canRequest: permissions.includes(P.AI_REQUEST),
      canReview: permissions.includes(P.AI_REVIEW),
      canOverride: permissions.includes(P.AI_OVERRIDE) && roleMapping.clinical,
      reviewScope: user.aiReviewScope,
    }),
    alertCapabilities: Object.freeze({
      canReceiveCriticalAlerts: user.canReceiveCriticalAlerts,
      canAcknowledge: permissions.includes(P.ALERT_ACKNOWLEDGE),
      canEscalate: permissions.includes(P.ALERT_ESCALATE),
      ownershipScope: user.alertOwnershipScope,
    }),
    staffAssignmentScope: departmentScope(user, permissions.includes(P.STAFF_ASSIGN) ? 'department' : 'none'),
    dataAccessScope: user.patientAccessScope,
    readOnly: user.readOnly,
    emergencyAccess: Object.freeze({
      roleId: user.emergencyRoleId,
      allowedActions,
    }),
    adminAccess: roleMapping.admin,
  });
}

export function canAccessRoute(
  compiledProfile: CompiledCareDroidAccessProfile | CareDroidUserProfile,
  route: string | { path?: string; route?: string; redirectTo?: string; requiredPermissions?: readonly string[]; readOnlyAllowed?: boolean },
): boolean {
  const profile =
    'navigationAccess' in compiledProfile
      ? compiledProfile
      : compileCareDroidAccessProfile(compiledProfile);
  const requestedPath =
    typeof route === 'string' ? route : route?.path || route?.route || route?.redirectTo || '';
  const normalizedPath = normalizeRoutePath(requestedPath);
  if (!normalizedPath) return false;
  const routeRecord = getRouteByPath(normalizedPath);
  const routeAllowed = profile.routeAccess.some((accessRoute) =>
    routeAccessMatches(accessRoute, normalizedPath),
  );
  const roleAllowed = routeRecord ? canRouteRecordIncludeProfile(routeRecord, profile) : false;
  if (!routeAllowed && !roleAllowed) return false;
  if (profile.readOnly && routeRecord?.readOnlyAllowed === false) return false;
  const required =
    (typeof route !== 'string' ? route?.requiredPermissions : undefined) ||
    routeRecord?.requiredPermissions ||
    ROUTE_REQUIRED_PERMISSIONS[normalizedPath] ||
    [];
  return required.every((permission) => (profile.permissions || []).includes(permission));
}

export function hasPermission(
  compiledProfile: CompiledCareDroidAccessProfile | CareDroidUserProfile,
  permission: string,
): boolean {
  const profile =
    'navigationAccess' in compiledProfile
      ? compiledProfile
      : compileCareDroidAccessProfile(compiledProfile);
  return (profile.permissions || []).includes(permission);
}

export function hasAnyPermission(
  compiledProfile: CompiledCareDroidAccessProfile | CareDroidUserProfile,
  permissions: readonly string[],
): boolean {
  return permissions.some((permission) => hasPermission(compiledProfile, permission));
}

export function hasAllPermissions(
  compiledProfile: CompiledCareDroidAccessProfile | CareDroidUserProfile,
  permissions: readonly string[],
): boolean {
  return permissions.every((permission) => hasPermission(compiledProfile, permission));
}

export function canSeeNavigationItem(
  compiledProfile: CompiledCareDroidAccessProfile,
  item: {
    route?: string;
    path?: string;
    requiredPermissions?: readonly string[];
    readOnlyAllowed?: boolean;
  },
): boolean {
  const route = item.route || item.path;
  if (!route || !canAccessRoute(compiledProfile, route)) return false;
  if (compiledProfile.readOnly && item.readOnlyAllowed === false) return false;
  return hasAllPermissions(compiledProfile, item.requiredPermissions || []);
}

export function canMutateWithCompiledProfile(
  compiledProfile: CompiledCareDroidAccessProfile,
  action?: string,
): boolean {
  if (compiledProfile.readOnly) return false;
  if (!action) return !compiledProfile.readOnly;
  if (
    [
      EMERGENCY_ACTIONS.triage,
      EMERGENCY_ACTIONS.dischargePatient,
      EMERGENCY_ACTIONS.completeDisposition,
      EMERGENCY_ACTIONS.manageFlags,
    ].includes(action as any)
  ) {
    return compiledProfile.role.clinical && compiledProfile.emergencyAccess.allowedActions.includes(action);
  }
  return compiledProfile.emergencyAccess.allowedActions.includes(action);
}

export function canPerformClinicalAction(
  compiledProfile: CompiledCareDroidAccessProfile,
  action: string,
): boolean {
  return compiledProfile.role.clinical && canMutateWithCompiledProfile(compiledProfile, action);
}

export function canReviewAI(compiledProfile: CompiledCareDroidAccessProfile): boolean {
  return !compiledProfile.readOnly && compiledProfile.aiCapabilities.canReview;
}

export function canOwnAlert(
  compiledProfile: CompiledCareDroidAccessProfile,
  ownerRole?: string,
): boolean {
  if (compiledProfile.readOnly || !compiledProfile.alertCapabilities.canAcknowledge) return false;
  if (!ownerRole) return true;
  return resolveHospitalRole(ownerRole) === compiledProfile.role.hospitalRole;
}

export function canMutatePatient(compiledProfile: CompiledCareDroidAccessProfile): boolean {
  if (compiledProfile.readOnly) return false;
  return hasAnyPermission(compiledProfile, [
    P.PATIENT_CREATE,
    P.PATIENT_UPDATE,
    P.PATIENT_ASSIGN,
    P.PATIENT_DISCHARGE,
  ]);
}

export function getCompiledRoleLabel(roleLike: unknown): string {
  const role = resolveHospitalRole(roleLike);
  return CAREDROID_ROLE_LABELS[role] || getRoleLabel(role);
}

export function emergencyRoleForHospitalRole(role: HospitalRole): string {
  return CANONICAL_ROLE_CATALOG[role]?.emergencyRoleId || ROLE_TO_EMERGENCY_ROLE[role] || EMERGENCY_ROLE_IDS.readOnlyViewer;
}

export function normalizeCanonicalEmergencyRole(roleLike: unknown): string {
  const hospitalRole = resolveHospitalRole(roleLike);
  const mapped = CANONICAL_ROLE_CATALOG[hospitalRole]?.emergencyRoleId;
  return mapped || normalizeEmergencyRole(roleLike);
}
