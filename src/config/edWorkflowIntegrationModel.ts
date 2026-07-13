/**
 * Emergency Department workflow integration — normalizes profile → role → screen → landing
 * and documents the A–Z ED journey across frontend and backend capability contracts.
 */
import { BACKEND_API_CAPABILITY_STATUS } from './backendApiCapabilities';
import { CANONICAL_ROUTES } from './routes.config';
import { ED_WORKFLOW_LANES } from './platformEntryModel';
import { DEMO_JOURNEY_STEPS } from './demoPersonaModel';
import {
  EMERGENCY_ROLE_IDS,
  getEmergencyRoleHomeRoute,
  normalizeEmergencyRole,
} from './emergencyRolePermissions';
import {
  getDefaultScreenModeForRole,
  getPersonaLabelForRole,
} from './emergencyRoleScreenMatrix';
import {
  buildUserProfileAccessSummary,
  resolveEffectiveEmergencyRole,
  resolveUserProfileFromSaasRole,
  type UserProfileAccessSummary,
} from './userProfileCatalog';

export type EdWorkflowLaneId =
  | 'entry'
  | 'reception'
  | 'triage'
  | 'waiting'
  | 'provider'
  | 'ems'
  | 'operations'
  | 'displays'
  | 'admin'
  | 'persist';

export type EdWorkflowAzStep = Readonly<{
  id: string;
  order: number;
  title: string;
  summary: string;
  laneId: EdWorkflowLaneId;
  emergencyRoleId?: string;
  route?: string;
  backendCapabilities?: readonly string[];
}>;

export const ED_WORKFLOW_AZ_STEPS: readonly EdWorkflowAzStep[] = Object.freeze([
  {
    id: 'platform-entry',
    order: 0,
    title: 'Platform entry (optional)',
    summary: 'Orientation hub at /start — choose demo path, clinical workspace, or admin console.',
    laneId: 'entry',
    route: CANONICAL_ROUTES.platformStart,
    backendCapabilities: ['operationalProfile', 'workspaces'],
  },
  {
    id: 'clinical-startup',
    order: 1,
    title: 'Clinical startup',
    summary: 'App opens at reception (reception-first UX) or role-matched clinical home.',
    laneId: 'reception',
    route: CANONICAL_ROUTES.emergencyReception,
    backendCapabilities: ['emergencyReceptionSnapshot'],
  },
  {
    id: 'profile-resolve',
    order: 2,
    title: 'Profile & role resolution',
    summary: 'Backend /api/profile/me resolves SaaS role → emergency role → screen mode.',
    laneId: 'entry',
    backendCapabilities: ['operationalProfile', 'userProfile'],
  },
  {
    id: 'reception-intake',
    order: 3,
    title: 'Reception & registration',
    summary: 'Arrival control, verification queues, EMS pre-arrival, and embedded intake.',
    laneId: 'reception',
    emergencyRoleId: EMERGENCY_ROLE_IDS.registrationClerk,
    route: CANONICAL_ROUTES.emergencyReception,
    backendCapabilities: ['emergencyReceptionSnapshot', 'emergencyReceptionHandoff'],
  },
  {
    id: 'triage-acuity',
    order: 4,
    title: 'Triage & acuity',
    summary: 'Pre-triage queues, breach timers, and triage assist.',
    laneId: 'triage',
    emergencyRoleId: EMERGENCY_ROLE_IDS.triageNurse,
    route: `${CANONICAL_ROUTES.emergencyQueues}?queue=pretriage`,
    backendCapabilities: ['emergencyTriageAssist', 'emergencyQueues'],
  },
  {
    id: 'waiting-safety',
    order: 5,
    title: 'Waiting room & charge nurse',
    summary: 'Fit-to-wait, reassessment timers, LWBS risk, and flow control.',
    laneId: 'waiting',
    emergencyRoleId: EMERGENCY_ROLE_IDS.chargeNurse,
    route: CANONICAL_ROUTES.emergencyWhiteboard,
    backendCapabilities: ['emergencyWhiteboard', 'emergencyQueues'],
  },
  {
    id: 'provider-rounds',
    order: 6,
    title: 'Provider & disposition',
    summary: 'Physician whiteboard, who-next, referrals, and copilot capture.',
    laneId: 'provider',
    emergencyRoleId: EMERGENCY_ROLE_IDS.physician,
    route: CANONICAL_ROUTES.emergencyWhiteboard,
    backendCapabilities: ['emergencyWhiteboard', 'emergencyReferrals'],
  },
  {
    id: 'ems-handoff',
    order: 7,
    title: 'EMS offload & handoff',
    summary: 'Ambulance tracker, checklist completion, and reception convert.',
    laneId: 'ems',
    emergencyRoleId: EMERGENCY_ROLE_IDS.emsUser,
    route: CANONICAL_ROUTES.emergencyEms,
    backendCapabilities: ['emergencyEmsRuntime', 'emergencyReceptionHandoff'],
  },
  {
    id: 'command-ops',
    order: 8,
    title: 'Command & throughput',
    summary: 'ED manager command center, analytics, capacity, and boarding.',
    laneId: 'operations',
    emergencyRoleId: EMERGENCY_ROLE_IDS.edManager,
    route: CANONICAL_ROUTES.emergencyCommandCenter,
    backendCapabilities: [
      'emergencyCentralNode',
      'emergencyOperationalAnalytics',
      'emergencyCapacity',
      'emergencyBoarding',
    ],
  },
  {
    id: 'wall-displays',
    order: 9,
    title: 'Public & read-only displays',
    summary: 'Waiting-room wall and departmental read-only whiteboard.',
    laneId: 'displays',
    emergencyRoleId: EMERGENCY_ROLE_IDS.publicDisplay,
    route: `${CANONICAL_ROUTES.emergencyWhiteboard}?display=waiting-room`,
    backendCapabilities: ['emergencyWhiteboard'],
  },
  {
    id: 'admin-workflows',
    order: 10,
    title: 'Admin staff workflows',
    summary: 'Assign canonical roles and preview lane navigation from admin console.',
    laneId: 'admin',
    route: `${CANONICAL_ROUTES.adminOperations}/staff-workflows`,
    backendCapabilities: ['operationalProfile', 'workspaces'],
  },
  {
    id: 'persist-session',
    order: 11,
    title: 'Persist identity',
    summary:
      'Clinical startup at reception (or role home); profile and session state persist locally during the build phase.',
    laneId: 'persist',
    route: CANONICAL_ROUTES.auth,
    backendCapabilities: ['operationalProfile'],
  },
]);

