/**
 * Demo persona — Dr. Cara George, ED Clinical Director at Emergency Department 18.
 * Open-access and dev-bypass sessions use this identity; role views switch ED workflows.
 */
import { CANONICAL_ROUTES } from './routes.config';
import { EMERGENCY_ROLE_IDS, normalizeEmergencyRole } from './emergencyRolePermissions';
import { resolveRoleLandingRoute } from './emergencyRoleNavigationModel';

export const DEMO_PERSONA_ID = 'cara-george-ed18';

export const OPEN_ACCESS_USER_ID = 'open-access-user';

export const DEMO_PERSONA = Object.freeze({
  id: DEMO_PERSONA_ID,
  userId: OPEN_ACCESS_USER_ID,
  givenName: 'Cara',
  familyName: 'George',
  displayName: 'Dr. Cara George',
  title: 'ED Clinical Director',
  department: 'Emergency Department 18',
  departmentCode: 'ED-18',
  institution: 'CareDroid Memorial Hospital',
  email: 'cara.george.demo@caredroid.local',
  profession: 'Emergency Medicine',
  specialty: 'Emergency Medicine',
  saasRole: 'emergency-physician',
  defaultEmergencyRole: EMERGENCY_ROLE_IDS.edManager,
  tagline:
    'CareDroid accompanies Dr. George across ED 18 — capturing inputs as she moves from command to bedside.',
});

export type DemoRoleView = Readonly<{
  emergencyRoleId: string;
  label: string;
  sceneLabel: string;
  description: string;
  copilotHint: string;
}>;

export const CURATED_DEMO_ROLE_VIEWS: readonly DemoRoleView[] = Object.freeze([
  {
    emergencyRoleId: EMERGENCY_ROLE_IDS.edManager,
    label: 'Command & operations',
    sceneLabel: 'ED command center',
    description: 'Throughput, staffing, and department-wide situational awareness.',
    copilotHint: 'Summarize bottlenecks and recommend next operational moves.',
  },
  {
    emergencyRoleId: EMERGENCY_ROLE_IDS.chargeNurse,
    label: 'Charge / flow control',
    sceneLabel: 'Charge nurse whiteboard',
    description: 'Bed flow, waiting-room safety, and reassessment visibility.',
    copilotHint: 'Flag patients breaching reassessment or provider-wait thresholds.',
  },
  {
    emergencyRoleId: EMERGENCY_ROLE_IDS.physician,
    label: 'Provider rounds',
    sceneLabel: 'Physician whiteboard',
    description: 'Accompany attending decisions, orders, and disposition planning.',
    copilotHint: 'Capture differential notes and disposition rationale at bedside.',
  },
  {
    emergencyRoleId: EMERGENCY_ROLE_IDS.triageNurse,
    label: 'Triage & acuity',
    sceneLabel: 'Triage queue',
    description: 'Walk through pre-triage queues and acuity assignment.',
    copilotHint: 'Document triage findings and escalation triggers.',
  },
  {
    emergencyRoleId: EMERGENCY_ROLE_IDS.registrationClerk,
    label: 'Reception desk',
    sceneLabel: 'Reception-first intake',
    description: 'Registration, arrival control, and walk-in intake paths.',
    copilotHint: 'Log arrival details and route high-risk complaints quickly.',
  },
  {
    emergencyRoleId: EMERGENCY_ROLE_IDS.emsUser,
    label: 'EMS handoff',
    sceneLabel: 'EMS offload tracker',
    description: 'Ambulance arrivals, handoff checklists, and offload timing.',
    copilotHint: 'Capture pre-hospital report and handoff completion.',
  },
  {
    emergencyRoleId: EMERGENCY_ROLE_IDS.publicDisplay,
    label: 'Public waiting wall',
    sceneLabel: 'Waiting-room display',
    description: 'Patient-facing queue status without PHI.',
    copilotHint: 'Preview what families see on the wall display.',
  },
  {
    emergencyRoleId: EMERGENCY_ROLE_IDS.readOnlyViewer,
    label: 'Ops wall display',
    sceneLabel: 'Read-only departmental board',
    description: 'Hallway monitor view for throughput and safety KPIs.',
    copilotHint: 'Walk leadership through read-only situational awareness.',
  },
]);

export type DemoJourneyStep = Readonly<{
  id: string;
  letter: string;
  title: string;
  summary: string;
  emergencyRoleId?: string;
  route?: string;
}>;

