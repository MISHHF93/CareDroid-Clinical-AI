/**
 * User profile copy & function registry — stacks UI text and capabilities per SaaS / ED role.
 */
import { EMERGENCY_ROLE_IDS, normalizeEmergencyRole } from './emergencyRolePermissions';
import { ED_PERSONA_LABELS } from './emergencyRoleScreenMatrix';
import {
  buildUserProfileAccessSummary,
  resolveUserProfileFromSaasRole,
  type UserProfileAccessSummary,
} from './userProfileCatalog';
import { SAAS_USER_ROLES, normalizeSaasRole, type SaasUserRole } from './saasProfileConstants';

export type ProfileFunctionId =
  | 'register-patient'
  | 'verify-identity'
  | 'triage-acuity'
  | 'assign-acuity'
  | 'manage-waiting-room'
  | 'reassessment'
  | 'provider-rounds'
  | 'disposition'
  | 'ems-handoff'
  | 'command-throughput'
  | 'capacity-boarding'
  | 'clinical-tools'
  | 'copilot-capture'
  | 'analytics-view'
  | 'admin-settings'
  | 'governance-audit'
  | 'fleet-ops'
  | 'lab-tools'
  | 'pharmacy-tools'
  | 'education-sim'
  | 'trackmind-ops'
  | 'public-display'
  | 'read-only-board';

export type ProfileFunctionDefinition = Readonly<{
  id: ProfileFunctionId;
  label: string;
  description: string;
}>;

export type ProfileCopyStack = Readonly<{
  saasRole: string;
  emergencyRoleId: string | null;
  personaTitle: string;
  workspaceEyebrow: string;
  workspaceDescription: string;
  profileShellSubtitle: string;
  copilotIntro: string;
  primaryFunctions: readonly ProfileFunctionDefinition[];
}>;

export const PROFILE_FUNCTION_DEFINITIONS: Readonly<Record<ProfileFunctionId, ProfileFunctionDefinition>> =
  Object.freeze({
    'register-patient': {
      id: 'register-patient',
      label: 'Register patients',
      description: 'Walk-in, ambulance, and appointment arrivals with identity capture.',
    },
    'verify-identity': {
      id: 'verify-identity',
      label: 'Verify identity & documents',
      description: 'ID check, duplicate review, and registration completion.',
    },
    'triage-acuity': {
      id: 'triage-acuity',
      label: 'Run triage queues',
      description: 'Pre-triage lists, breach timers, and acuity assignment.',
    },
    'assign-acuity': {
      id: 'assign-acuity',
      label: 'Assign acuity & flags',
      description: 'CTAS level, high-risk complaints, and escalation triggers.',
    },
    'manage-waiting-room': {
      id: 'manage-waiting-room',
      label: 'Manage waiting room flow',
      description: 'Fit-to-wait, LWBS risk, deterioration watch, and bed placement.',
    },
    reassessment: {
      id: 'reassessment',
      label: 'Reassessment timers',
      description: 'Due/overdue reassessment visibility and nurse contact logging.',
    },
    'provider-rounds': {
      id: 'provider-rounds',
      label: 'Provider rounds & orders',
      description: 'Whiteboard review, who-next, vitals, and clinical documentation.',
    },
    disposition: {
      id: 'disposition',
      label: 'Disposition planning',
      description: 'Admission, discharge, transfer, and referral coordination.',
    },
    'ems-handoff': {
      id: 'ems-handoff',
      label: 'EMS offload & handoff',
      description: 'Ambulance tracker, checklist completion, and reception convert.',
    },
    'command-throughput': {
      id: 'command-throughput',
      label: 'Command throughput',
      description: 'Department KPIs, bottlenecks, staffing, and operational moves.',
    },
    'capacity-boarding': {
      id: 'capacity-boarding',
      label: 'Capacity & boarding',
      description: 'Bed pressure, boarders, and offload timing.',
    },
    'clinical-tools': {
      id: 'clinical-tools',
      label: 'Clinical calculators & tools',
      description: 'Scores, protocols, drug checks, and decision support.',
    },
    'copilot-capture': {
      id: 'copilot-capture',
      label: 'CareDroid copilot capture',
      description: 'Voice and text capture of decisions, handoffs, and reassessments.',
    },
    'analytics-view': {
      id: 'analytics-view',
      label: 'Analytics & reporting',
      description: 'Shift metrics, throughput analytics, and operational exports.',
    },
    'admin-settings': {
      id: 'admin-settings',
      label: 'Admin & tenant settings',
      description: 'Role assignment, workflows, invitations, and tenant configuration.',
    },
    'governance-audit': {
      id: 'governance-audit',
      label: 'Governance & audit',
      description: 'Compliance registry, audit logs, and policy oversight.',
    },
    'fleet-ops': {
      id: 'fleet-ops',
      label: 'Fleet operations',
      description: 'Vehicle routing, telemetry, and dispatch coordination.',
    },
    'lab-tools': {
      id: 'lab-tools',
      label: 'Laboratory tools',
      description: 'Lab interpretation and result workflows.',
    },
    'pharmacy-tools': {
      id: 'pharmacy-tools',
      label: 'Pharmacy safety tools',
      description: 'Medication review and pharmacy workspace tools.',
    },
    'education-sim': {
      id: 'education-sim',
      label: 'Education & simulation',
      description: 'Learning modules, supervised calculators, and simulation suites.',
    },
    'trackmind-ops': {
      id: 'trackmind-ops',
      label: 'TrackMind operations',
      description: 'Race-day, stewarding, welfare, and enterprise intelligence.',
    },
    'public-display': {
      id: 'public-display',
      label: 'Public waiting display',
      description: 'Patient-facing queue status without PHI.',
    },
    'read-only-board': {
      id: 'read-only-board',
      label: 'Read-only operations board',
      description: 'Hallway monitor for throughput and safety KPIs.',
    },
  });