export type NormalizedEdUserContext = Readonly<{
  saasRole: string;
  emergencyRoleId: string;
  personaLabel: string;
  screenMode: string;
  landingRoute: string;
  accessSummary: UserProfileAccessSummary;
  navigationRoutes: string[];
  isDemoPersona: boolean;
  profileSource: 'api' | 'catalog-fallback' | 'demo';
}>;

export type BackendFrontendSyncSummary = Readonly<{
  profileWired: boolean;
  emergencyReadWired: boolean;
  emergencyWriteWired: boolean;
  realtimeWired: boolean;
  persistenceMode: 'demo-fixture' | 'local-first' | 'hybrid';
  notes: readonly string[];
}>;

type UserLike = {
  role?: string;
  profile?: { roleProfileId?: string };
  demoPersona?: string;
  authMode?: string;
} | null;

type OperationalProfileLike = {
  effectiveProfile?: { saasRole?: string; emergencyRoleId?: string } | null;
  accessSummary?: UserProfileAccessSummary | null;
  saasProfile?: { role?: string; saasRole?: string } | null;
} | null;

export function listEdWorkflowAzSteps(): readonly EdWorkflowAzStep[] {
  return ED_WORKFLOW_AZ_STEPS;
}

export function listDemoJourneySteps() {
  return DEMO_JOURNEY_STEPS;
}

export function listEdWorkflowLanes() {
  return ED_WORKFLOW_LANES;
}

type BackendFrontendSyncRuntime = {
  backendAvailable?: boolean;
  persistenceMode?: string;
};

function resolveRuntimePersistenceMode(
  runtime: BackendFrontendSyncRuntime | undefined,
  fallback: BackendFrontendSyncSummary['persistenceMode'],
): BackendFrontendSyncSummary['persistenceMode'] {
  const mode = runtime?.persistenceMode;
  if (mode === 'backend' || mode === 'local' || mode === 'simulation') {
    if (mode === 'backend') return 'hybrid';
    if (mode === 'local') return 'local-first';
    return 'demo-fixture';
  }
  return fallback;
}

