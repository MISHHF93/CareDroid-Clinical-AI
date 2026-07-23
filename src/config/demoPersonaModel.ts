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
  defaultEmergencyRole: EMERGENCY_ROLE_IDS.chargeNurse,
  tagline:
    'CareDroid accompanies Dr. George across ED 18 — starting at the dashboard, then triage, provider, command, and reception views.',
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
    emergencyRoleId: EMERGENCY_ROLE_IDS.registrationClerk,
    label: 'Reception desk',
    sceneLabel: 'Reception-first intake',
    description:
      'First resolution at the front desk — registration, verification, pretriage handoff, and Reception team chat.',
    copilotHint: 'Log arrival details, escalate critically, and notify triage via Collaboration Hub.',
  },
  {
    emergencyRoleId: EMERGENCY_ROLE_IDS.triageNurse,
    label: 'Triage & acuity',
    sceneLabel: 'Triage queue',
    description: 'Pre-triage queues, acuity assignment, and the Triage staff channel.',
    copilotHint: 'Document triage findings and coordinate with reception/charge in Collaboration Hub.',
  },
  {
    emergencyRoleId: EMERGENCY_ROLE_IDS.chargeNurse,
    label: 'Charge / flow control',
    sceneLabel: 'Charge nurse whiteboard',
    description: 'Bed flow, waiting-room safety, reassessment visibility, and Charge Nurses channel.',
    copilotHint: 'Flag breaches and align the floor via Collaboration Hub.',
  },
  {
    emergencyRoleId: EMERGENCY_ROLE_IDS.physician,
    label: 'Provider rounds',
    sceneLabel: 'Physician whiteboard',
    description: 'Attending decisions, orders, disposition planning, and Physicians channel.',
    copilotHint: 'Capture clinical rationale and coordinate consults in Collaboration Hub.',
  },
  {
    emergencyRoleId: EMERGENCY_ROLE_IDS.edManager,
    label: 'Command & operations',
    sceneLabel: 'ED command center',
    description: 'Throughput, staffing, situational awareness, and Hospital Operations channel.',
    copilotHint: 'Summarize bottlenecks and broadcast ops updates in Collaboration Hub.',
  },
  {
    emergencyRoleId: EMERGENCY_ROLE_IDS.emsUser,
    label: 'EMS handoff',
    sceneLabel: 'EMS offload tracker',
    description: 'Ambulance arrivals, handoff checklists, offload timing, and EMS channel.',
    copilotHint: 'Capture pre-hospital report and notify ED staff via Collaboration Hub.',
  },
  {
    emergencyRoleId: EMERGENCY_ROLE_IDS.publicDisplay,
    label: 'Public waiting wall',
    sceneLabel: 'Waiting-room display',
    description: 'Patient-facing queue status without PHI (no staff chat on this display).',
    copilotHint: 'Preview what families see on the wall display.',
  },
  {
    emergencyRoleId: EMERGENCY_ROLE_IDS.readOnlyViewer,
    label: 'Ops wall display',
    sceneLabel: 'Read-only departmental board',
    description: 'Hallway monitor for throughput KPIs — can open Collaboration Hub read-only for briefings.',
    copilotHint: 'Walk leadership through situational awareness; open ED channel if needed.',
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
    summary: 'Start at the platform hub — explore the demo or open admin.',
    route: CANONICAL_ROUTES.platformStart,
  },
  {
    id: 'identity',
    letter: 'B',
    title: 'Meet Dr. Cara George',
    summary: 'ED Clinical Director for Emergency Department 18 — one identity across every lane.',
  },
  {
    id: 'reception',
    letter: 'C',
    title: 'Walk the reception desk',
    summary: 'Start at registration clerk — first resolution, arrival intake, and escalation paths.',
    emergencyRoleId: EMERGENCY_ROLE_IDS.registrationClerk,
  },
  {
    id: 'command',
    letter: 'D',
    title: 'Command the department',
    summary: 'Switch to ED manager for department KPIs, throughput, and operational flow.',
    emergencyRoleId: EMERGENCY_ROLE_IDS.edManager,
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
    id: 'collaboration',
    letter: 'I',
    title: 'Coordinate on Collaboration Hub',
    summary:
      'Every ED staff lane (reception, triage, charge, provider, EMS, command) shares the Collaboration Hub — open team channels for handoffs and escalations.',
    route: CANONICAL_ROUTES.emergencyCollaboration,
  },
  {
    id: 'copilot',
    letter: 'J',
    title: 'Capture inputs with CareDroid',
    summary: 'Open the copilot from any lane to log decisions, handoffs, and reassessments.',
  },
  {
    id: 'admin',
    letter: 'K',
    title: 'Preview staff workflows',
    summary: 'Administrators assign canonical roles and ED lanes from the admin console.',
    route: CANONICAL_ROUTES.adminOperations,
  },
  {
    id: 'persist',
    letter: 'L',
    title: 'Review profile preferences',
    summary: 'Open profile settings to adjust demo role, tools, and workspace preferences.',
    route: CANONICAL_ROUTES.profile,
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