export const DEMO_JOURNEY_STEPS: readonly DemoJourneyStep[] = Object.freeze([
  {
    id: 'entry',
    letter: 'A',
    title: 'Choose your entry path',
    summary: 'Start at the platform hub — sign in, explore demo, or open admin.',
    route: CANONICAL_ROUTES.platformStart,
  },
  {
    id: 'identity',
    letter: 'B',
    title: 'Meet Dr. Cara George',
    summary: 'ED Clinical Director for Emergency Department 18 — one identity across every lane.',
  },
  {
    id: 'command',
    letter: 'C',
    title: 'Command the department',
    summary: 'Land on the operations view as ED manager — department KPIs and flow.',
    emergencyRoleId: EMERGENCY_ROLE_IDS.edManager,
  },
  {
    id: 'reception',
    letter: 'D',
    title: 'Walk the reception desk',
    summary: 'Switch to registration clerk to see arrival intake and escalation paths.',
    emergencyRoleId: EMERGENCY_ROLE_IDS.registrationClerk,
  },
  {
    id: 'triage',
    letter: 'E',
    title: 'Run triage with the team',
    summary: 'Move to triage nurse — acuity queues and breach visibility.',
    emergencyRoleId: EMERGENCY_ROLE_IDS.triageNurse,
  },
  {
    id: 'waiting',
    letter: 'F',
    title: 'Hold the waiting room',
    summary: 'Charge nurse view — fit-to-wait, deterioration watch, and LWBS risk.',
    emergencyRoleId: EMERGENCY_ROLE_IDS.chargeNurse,
  },
  {
    id: 'provider',
    letter: 'G',
    title: 'Round with physicians',
    summary: 'Physician whiteboard — accompany providers and capture clinical inputs.',
    emergencyRoleId: EMERGENCY_ROLE_IDS.physician,
  },
  {
    id: 'ems',
    letter: 'H',
    title: 'Complete EMS handoff',
    summary: 'EMS lane — offload tracking and ambulance checklist completion.',
    emergencyRoleId: EMERGENCY_ROLE_IDS.emsUser,
  },
  {
    id: 'copilot',
    letter: 'I',
    title: 'Capture inputs with CareDroid',
    summary: 'Open the copilot from any lane to log decisions, handoffs, and reassessments.',
  },
  {
    id: 'admin',
    letter: 'J',
    title: 'Preview staff workflows',
    summary: 'Administrators assign canonical roles and ED lanes from the admin console.',
    route: CANONICAL_ROUTES.adminOperations,
  },
  {
    id: 'persist',
    letter: 'K',
    title: 'Sign in to save your profile',
    summary: 'Demo data resets on refresh — sign in to persist preferences and assigned role.',
    route: CANONICAL_ROUTES.auth,
  },
]);

type DemoUserRecord = Record<string, unknown>;

export function isDemoPersonaUser(user: DemoUserRecord | null | undefined): boolean {
  if (!user) return false;
  return (
    user.id === OPEN_ACCESS_USER_ID ||
    user.authMode === 'open-access' ||
    user.authMode === 'platform-access' ||
    user.demoPersona === DEMO_PERSONA_ID ||
    (user.profile as DemoUserRecord | undefined)?.demoPersonaId === DEMO_PERSONA_ID
  );
}

export function resolveDemoRoleLandingRoute(emergencyRoleId: string): string {
  return resolveRoleLandingRoute({ role: normalizeEmergencyRole(emergencyRoleId) });
}

export function resolveDemoDefaultLandingRoute(): string {
  return resolveDemoRoleLandingRoute(DEMO_PERSONA.defaultEmergencyRole);
}

export function listCuratedDemoRoleViews(): readonly DemoRoleView[] {
  return CURATED_DEMO_ROLE_VIEWS;
}

export function getDemoRoleView(emergencyRoleId: string): DemoRoleView | undefined {
  const normalized = normalizeEmergencyRole(emergencyRoleId);
  return CURATED_DEMO_ROLE_VIEWS.find((view) => view.emergencyRoleId === normalized);
}