export function summarizeBackendFrontendSync(
  runtime: BackendFrontendSyncRuntime = {},
): BackendFrontendSyncSummary {
  const profileWired =
    BACKEND_API_CAPABILITY_STATUS.operationalProfile === 'real' &&
    BACKEND_API_CAPABILITY_STATUS.userProfile === 'real';
  const emergencyReadWired =
    runtime.backendAvailable === true ||
    (BACKEND_API_CAPABILITY_STATUS as any).emergencyWhiteboard !== 'disabled';
  const emergencyWriteWired =
    BACKEND_API_CAPABILITY_STATUS.emergencyReceptionHandoff === 'real' ||
    BACKEND_API_CAPABILITY_STATUS.emergencyTriageAssist === 'real';
  const realtimeWired =
    (BACKEND_API_CAPABILITY_STATUS as any).emergencyCentralNode !== 'disabled';
  const fallbackPersistenceMode = emergencyWriteWired ? 'hybrid' : 'demo-fixture';

  return {
    profileWired: runtime.backendAvailable === false ? false : profileWired,
    emergencyReadWired,
    emergencyWriteWired,
    realtimeWired,
    persistenceMode: resolveRuntimePersistenceMode(runtime, fallbackPersistenceMode),
    notes: Object.freeze([
      'Profile and workspace APIs are production-backed.',
      'CareDroid reads use /api/emergency/* demo envelopes until persistence ships.',
      'Critical handoffs (reception, triage assist) POST to real backend routes.',
      'Whiteboard mutations remain local-first in Zustand until PATCH endpoints land.',
    ]),
  };
}

export function resolveNormalizedEdUserContext({
  user,
  operationalProfile,
  emergencySettings = {},
  isDemoPersona = false,
}: {
  user?: UserLike;
  operationalProfile?: OperationalProfileLike;
  emergencySettings?: Record<string, unknown>;
  isDemoPersona?: boolean;
}): NormalizedEdUserContext {
  const apiEffective = operationalProfile?.effectiveProfile;
  const apiSummary = operationalProfile?.accessSummary;
  const saasRole =
    apiEffective?.saasRole ||
    apiSummary?.saasRole ||
    operationalProfile?.saasProfile?.saasRole ||
    operationalProfile?.saasProfile?.role ||
    user?.profile?.roleProfileId ||
    user?.role ||
    'student';

  const catalog = resolveUserProfileFromSaasRole(saasRole);
  const explicitEmergencyRole =
    apiSummary?.emergencyRole || apiEffective?.emergencyRoleId || null;
  const emergencyRoleId = normalizeEmergencyRole(
    explicitEmergencyRole ||
      resolveEffectiveEmergencyRole(
        {
          role: user?.role,
          profile: {
            roleProfileId:
              user?.profile?.roleProfileId ||
              catalog.emergencyRoleId ||
              user?.role,
          },
        },
        emergencySettings,
      ) ||
      catalog.emergencyRoleId ||
      EMERGENCY_ROLE_IDS.physician,
  );

  const accessSummary = apiSummary || buildUserProfileAccessSummary(catalog.saasRole);
  const landingRoute = getEmergencyRoleHomeRoute(emergencyRoleId, emergencySettings);
  const screenMode = getDefaultScreenModeForRole(emergencyRoleId) || catalog.defaultScreenMode || 'PHYSICIAN_SCREEN';

  return {
    saasRole: catalog.saasRole,
    emergencyRoleId,
    personaLabel: getPersonaLabelForRole(emergencyRoleId),
    screenMode,
    landingRoute,
    accessSummary,
    navigationRoutes: accessSummary.navigationRoutes,
    isDemoPersona,
    profileSource: isDemoPersona ? 'demo' : apiSummary ? 'api' : 'catalog-fallback',
  };
}

export function buildEdWorkflowLanePreview(laneId: string) {
  const lane = ED_WORKFLOW_LANES.find((entry) => entry.id === laneId);
  if (!lane) return null;
  const roleId = lane.emergencyRoles[0];
  return {
    lane,
    landingRoute: roleId ? getEmergencyRoleHomeRoute(roleId) : CANONICAL_ROUTES.platformStart,
    personaLabel: roleId ? getPersonaLabelForRole(roleId) : lane.label,
  };
}