const fn = (...ids: ProfileFunctionId[]): ProfileFunctionDefinition[] =>
  ids.map((id) => PROFILE_FUNCTION_DEFINITIONS[id]);

export const SAAS_ROLE_FUNCTION_IDS: Readonly<Record<SaasUserRole, readonly ProfileFunctionId[]>> =
  Object.freeze({
    'emergency-physician': [
      'provider-rounds',
      'disposition',
      'clinical-tools',
      'copilot-capture',
      'analytics-view',
      'reassessment',
    ],
    'icu-physician': ['provider-rounds', 'clinical-tools', 'copilot-capture', 'reassessment'],
    cardiologist: ['provider-rounds', 'clinical-tools', 'copilot-capture', 'disposition'],
    'registration-clerk': [
      'register-patient',
      'verify-identity',
      'ems-handoff',
    ],
    nurse: [
      'register-patient',
      'verify-identity',
      'triage-acuity',
      'assign-acuity',
      'reassessment',
      'copilot-capture',
    ],
    pharmacist: ['pharmacy-tools', 'clinical-tools'],
    'lab-technician': ['lab-tools'],
    'biomedical-engineer': ['fleet-ops', 'clinical-tools'],
    'fleet-operator': ['fleet-ops', 'analytics-view'],
    'hospital-administrator': [
      'command-throughput',
      'capacity-boarding',
      'analytics-view',
      'admin-settings',
      'ems-handoff',
    ],
    researcher: ['read-only-board', 'analytics-view', 'governance-audit'],
    educator: ['education-sim', 'clinical-tools'],
    student: ['education-sim', 'clinical-tools', 'copilot-capture'],
    'compliance-officer': ['governance-audit', 'admin-settings', 'analytics-view'],
    'platform-admin': [
      'admin-settings',
      'governance-audit',
      'command-throughput',
      'analytics-view',
      'trackmind-ops',
    ],
    'racetrack-admin': ['trackmind-ops', 'admin-settings', 'governance-audit'],
    'race-day-operations-manager': ['trackmind-ops', 'analytics-view'],
    steward: ['trackmind-ops', 'governance-audit'],
    'equine-welfare-officer': ['trackmind-ops'],
    veterinarian: ['trackmind-ops', 'clinical-tools'],
    'executive-leadership': ['command-throughput', 'analytics-view', 'trackmind-ops'],
    'auditor-regulator': ['read-only-board', 'governance-audit', 'trackmind-ops'],
  });

export const EMERGENCY_ROLE_FUNCTION_IDS: Readonly<
  Record<string, readonly ProfileFunctionId[]>
