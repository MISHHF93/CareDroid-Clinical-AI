/**
 * Canonical TrackMind Nexus role catalog — 20 racetrack operating personas.
 * Normalize legacy SaaS / governance aliases via TRACKMIND_ROLE_ALIASES.
 */

export const TRACKMIND_ROLE_ID = Object.freeze({
  platformSuperAdmin: 'platform_super_admin',
  organizationAdmin: 'organization_admin',
  racetrackAdmin: 'racetrack_admin',
  raceDayOperationsManager: 'race_day_operations_manager',
  steward: 'steward',
  starterRaceOfficial: 'starter_race_official',
  paddockOfficial: 'paddock_official',
  equineWelfareOfficer: 'equine_welfare_officer',
  veterinarian: 'veterinarian',
  trainerLiaison: 'trainer_liaison',
  securityManager: 'security_manager',
  facilitiesManager: 'facilities_manager',
  complianceOfficer: 'compliance_officer',
  financeManager: 'finance_manager',
  ticketingFanExperienceManager: 'ticketing_fan_experience_manager',
  executiveLeadership: 'executive_leadership',
  auditorRegulator: 'auditor_regulator',
  dataAnalyticsUser: 'data_analytics_user',
  supportInternalOperator: 'support_internal_operator',
  genericStaff: 'generic_staff',
} as const);

export type TrackMindRoleId = (typeof TRACKMIND_ROLE_ID)[keyof typeof TRACKMIND_ROLE_ID];

export const TRACKMIND_SCOPE = Object.freeze({
  platform: 'platform',
  federation: 'federation',
  organization: 'organization',
  racetrack: 'racetrack',
  assigned: 'assigned',
} as const);

export type TrackMindScope = (typeof TRACKMIND_SCOPE)[keyof typeof TRACKMIND_SCOPE];

export const TRACKMIND_ROLE_DOMAIN = Object.freeze({
  platformAdmin: 'platform_admin',
  governance: 'governance',
  raceDayOps: 'race_day_ops',
  stewarding: 'stewarding',
  racingControl: 'racing_control',
  paddock: 'paddock',
  equineWelfare: 'equine_welfare',
  veterinary: 'veterinary',
  horseOps: 'horse_ops',
  security: 'security',
  facilities: 'facilities',
  compliance: 'compliance',
  finance: 'finance',
  fanExperience: 'fan_experience',
  executive: 'executive',
  audit: 'audit',
  analytics: 'analytics',
  support: 'support',
  limited: 'limited',
} as const);

export type TrackMindRoleDomain =
  (typeof TRACKMIND_ROLE_DOMAIN)[keyof typeof TRACKMIND_ROLE_DOMAIN];

export type TrackMindRoleDefinition = Readonly<{
  id: TrackMindRoleId;
  label: string;
  shortLabel: string;
  description: string;
  domain: TrackMindRoleDomain;
  primaryScope: TrackMindScope;
  readOnly: boolean;
  owningRoleGroup: string;
}>;

const R = TRACKMIND_ROLE_ID;