export function buildOpenAccessDemoUser(
  emergencyRoleId: string = DEMO_PERSONA.defaultEmergencyRole,
): DemoUserRecord {
  const role = normalizeEmergencyRole(emergencyRoleId);
  return Object.freeze({
    id: OPEN_ACCESS_USER_ID,
    email: DEMO_PERSONA.email,
    name: DEMO_PERSONA.displayName,
    fullName: DEMO_PERSONA.displayName,
    role,
    institution: DEMO_PERSONA.institution,
    authMode: 'open-access',
    isEmailVerified: true,
    twoFactorEnabled: false,
    demoPersona: DEMO_PERSONA_ID,
    profile: {
      fullName: DEMO_PERSONA.displayName,
      profession: DEMO_PERSONA.profession,
      specialty: DEMO_PERSONA.specialty,
      department: DEMO_PERSONA.department,
      institution: DEMO_PERSONA.institution,
      title: DEMO_PERSONA.title,
      roleProfileId: role,
      demoPersonaId: DEMO_PERSONA_ID,
    },
  });
}

export function buildDevPlatformDemoUser(
  emergencyRoleId: string = DEMO_PERSONA.defaultEmergencyRole,
): DemoUserRecord {
  const user = buildOpenAccessDemoUser(emergencyRoleId);
  return {
    ...user,
    id: 'platform-access-user',
    authMode: 'platform-access',
    isDevAuthBypass: true,
    devAuthLabel: 'Platform Access',
    createdAt: new Date().toISOString(),
  };
}

export function applyDemoRoleView(
  user: DemoUserRecord | null | undefined,
  nextEmergencyRoleId: string,
): DemoUserRecord {
  const role = normalizeEmergencyRole(nextEmergencyRoleId);
  const base = isDemoPersonaUser(user) ? { ...buildOpenAccessDemoUser(role), ...user } : buildOpenAccessDemoUser(role);
  const profile = {
    ...((base.profile as DemoUserRecord) || {}),
    roleProfileId: role,
    demoPersonaId: DEMO_PERSONA_ID,
    fullName: DEMO_PERSONA.displayName,
    department: DEMO_PERSONA.department,
    title: DEMO_PERSONA.title,
    specialty: DEMO_PERSONA.specialty,
    profession: DEMO_PERSONA.profession,
    institution: DEMO_PERSONA.institution,
  };

  return {
    ...base,
    role,
    name: DEMO_PERSONA.displayName,
    fullName: DEMO_PERSONA.displayName,
    demoPersona: DEMO_PERSONA_ID,
    profile,
  };
}

export function hydrateStoredDemoUser(stored: DemoUserRecord | null | undefined): DemoUserRecord {
  if (!stored || !isDemoPersonaUser(stored)) return buildOpenAccessDemoUser();
  const role =
    (stored.role as string | undefined) ||
    ((stored.profile as DemoUserRecord | undefined)?.roleProfileId as string | undefined) ||
    DEMO_PERSONA.defaultEmergencyRole;
  return applyDemoRoleView(stored, role);
}

export function enrichDemoIdentityFallback(
  user: DemoUserRecord | null | undefined,
  fallback: DemoUserRecord,
): DemoUserRecord {
  if (!isDemoPersonaUser(user)) return fallback;

  const profile = (user?.profile as DemoUserRecord) || {};
  const saasProfile = {
    ...(fallback.saasProfile as DemoUserRecord),
    displayName: DEMO_PERSONA.displayName,
    email: DEMO_PERSONA.email,
    role: DEMO_PERSONA.saasRole,
    specialty: DEMO_PERSONA.specialty,
    department: DEMO_PERSONA.department,
    organizationType: 'hospital',
  };

  return {
    ...fallback,
    saasProfile,
    account: {
      ...(fallback.account as DemoUserRecord),
      displayName: DEMO_PERSONA.displayName,
      email: DEMO_PERSONA.email,
      profession: DEMO_PERSONA.profession,
      specialty: DEMO_PERSONA.specialty,
      organization: DEMO_PERSONA.institution,
      department: DEMO_PERSONA.department,
      role: (user?.role as string) || DEMO_PERSONA.defaultEmergencyRole,
    },
    professional: {
      ...(fallback.professional as DemoUserRecord),
      specialties: [DEMO_PERSONA.specialty],
      experienceLevel: 'senior',
    },
    preferences: {
      ...(fallback.preferences as DemoUserRecord),
      defaultDashboard: 'command',
    },
    workspace: {
      ...(fallback.workspace as DemoUserRecord),
      activeWorkspace: {
        ...(((fallback.workspace as DemoUserRecord)?.activeWorkspace as DemoUserRecord) || {}),
        name: DEMO_PERSONA.department,
        branding: { displayName: DEMO_PERSONA.department },
      },
    },
  };
}

export function getDemoPersonaHeadline(): string {
  return `${DEMO_PERSONA.displayName} · ${DEMO_PERSONA.title} · ${DEMO_PERSONA.department}`;
}