> = Object.freeze({
  [EMERGENCY_ROLE_IDS.registrationClerk]: [
    'register-patient',
    'verify-identity',
    'ems-handoff',
    'copilot-capture',
  ],
  [EMERGENCY_ROLE_IDS.triageNurse]: [
    'triage-acuity',
    'assign-acuity',
    'register-patient',
    'reassessment',
    'copilot-capture',
  ],
  [EMERGENCY_ROLE_IDS.chargeNurse]: [
    'manage-waiting-room',
    'reassessment',
    'capacity-boarding',
    'ems-handoff',
    'copilot-capture',
  ],
  [EMERGENCY_ROLE_IDS.physician]: [
    'provider-rounds',
    'disposition',
    'clinical-tools',
    'copilot-capture',
    'reassessment',
  ],
  [EMERGENCY_ROLE_IDS.emsUser]: ['ems-handoff', 'register-patient', 'copilot-capture'],
  [EMERGENCY_ROLE_IDS.edManager]: [
    'command-throughput',
    'capacity-boarding',
    'analytics-view',
    'copilot-capture',
  ],
  [EMERGENCY_ROLE_IDS.admin]: [
    'admin-settings',
    'command-throughput',
    'governance-audit',
    'analytics-view',
  ],
  [EMERGENCY_ROLE_IDS.readOnlyViewer]: ['read-only-board', 'analytics-view'],
  [EMERGENCY_ROLE_IDS.publicDisplay]: ['public-display'],
});

const SAAS_PROFILE_COPY_BASE: Readonly<
  Record<SaasUserRole, Omit<ProfileCopyStack, 'saasRole' | 'emergencyRoleId' | 'primaryFunctions'>>