export const TRACKMIND_ROLE_DEFINITIONS: Record<TrackMindRoleId, TrackMindRoleDefinition> =
  Object.freeze({
    [R.platformSuperAdmin]: Object.freeze({
      id: R.platformSuperAdmin,
      label: 'Platform Super Admin',
      shortLabel: 'Platform Admin',
      description:
        'Global tenant management, module entitlements, platform observability, and support tooling.',
      domain: TRACKMIND_ROLE_DOMAIN.platformAdmin,
      primaryScope: TRACKMIND_SCOPE.platform,
      readOnly: false,
      owningRoleGroup: 'platform_administration',
    }),
    [R.organizationAdmin]: Object.freeze({
      id: R.organizationAdmin,
      label: 'Organization Admin',
      shortLabel: 'Org Admin',
      description:
        'Organization governance, racetrack portfolio, users, roles, and executive dashboards.',
      domain: TRACKMIND_ROLE_DOMAIN.governance,
      primaryScope: TRACKMIND_SCOPE.organization,
      readOnly: false,
      owningRoleGroup: 'organization_governance',
    }),
    [R.racetrackAdmin]: Object.freeze({
      id: R.racetrackAdmin,
      label: 'Racetrack Admin',
      shortLabel: 'Track Admin',
      description: 'Local racetrack administration, operational configuration, and audit export.',
      domain: TRACKMIND_ROLE_DOMAIN.governance,
      primaryScope: TRACKMIND_SCOPE.racetrack,
      readOnly: false,
      owningRoleGroup: 'racetrack_administration',
    }),
    [R.raceDayOperationsManager]: Object.freeze({
      id: R.raceDayOperationsManager,
      label: 'Race-Day Operations Manager',
      shortLabel: 'Race-Day Ops',
      description:
        'Race-day command, readiness, incidents, approvals queue, and live operational timeline.',
      domain: TRACKMIND_ROLE_DOMAIN.raceDayOps,
      primaryScope: TRACKMIND_SCOPE.racetrack,
      readOnly: false,
      owningRoleGroup: 'race_day_operations',
    }),
    [R.steward]: Object.freeze({
      id: R.steward,
      label: 'Steward',
      shortLabel: 'Steward',
      description:
        'Steward command center, inquiries, incidents, evidence review, and governed decisions.',
      domain: TRACKMIND_ROLE_DOMAIN.stewarding,
      primaryScope: TRACKMIND_SCOPE.racetrack,
      readOnly: false,
      owningRoleGroup: 'stewarding',
    }),
    [R.starterRaceOfficial]: Object.freeze({
      id: R.starterRaceOfficial,
      label: 'Starter / Race Official',
      shortLabel: 'Starter',
      description:
        'Starting gate readiness, race flow indicators, and official race-day status updates.',
      domain: TRACKMIND_ROLE_DOMAIN.racingControl,
      primaryScope: TRACKMIND_SCOPE.racetrack,
      readOnly: false,
      owningRoleGroup: 'racing_control',
    }),
    [R.paddockOfficial]: Object.freeze({
      id: R.paddockOfficial,
      label: 'Paddock Official',
      shortLabel: 'Paddock',
      description:
        'Paddock operations, horse arrivals, inspections, readiness checks, and paddock incidents.',
      domain: TRACKMIND_ROLE_DOMAIN.paddock,
      primaryScope: TRACKMIND_SCOPE.racetrack,
      readOnly: false,
      owningRoleGroup: 'paddock_operations',
    }),
    [R.equineWelfareOfficer]: Object.freeze({
      id: R.equineWelfareOfficer,
      label: 'Equine Welfare Officer',
      shortLabel: 'Welfare',
      description:
        'Welfare observations, horse lifecycle signals, restrictions, and welfare incidents.',
      domain: TRACKMIND_ROLE_DOMAIN.equineWelfare,
      primaryScope: TRACKMIND_SCOPE.racetrack,
      readOnly: false,
      owningRoleGroup: 'equine_welfare',
    }),
    [R.veterinarian]: Object.freeze({
      id: R.veterinarian,
      label: 'Veterinarian',
      shortLabel: 'Vet',
      description:
        'Veterinary records, examinations, clearance metadata, and privacy-scoped medical data.',
      domain: TRACKMIND_ROLE_DOMAIN.veterinary,
      primaryScope: TRACKMIND_SCOPE.racetrack,
      readOnly: false,
      owningRoleGroup: 'veterinary_medical',
    }),
    [R.trainerLiaison]: Object.freeze({
      id: R.trainerLiaison,
      label: 'Trainer Liaison / Horse Operations Coordinator',
      shortLabel: 'Horse Ops',
      description:
        'Horse profile operations, trainer assignments, entries, logistics, and transport records.',
      domain: TRACKMIND_ROLE_DOMAIN.horseOps,
      primaryScope: TRACKMIND_SCOPE.racetrack,
      readOnly: false,
      owningRoleGroup: 'horse_operations',
    }),
    [R.securityManager]: Object.freeze({
      id: R.securityManager,
      label: 'Security Manager',
      shortLabel: 'Security',
      description: 'Restricted zones, access events, security incidents, and perimeter alerts.',
      domain: TRACKMIND_ROLE_DOMAIN.security,
      primaryScope: TRACKMIND_SCOPE.racetrack,
      readOnly: false,
      owningRoleGroup: 'security_operations',
    }),
    [R.facilitiesManager]: Object.freeze({
      id: R.facilitiesManager,
      label: 'Facilities Manager',
      shortLabel: 'Facilities',
      description: 'Facility readiness, inspections, maintenance, work orders, and surface status.',
      domain: TRACKMIND_ROLE_DOMAIN.facilities,
      primaryScope: TRACKMIND_SCOPE.racetrack,
      readOnly: false,
      owningRoleGroup: 'facilities_operations',
    }),
    [R.complianceOfficer]: Object.freeze({
      id: R.complianceOfficer,
      label: 'Compliance Officer',
      shortLabel: 'Compliance',
      description: 'Policy registry, compliance evidence, control mappings, and audit exports.',
      domain: TRACKMIND_ROLE_DOMAIN.compliance,
      primaryScope: TRACKMIND_SCOPE.organization,
      readOnly: false,
      owningRoleGroup: 'compliance',
    }),
    [R.financeManager]: Object.freeze({
      id: R.financeManager,
      label: 'Finance Manager',
      shortLabel: 'Finance',
      description: 'Revenue and cost dashboards, payout governance, and financial audit support.',
      domain: TRACKMIND_ROLE_DOMAIN.finance,
      primaryScope: TRACKMIND_SCOPE.organization,
      readOnly: false,
      owningRoleGroup: 'finance',
    }),
    [R.ticketingFanExperienceManager]: Object.freeze({
      id: R.ticketingFanExperienceManager,
      label: 'Ticketing / Fan Experience Manager',
      shortLabel: 'Fan Experience',
      description: 'Ticketing, attendance, hospitality, guest services, and fan analytics.',
      domain: TRACKMIND_ROLE_DOMAIN.fanExperience,
      primaryScope: TRACKMIND_SCOPE.racetrack,
      readOnly: false,
      owningRoleGroup: 'fan_experience',
    }),
    [R.executiveLeadership]: Object.freeze({
      id: R.executiveLeadership,
      label: 'Executive / Track Leadership',
      shortLabel: 'Executive',
      description:
        'Executive dashboard, operational KPIs, compliance posture, and federation benchmarking.',
      domain: TRACKMIND_ROLE_DOMAIN.executive,
      primaryScope: TRACKMIND_SCOPE.organization,
      readOnly: true,
      owningRoleGroup: 'executive',
    }),
    [R.auditorRegulator]: Object.freeze({
      id: R.auditorRegulator,
      label: 'Auditor / Regulator / Read-Only Reviewer',
      shortLabel: 'Auditor',
      description:
        'Read-only audit trails, evidence packets, approvals history, and immutable history views.',
      domain: TRACKMIND_ROLE_DOMAIN.audit,
      primaryScope: TRACKMIND_SCOPE.federation,
      readOnly: true,
      owningRoleGroup: 'audit_regulator',
    }),
    [R.dataAnalyticsUser]: Object.freeze({
      id: R.dataAnalyticsUser,
      label: 'Data / Analytics User',
      shortLabel: 'Analytics',
      description: 'KPI dashboards, trend analysis, data quality views, and benchmarking reports.',
      domain: TRACKMIND_ROLE_DOMAIN.analytics,
      primaryScope: TRACKMIND_SCOPE.organization,
      readOnly: true,
      owningRoleGroup: 'analytics',
    }),
    [R.supportInternalOperator]: Object.freeze({
      id: R.supportInternalOperator,
      label: 'Support / Internal Operator',
      shortLabel: 'Support',
      description: 'Customer support tooling, tenant troubleshooting, and governed diagnostics.',
      domain: TRACKMIND_ROLE_DOMAIN.support,
      primaryScope: TRACKMIND_SCOPE.platform,
      readOnly: false,
      owningRoleGroup: 'support_operations',
    }),
    [R.genericStaff]: Object.freeze({
      id: R.genericStaff,
      label: 'Generic Staff / Limited User',
      shortLabel: 'Staff',
      description: 'Narrow operational tasks, assigned forms, and limited dashboards.',
      domain: TRACKMIND_ROLE_DOMAIN.limited,
      primaryScope: TRACKMIND_SCOPE.assigned,
      readOnly: false,
      owningRoleGroup: 'limited_staff',
    }),
  });