> = Object.freeze({
  'emergency-physician': {
    personaTitle: 'Emergency Physician',
    workspaceEyebrow: 'Clinical provider',
    workspaceDescription: 'Review patients, document decisions, and plan disposition on the ED whiteboard.',
    profileShellSubtitle: 'Your assigned physician profile — clinical tools, copilot, and whiteboard access.',
    copilotIntro: 'Capture differential, orders, and disposition rationale at bedside.',
  },
  'icu-physician': {
    personaTitle: 'ICU Physician',
    workspaceEyebrow: 'Critical care',
    workspaceDescription: 'ICU and emergency cross-coverage with critical-care calculators.',
    profileShellSubtitle: 'ICU physician profile with emergency handoff visibility.',
    copilotIntro: 'Support critical-care decisions with concise, cited guidance.',
  },
  cardiologist: {
    personaTitle: 'Cardiologist',
    workspaceEyebrow: 'Cardiology',
    workspaceDescription: 'Cardiac complaints, emergency handoffs, and specialty calculators.',
    profileShellSubtitle: 'Cardiology profile with emergency workspace access.',
    copilotIntro: 'Assist with cardiac risk scores and protocol selection.',
  },
  'registration-clerk': {
    personaTitle: ED_PERSONA_LABELS.receptionClerk,
    workspaceEyebrow: 'Front desk',
    workspaceDescription: 'Registration, identity verification, patient search, and EMS conversion.',
    profileShellSubtitle: 'Receptionist profile — front-desk workflows without clinical mutation surfaces.',
    copilotIntro: 'Assist with registration steps and duplicate-patient checks.',
  },
  nurse: {
    personaTitle: ED_PERSONA_LABELS.triageNurse,
    workspaceEyebrow: 'Nursing — triage lane',
    workspaceDescription: 'Triage queues, intake support, reassessment, and patient safety flags.',
    profileShellSubtitle: 'Nurse profile mapped to triage and patient-care workflows.',
    copilotIntro: 'Document triage findings, vitals, and escalation triggers.',
  },
  pharmacist: {
    personaTitle: 'Pharmacist',
    workspaceEyebrow: 'Pharmacy',
    workspaceDescription: 'Medication safety tools and pharmacy workspace.',
    profileShellSubtitle: 'Pharmacy profile — medication review without ED mutation surfaces.',
    copilotIntro: 'Check interactions and formulary alternatives.',
  },
  'lab-technician': {
    personaTitle: 'Lab Technician',
    workspaceEyebrow: 'Laboratory',
    workspaceDescription: 'Laboratory workspace and interpretation tools.',
    profileShellSubtitle: 'Lab technician profile — results and interpretation tools.',
    copilotIntro: 'Interpret panels with standard reference context.',
  },
  'biomedical-engineer': {
    personaTitle: 'Biomedical Engineer',
    workspaceEyebrow: 'Devices & IoMT',
    workspaceDescription: 'Device operations, IoMT monitoring, and biomedical tooling.',
    profileShellSubtitle: 'Operations profile for device and IoMT surfaces.',
    copilotIntro: 'Troubleshoot device alerts and maintenance workflows.',
  },
  'fleet-operator': {
    personaTitle: 'Fleet Operator',
    workspaceEyebrow: 'Fleet command',
    workspaceDescription: 'Fleet routing, telemetry, and operational dispatch.',
    profileShellSubtitle: 'Fleet operator profile — no clinical ED mutation access.',
    copilotIntro: 'Summarize fleet utilization and routing pressure.',
  },
  'hospital-administrator': {
    personaTitle: ED_PERSONA_LABELS.departmentManager,
    workspaceEyebrow: 'Hospital administration',
    workspaceDescription: 'Command center, analytics, and ED operational oversight.',
    profileShellSubtitle: 'Administrator profile — command center and org operations.',
    copilotIntro: 'Summarize throughput bottlenecks and staffing recommendations.',
  },
  researcher: {
    personaTitle: 'Researcher',
    workspaceEyebrow: 'Research',
    workspaceDescription: 'Research tools and read-only operational views.',
    profileShellSubtitle: 'Research profile — read-only ED views and analytics exports.',
    copilotIntro: 'Explore de-identified operational patterns.',
  },
  educator: {
    personaTitle: 'Educator',
    workspaceEyebrow: 'Education',
    workspaceDescription: 'Teaching tools, simulation, and supervised clinical calculators.',
    profileShellSubtitle: 'Educator profile — simulation and learning modules.',
    copilotIntro: 'Generate teaching scenarios and debrief prompts.',
  },
  student: {
    personaTitle: 'Student',
    workspaceEyebrow: 'Learning',
    workspaceDescription: 'Supervised calculators, assistant access, and education workspace.',
    profileShellSubtitle: 'Student profile — learning tools without operational ED write access.',
    copilotIntro: 'Learn clinical reasoning with cited, educational tone.',
  },
  'compliance-officer': {
    personaTitle: 'Compliance Officer',
    workspaceEyebrow: 'Governance',
    workspaceDescription: 'Governance registry, audit logs, and compliance oversight.',
    profileShellSubtitle: 'Compliance profile — governance and audit surfaces.',
    copilotIntro: 'Summarize audit findings and policy gaps.',
  },
  'platform-admin': {
    personaTitle: ED_PERSONA_LABELS.siteAdmin,
    workspaceEyebrow: 'Platform administration',
    workspaceDescription: 'Tenant management, role assignment, and full product modules.',
    profileShellSubtitle: 'Platform admin — all modules and tenant configuration.',
    copilotIntro: 'Assist with tenant configuration and rollout planning.',
  },
  'racetrack-admin': {
    personaTitle: 'Racetrack Administrator',
    workspaceEyebrow: 'TrackMind',
    workspaceDescription: 'TrackMind enterprise hub and race-day configuration.',
    profileShellSubtitle: 'TrackMind admin profile — enterprise and org administration.',
    copilotIntro: 'Support race-day configuration and org setup.',
  },
  'race-day-operations-manager': {
    personaTitle: 'Race Day Operations Manager',
    workspaceEyebrow: 'TrackMind operations',
    workspaceDescription: 'Race-day console and intelligence modules.',
    profileShellSubtitle: 'Operations manager profile for TrackMind race-day surfaces.',
    copilotIntro: 'Monitor race-day throughput and incident queues.',
  },
  steward: {
    personaTitle: 'Racing Steward',
    workspaceEyebrow: 'Stewarding',
    workspaceDescription: 'Incident review, stewarding workspace, and audit visibility.',
    profileShellSubtitle: 'Steward profile — TrackMind governance without ED clinical writes.',
    copilotIntro: 'Review incidents with audit-ready summaries.',
  },
  'equine-welfare-officer': {
    personaTitle: 'Equine Welfare Officer',
    workspaceEyebrow: 'Welfare monitoring',
    workspaceDescription: 'Equine welfare dashboards and maturity tracking.',
    profileShellSubtitle: 'Welfare officer profile — TrackMind welfare surfaces.',
    copilotIntro: 'Flag welfare trends and escalation thresholds.',
  },
  veterinarian: {
    personaTitle: 'Veterinarian',
    workspaceEyebrow: 'Veterinary clinical',
    workspaceDescription: 'Veterinary records and TrackMind clinical workflows.',
    profileShellSubtitle: 'Veterinarian profile — clinical TrackMind tools.',
    copilotIntro: 'Support veterinary assessment documentation.',
  },
  'executive-leadership': {
    personaTitle: 'Executive Leadership',
    workspaceEyebrow: 'Executive command',
    workspaceDescription: 'Executive command center, enterprise intelligence, and throughput analytics.',
    profileShellSubtitle: 'Executive profile — analytics and command center visibility.',
    copilotIntro: 'Summarize enterprise throughput and risk posture.',
  },
  'auditor-regulator': {
    personaTitle: 'Auditor / Regulator',
    workspaceEyebrow: 'Audit & regulation',
    workspaceDescription: 'Read-only boards, audit exports, and governance registry.',
    profileShellSubtitle: 'Auditor profile — read-only operational views and audit access.',
    copilotIntro: 'Produce audit-ready summaries without PHI exposure.',
  },
});

const EMERGENCY_PROFILE_COPY_BASE: Readonly<
  Record<string, Omit<ProfileCopyStack, 'saasRole' | 'emergencyRoleId' | 'primaryFunctions'>>
> = Object.freeze({
  [EMERGENCY_ROLE_IDS.registrationClerk]: {
    personaTitle: ED_PERSONA_LABELS.receptionClerk,
    workspaceEyebrow: 'Reception desk',
    workspaceDescription: 'Register patients, confirm identity, and send arrivals to triage.',
    profileShellSubtitle: 'Reception clerk — registration, verification, and EMS convert.',
    copilotIntro: 'Log arrival details and route high-risk complaints quickly.',
  },
  [EMERGENCY_ROLE_IDS.triageNurse]: {
    personaTitle: ED_PERSONA_LABELS.triageNurse,
    workspaceEyebrow: 'Triage lane',
    workspaceDescription: 'Pre-triage queues, acuity assignment, and breach visibility.',
    profileShellSubtitle: 'Triage nurse — acuity, flags, and handoff to waiting room.',
    copilotIntro: 'Document triage findings and escalation triggers.',
  },
  [EMERGENCY_ROLE_IDS.chargeNurse]: {
    personaTitle: ED_PERSONA_LABELS.chargeNurse,
    workspaceEyebrow: 'Charge / flow control',
    workspaceDescription: 'Waiting-room safety, bed flow, and reassessment oversight.',
    profileShellSubtitle: 'Charge nurse — flow control, reassessment, and capacity pressure.',
    copilotIntro: 'Flag reassessment breaches and provider-wait thresholds.',
  },
  [EMERGENCY_ROLE_IDS.physician]: {
    personaTitle: ED_PERSONA_LABELS.physician,
    workspaceEyebrow: 'Provider lane',
    workspaceDescription: 'Whiteboard rounds, orders, disposition, and copilot capture.',
    profileShellSubtitle: 'ED physician — clinical decisions and disposition planning.',
    copilotIntro: 'Capture differential notes and disposition rationale.',
  },
  [EMERGENCY_ROLE_IDS.emsUser]: {
    personaTitle: ED_PERSONA_LABELS.emsHandoff,
    workspaceEyebrow: 'EMS handoff',
    workspaceDescription: 'Ambulance tracker, offload timing, and handoff checklists.',
    profileShellSubtitle: 'EMS coordination — offload, handoff, and reception bridge.',
    copilotIntro: 'Capture pre-hospital report and handoff completion.',
  },
  [EMERGENCY_ROLE_IDS.edManager]: {
    personaTitle: ED_PERSONA_LABELS.departmentManager,
    workspaceEyebrow: 'ED command',
    workspaceDescription: 'Throughput, staffing, boarding, and department-wide situational awareness.',
    profileShellSubtitle: 'ED manager — command center and operational analytics.',
    copilotIntro: 'Summarize bottlenecks and recommend operational moves.',
  },
  [EMERGENCY_ROLE_IDS.admin]: {
    personaTitle: ED_PERSONA_LABELS.siteAdmin,
    workspaceEyebrow: 'ED administration',
    workspaceDescription: 'Settings, governance, and full CareDroid administration.',
    profileShellSubtitle: 'Site admin — settings, roles, and governance.',
    copilotIntro: 'Assist with configuration and policy-aligned changes.',
  },
  [EMERGENCY_ROLE_IDS.readOnlyViewer]: {
    personaTitle: ED_PERSONA_LABELS.readOnlyWhiteboard,
    workspaceEyebrow: 'Read-only display',
    workspaceDescription: 'Hallway monitor for throughput and safety KPIs — no mutations.',
    profileShellSubtitle: 'Read-only display persona — observational access only.',
    copilotIntro: 'Not available on read-only displays.',
  },
  [EMERGENCY_ROLE_IDS.publicDisplay]: {
    personaTitle: ED_PERSONA_LABELS.publicWaiting,
    workspaceEyebrow: 'Public waiting wall',
    workspaceDescription: 'Patient-facing queue status without PHI.',
    profileShellSubtitle: 'Public display — aggregate wait messaging only.',
    copilotIntro: 'Not available on public displays.',
  },
});