/** Legacy SaaS, governance, and free-text aliases → canonical TrackMind role id */
export const TRACKMIND_ROLE_ALIASES: Record<string, TrackMindRoleId> = Object.freeze({
  platform_admin: R.platformSuperAdmin,
  'platform-admin': R.platformSuperAdmin,
  super_admin: R.platformSuperAdmin,
  admin: R.racetrackAdmin,
  hospital_administrator: R.organizationAdmin,
  'hospital-administrator': R.organizationAdmin,
  organization_admin: R.organizationAdmin,
  org_admin: R.organizationAdmin,
  racetrack_admin: R.racetrackAdmin,
  track_admin: R.racetrackAdmin,
  race_day_manager: R.raceDayOperationsManager,
  race_day_operations_manager: R.raceDayOperationsManager,
  operations_manager: R.raceDayOperationsManager,
  track_director: R.raceDayOperationsManager,
  steward: R.steward,
  racing_steward: R.steward,
  starter: R.starterRaceOfficial,
  race_official: R.starterRaceOfficial,
  starter_race_official: R.starterRaceOfficial,
  paddock_official: R.paddockOfficial,
  paddock_clerk: R.paddockOfficial,
  equine_welfare_officer: R.equineWelfareOfficer,
  welfare_officer: R.equineWelfareOfficer,
  track_veterinarian: R.veterinarian,
  veterinarian: R.veterinarian,
  vet: R.veterinarian,
  trainer_liaison: R.trainerLiaison,
  horse_operations_coordinator: R.trainerLiaison,
  security_manager: R.securityManager,
  facilities_manager: R.facilitiesManager,
  fleet_operator: R.facilitiesManager,
  compliance_officer: R.complianceOfficer,
  'compliance-officer': R.complianceOfficer,
  finance_manager: R.financeManager,
  ticketing_manager: R.ticketingFanExperienceManager,
  fan_experience_manager: R.ticketingFanExperienceManager,
  executive: R.executiveLeadership,
  track_leadership: R.executiveLeadership,
  auditor: R.auditorRegulator,
  regulator: R.auditorRegulator,
  read_only_reviewer: R.auditorRegulator,
  read_only_viewer: R.auditorRegulator,
  data_analyst: R.dataAnalyticsUser,
  analytics_user: R.dataAnalyticsUser,
  researcher: R.dataAnalyticsUser,
  support_operator: R.supportInternalOperator,
  internal_support: R.supportInternalOperator,
  generic_staff: R.genericStaff,
  limited_user: R.genericStaff,
  student: R.genericStaff,
});

export const TRACKMIND_ROLE_OPTIONS = Object.freeze(
  Object.values(TRACKMIND_ROLE_DEFINITIONS).map((role) =>
    Object.freeze({ id: role.id, label: role.label, description: role.description }),
  ),
);

export function normalizeTrackMindRoleId(role: string | null | undefined): TrackMindRoleId {
  const raw = String(role || '')
    .trim()
    .toLowerCase()
    .replace(/-/g, '_');
  if (!raw) return R.genericStaff;
  if (raw in TRACKMIND_ROLE_DEFINITIONS) return raw as TrackMindRoleId;
  if (TRACKMIND_ROLE_ALIASES[raw]) return TRACKMIND_ROLE_ALIASES[raw];
  return R.genericStaff;
}

export function getTrackMindRoleDefinition(
  role: string | null | undefined,
): TrackMindRoleDefinition {
  return TRACKMIND_ROLE_DEFINITIONS[normalizeTrackMindRoleId(role)];
}

export function isTrackMindReadOnlyRole(role: string | null | undefined): boolean {
  return getTrackMindRoleDefinition(role).readOnly;
}

export function listTrackMindRoleIds(): TrackMindRoleId[] {
  return Object.values(TRACKMIND_ROLE_ID);
}