function resolveFunctionIds(
  saasRole: SaasUserRole,
  emergencyRoleId: string | null,
): readonly ProfileFunctionId[] {
  if (emergencyRoleId && EMERGENCY_ROLE_FUNCTION_IDS[emergencyRoleId]?.length) {
    return EMERGENCY_ROLE_FUNCTION_IDS[emergencyRoleId];
  }
  return SAAS_ROLE_FUNCTION_IDS[saasRole] || SAAS_ROLE_FUNCTION_IDS.student;
}

export function resolveUserProfileCopy(input: {
  saasRole?: string | null;
  emergencyRoleId?: string | null;
  accessSummary?: UserProfileAccessSummary | null;
} = {}): ProfileCopyStack {
  const summary =
    input.accessSummary ||
    buildUserProfileAccessSummary(input.saasRole || 'student');
  const saasRole = normalizeSaasRole(summary.saasRole || input.saasRole);
  const emergencyRoleId = input.emergencyRoleId
    ? normalizeEmergencyRole(input.emergencyRoleId)
    : summary.emergencyRole
      ? normalizeEmergencyRole(summary.emergencyRole)
      : resolveUserProfileFromSaasRole(saasRole).emergencyRoleId;

  const saasCopy = SAAS_PROFILE_COPY_BASE[saasRole];
  const emergencyCopy =
    emergencyRoleId && EMERGENCY_PROFILE_COPY_BASE[emergencyRoleId]
      ? EMERGENCY_PROFILE_COPY_BASE[emergencyRoleId]
      : null;

  const merged = emergencyCopy || saasCopy;
  const functionIds = resolveFunctionIds(saasRole, emergencyRoleId);

  return Object.freeze({
    saasRole,
    emergencyRoleId,
    personaTitle: merged.personaTitle,
    workspaceEyebrow: merged.workspaceEyebrow,
    workspaceDescription: merged.workspaceDescription,
    profileShellSubtitle: merged.profileShellSubtitle,
    copilotIntro: merged.copilotIntro,
    primaryFunctions: fn(...functionIds),
  });
}

export function listProfileFunctionsForRole(
  saasRole: string | null | undefined,
  emergencyRoleId?: string | null,
): readonly ProfileFunctionDefinition[] {
  return resolveUserProfileCopy({ saasRole, emergencyRoleId }).primaryFunctions;
}

export function isSaasProfileCopyComplete(): boolean {
  return SAAS_USER_ROLES.every((role) => Boolean(SAAS_PROFILE_COPY_BASE[role]));
}

export function isEmergencyProfileCopyComplete(): boolean {
  return Object.values(EMERGENCY_ROLE_IDS).every(
    (roleId) => Boolean(EMERGENCY_PROFILE_COPY_BASE[roleId]),
  );
}

export function isProfileFunctionRegistryComplete(): boolean {
  return (
    SAAS_USER_ROLES.every((role) => (SAAS_ROLE_FUNCTION_IDS[role]?.length || 0) > 0) &&
    Object.values(EMERGENCY_ROLE_IDS).every(
      (roleId) => (EMERGENCY_ROLE_FUNCTION_IDS[roleId]?.length || 0) > 0,
    )
  );
}
