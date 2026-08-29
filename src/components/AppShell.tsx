import { lazy, Suspense, useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { useLocation, useNavigate, type To } from 'react-router-dom';
import CareDroidToastHost from './CareDroidToastHost';
import { ConfirmDialogProvider } from './ui/ConfirmDialogProvider';
import { Sidebar } from './Sidebar';
import { Header } from './Header';
import ErrorBoundary from './ErrorBoundary';
import { useEmergencyStore, type EmergencyWebSocketStatus } from '../store/emergencyStore';
import { startReassessmentEngine } from '../engine/reassessmentEngine';
import { startCapacityEngine } from '../engine/capacityEngine';
import { startContinuousPatientFlowEngine } from '../engine/continuousPatientFlowEngine';
import { startAdministrativeAutomationEngine } from '../engine/administrativeAutomationEngine';
import { startUnifiedWorkflowAutomationEngine } from '../engine/unifiedWorkflowAutomationEngine';
import { startUnifiedOperationalIntelligenceEngine } from '../engine/unifiedOperationalIntelligenceEngine';
import { startUnifiedApplicationKnowledgeGraphEngine } from '../engine/unifiedApplicationKnowledgeGraphEngine';
import { startLivingDocumentationEngine } from '../engine/livingDocumentationEngine';
import { fetchCareDroidCentralNodeSnapshot } from '../services/emergencyOsApi';
import { probeBackendReachability, isBackendKnownOffline } from '../services/backendReachability';
import { ensureDevBackendSession } from '../services/devBackendAuth';
import startEmergencyRealtime from '../services/emergencyRealtimeService';
import { bootstrapAiPlatformIntegrations } from '../services/aiPlatformBootstrap';
import { resolveClinicalToolLaunchTarget } from '../services/unifiedClinicalToolsBridge';
import { CANONICAL_ROUTES } from '../config/routes.config';
import { GOVERNANCE_WORKSPACE_ROUTES } from '../config/governanceConsoleRoutes';
import { ADMIN_CONSOLE_CHILD_ROUTES } from '../config/adminConsoleRoutes';
import { TRAINING_CONSOLE_ROUTES } from '../config/trainingConsoleRoutes';
import { TOOLS_AI_PAGE_ROUTES, TOOLS_SHORTCUT_PAGE_ROUTES } from '../config/toolsConsoleRoutes';
import { PROFILE_CONSOLE_ROUTES } from '../config/profileConsoleRoutes';
import { PUBLIC_CONSOLE_ROUTES } from '../config/publicConsoleRoutes';
import { OPERATIONS_FLEET_CONSOLE_ROUTES } from '../config/operationsFleetConsoleRoutes';
import { PLATFORM_CONSOLE_ROUTES } from '../config/platformConsoleRoutes';
import { EMERGENCY_OS_BRANDING } from '../config/emergencyOsBranding.config';
import { isReceptionFirstUxEnabled } from '../config/receptionFirstUx.config';
import {
  PractitionerVisibilityProvider,
  usePractitionerSurfaceVisibility,
} from '../contexts/PractitionerVisibilityContext';
import {
  EMERGENCY_ACTIONS,
  getReceptionPrimaryCreatePath,
  prefersReceptionForPatientCreate,
} from '../config/emergencyRolePermissions';
import { getVisibleNavigation } from '../config/unified-navigation.config';
import useEffectiveUserProfile from '../hooks/useEffectiveUserProfile';
import { getEmergencySurface } from '../config/emergencyPipelineModel';
import { useEmergencyRolePermissions } from '../hooks/useEmergencyRolePermissions';
import useRoleAccentTheme from '../hooks/useRoleAccentTheme';
import useScreenModeCapabilities from '../hooks/useScreenModeCapabilities';
import { navigateProfileAware } from '../navigation/profileRouteLaunch';
import { useSimulationMode } from '../contexts/SimulationModeContext';
import { useUserIdentity } from '../contexts/UserIdentityContext';
import { isSimulationModeActive } from '../services/simulationModeService';
import SessionChromeBar from './chrome/SessionChromeBar';
import HospitalJourneyCommandBar from './emergency/HospitalJourneyCommandBar';
import ShellRouteTab from './chrome/ShellRouteTab';
import { RouteChromeProvider, useRouteChrome } from '../contexts/RouteChromeContext';
import { NotificationShellProvider } from '../contexts/NotificationShellContext';
import SidebarNotificationPanel from './SidebarNotificationPanel';
import { useCopilotChromeAccess } from '../hooks/useCopilotChromeAccess';
import { HelpHubProvider, dispatchOpenHelpHub } from '../contexts/HelpHubContext';
import CopilotPanelLoader from './copilot/CopilotPanelLoader';
import './app-shell.css';
import {
  resolveScreenDensityProfile,
  screenDensityShellClassName,
} from '../config/screenDensityModeModel';
import {
  isExperimentalShellEngineRuntimeEnabled,
  listExperimentalShellEngines,
  shouldStartShellEngine,
} from '../config/shellEngineCatalog';
import { PatientFlag, type Patient } from '../types/emergency';
import { patientFlags } from '../utils/patientVitals';

const PatientDetailPanel = lazy(() => import('./PatientDetailPanel'));
const CommandPalette = lazy(() => import('./CommandPalette'));

const ReassessmentDrawer = lazy(() => import('./ReassessmentDrawer'));
const HelpHub = lazy(() => import('./help/HelpHub'));
const CopilotPanel = lazy(() =>
  import('./CopilotPanel').then((module) => ({ default: module.CopilotPanel })),
);

const REASSESSMENT_FLAGS = new Set<string>([
  PatientFlag.DeteriorationRisk,
  PatientFlag.SepsisAlert,
  PatientFlag.HighRisk,
  PatientFlag.ReassessmentDue,
]);

function getPatientFlagType(flag: unknown): string | null {
  if (typeof flag === 'string') return flag;
  if (flag && typeof flag === 'object' && 'type' in flag) {
    return typeof flag.type === 'string' ? flag.type : null;
  }
  return null;
}

function isPatientFlaggedForReassessment(patient: Patient): boolean {
  return patientFlags(patient).some((flag) => {
    const flagType = getPatientFlagType(flag);
    return flagType ? REASSESSMENT_FLAGS.has(flagType) : false;
  });
}

/** Exported for AppShell.pageChrome.test.tsx's registry-drift guard only. */
export const EMERGENCY_OS_PAGE_TITLES: Record<string, string> = {
  '/emergency': `${EMERGENCY_OS_BRANDING.productName} - Board`,
  [CANONICAL_ROUTES.emergencyWhiteboard]: `${EMERGENCY_OS_BRANDING.productName} - Board`,
  [CANONICAL_ROUTES.emergencyCommandCenter]: `${EMERGENCY_OS_BRANDING.productName} - Hospital Command Center`,
  [CANONICAL_ROUTES.emergencyJourney]: `${EMERGENCY_OS_BRANDING.productName} - Hospital Command Center`,
  [CANONICAL_ROUTES.emergencyPatients]: `${EMERGENCY_OS_BRANDING.productName} - Patients`,
  [CANONICAL_ROUTES.emergencyEms]: `${EMERGENCY_OS_BRANDING.productName} - EMS Coordination`,
  [CANONICAL_ROUTES.emergencyIntake]: `${EMERGENCY_OS_BRANDING.productName} - Intake`,
  [CANONICAL_ROUTES.emergencyReception]: EMERGENCY_OS_BRANDING.receptionName,
  [CANONICAL_ROUTES.emergencyQueues]: `${EMERGENCY_OS_BRANDING.productName} - Queues`,
  [CANONICAL_ROUTES.emergencyReassessment]: `${EMERGENCY_OS_BRANDING.productName} - Reassessment`,
  [CANONICAL_ROUTES.emergencyReferrals]: `${EMERGENCY_OS_BRANDING.productName} - Referrals`,
  [CANONICAL_ROUTES.emergencyCapacity]: `${EMERGENCY_OS_BRANDING.productName} - Flow & Capacity`,
  [CANONICAL_ROUTES.emergencyBoarding]: `${EMERGENCY_OS_BRANDING.productName} - Flow & Capacity`,
  [CANONICAL_ROUTES.emergencyCopilot]: `${EMERGENCY_OS_BRANDING.productName} - Copilot`,
  [CANONICAL_ROUTES.emergencyTools]: `${EMERGENCY_OS_BRANDING.productName} - Medical Tools`,
  [CANONICAL_ROUTES.emergencyHelp]: `${EMERGENCY_OS_BRANDING.productName} - Help Center`,
  [CANONICAL_ROUTES.emergencyAnalytics]: `${EMERGENCY_OS_BRANDING.productName} - Analytics`,
  [CANONICAL_ROUTES.workspace]: `${EMERGENCY_OS_BRANDING.productName} - Platform`,
  [CANONICAL_ROUTES.workspaces]: `${EMERGENCY_OS_BRANDING.productName} - Workspaces`,
  '/settings': `${EMERGENCY_OS_BRANDING.productName} - Platform Settings`,
  [CANONICAL_ROUTES.emergencySettings]: `${EMERGENCY_OS_BRANDING.productName} - Settings`,
  [CANONICAL_ROUTES.emergencyPulse]: `${EMERGENCY_OS_BRANDING.productName} - Department Pulse`,
  [CANONICAL_ROUTES.emergencyShift]: `${EMERGENCY_OS_BRANDING.productName} - Shift`,
  [CANONICAL_ROUTES.emergencyDispatch]: `${EMERGENCY_OS_BRANDING.productName} - Dispatch Console`,
  [CANONICAL_ROUTES.emergencyEdReadiness]: `${EMERGENCY_OS_BRANDING.productName} - ED Readiness`,
  [CANONICAL_ROUTES.emergencyCollaboration]: `${EMERGENCY_OS_BRANDING.productName} - Collaboration Hub`,
  [CANONICAL_ROUTES.emergencyDocumentation]: `${EMERGENCY_OS_BRANDING.productName} - Clinical Documentation`,
  [CANONICAL_ROUTES.emergencyDiagnostics]: `${EMERGENCY_OS_BRANDING.productName} - Diagnostics Coordination`,
  [CANONICAL_ROUTES.emergencyHandoffs]: `${EMERGENCY_OS_BRANDING.productName} - Structured Handoffs`,
  [CANONICAL_ROUTES.emergencyReports]: `${EMERGENCY_OS_BRANDING.productName} - Operational Reports`,
  [CANONICAL_ROUTES.emergencyAlerts]: `${EMERGENCY_OS_BRANDING.productName} - Critical Alerts`,
  [CANONICAL_ROUTES.adminOperations]: `${EMERGENCY_OS_BRANDING.productName} - Operations Console`,
  [CANONICAL_ROUTES.trainingDashboard]: `${EMERGENCY_OS_BRANDING.productName} - AI Training`,
};

/** Exported for AppShell.pageChrome.test.tsx's registry-drift guard only. */
export const EMERGENCY_OS_PAGE_SUBTITLES: Record<string, string> = {
  '/emergency': 'Patient flow, capacity, EMS, and reassessment status.',
  [CANONICAL_ROUTES.emergencyWhiteboard]: 'Operational awareness after reception prepares each patient card.',
  [CANONICAL_ROUTES.emergencyCommandCenter]:
    'Real-time ED operational awareness — actionable metrics, critical actions, bottlenecks, and compliance.',
  [CANONICAL_ROUTES.emergencyJourney]:
    'Real-time ED operational awareness — actionable metrics, critical actions, bottlenecks, and compliance.',
  [CANONICAL_ROUTES.emergencyPatients]: 'Active patient census and patient detail timeline.',
  [CANONICAL_ROUTES.emergencyEms]: 'Inbound EMS coordination, offload pressure, and handoff actions.',
  [CANONICAL_ROUTES.emergencyIntake]: 'Identity verification and patient creation workflow.',
  [CANONICAL_ROUTES.emergencyReception]: EMERGENCY_OS_BRANDING.receptionSummary,
  [CANONICAL_ROUTES.emergencyQueues]: 'Queue bottlenecks and queue-level operating metrics.',
  [CANONICAL_ROUTES.emergencyReassessment]: 'Due and overdue reassessment tasks.',
  [CANONICAL_ROUTES.emergencyCapacity]: 'Room pressure, boarding load, and department flow.',
  [CANONICAL_ROUTES.emergencyBoarding]: 'Room pressure, boarding load, and department flow.',
  [CANONICAL_ROUTES.emergencyReferrals]: 'Referral and transfer queue status.',
  [CANONICAL_ROUTES.emergencyCopilot]: 'Safe CareDroid Copilot context and actions.',
  [CANONICAL_ROUTES.emergencyTools]:
    'Clinical calculators, tool launchers, and role-aware medical utilities.',
  [CANONICAL_ROUTES.emergencyAnalytics]: 'Operational KPIs and local analytics fallback.',
  [CANONICAL_ROUTES.workspace]: 'App map for platform, product, operations, and admin routes.',
  [CANONICAL_ROUTES.workspaces]: 'Workspace registry and platform operating model.',
  // HEAL-347.80: '/settings' (Settings.tsx -- billing/subscription, compliance
  // data export/deletion, audit log, enterprise identity registry, tenant
  // isolation audit) previously shared this literal string's title/subtitle
  // with the unrelated /emergency/settings entry below, so this page's header
  // described ED tenant/module/AI/integration/threshold controls -- content
  // that page doesn't have. Found via a route-collision trace, not visually.
  '/settings': 'Billing, compliance exports, audit log, and tenant identity administration.',
  [CANONICAL_ROUTES.emergencySettings]: 'Tenant, module, AI, integration, and threshold controls.',
  [CANONICAL_ROUTES.emergencyDispatch]: 'Emergency call intake, CAD unit dispatch, and ED pre-alert coordination.',
  [CANONICAL_ROUTES.emergencyEdReadiness]: 'Bay and room readiness plans, equipment checks, and pre-arrival preparation.',
  [CANONICAL_ROUTES.emergencyCollaboration]: 'Real-time department channels for cross-role coordination and handoff messaging.',
  [CANONICAL_ROUTES.emergencyDocumentation]:
    'Draft SOAP notes, progress notes, discharge summaries, and consultation notes with clinician review before export.',
  [CANONICAL_ROUTES.emergencyDiagnostics]: 'Lab, imaging, pharmacy, and consult orders — STAT priority and result tracking.',
  [CANONICAL_ROUTES.emergencyHandoffs]: 'Disposition, admission, and EMS handoff documentation and staff assignment.',
  [CANONICAL_ROUTES.emergencyReports]: '3-minute response compliance, analytics, and shift-summary reporting surfaces.',
  [CANONICAL_ROUTES.emergencyAlerts]:
    'Review, acknowledge, and resolve operational and clinical alerts — one lifecycle, role-aware delivery.',
  [CANONICAL_ROUTES.emergencyHelp]: 'Role-based process guidance, downtime procedures, and shortcuts reference.',
  [CANONICAL_ROUTES.emergencyPulse]: 'Live department vital signs — active patients, capacity score, and the attention list.',
  [CANONICAL_ROUTES.emergencyShift]: 'Shift timer, volume and time metrics, and queue performance for the active shift.',
  [CANONICAL_ROUTES.adminOperations]:
    'Role assignments, workflow previews, team invites, and tenant policies.',
  [CANONICAL_ROUTES.trainingDashboard]:
    'AI training pipeline — data collection, cleaning, labeling, and evaluation stages.',
};

/**
 * MB-L4 (Action Registry directive) follow-up: the same "missing chrome
 * entry falls back to the CURRENT USER'S ROLE description" bug HEAL-069
 * fixed for /emergency/* pages also affects the admin/governance/training
 * console route trees -- confirmed live on /admin, /governance/registry,
 * and /training (all showed generic "CareDroid" + the physician role's
 * blurb instead of real page copy). Those 3 are now fixed directly above.
 * Governance and 7 sibling console route trees (admin, training, tools,
 * profile, public, operationsFleet, platform) each carry ~5-30 further
 * sub-routes that would need their own hand-copied entry in the maps above
 * to fix the same way -- instead of doing that, this consults each
 * registry's OWN per-route `label` data directly (the SAME data each
 * `*ConsoleRouteTree.tsx` already uses to build its route table), so every
 * current and future console workspace route gets a real title/subtitle
 * with zero further hand-maintenance.
 */
type ConsoleWorkspaceEntry = { path: string; label: string };

const ADMIN_WORKSPACE_ROUTES: ConsoleWorkspaceEntry[] = ADMIN_CONSOLE_CHILD_ROUTES.filter(
  (route) => route.path,
).map((route) => ({ path: `${CANONICAL_ROUTES.adminOperations}/${route.path}`, label: route.label }));

/** Clinical specialty/department dashboards that live in PLATFORM_CONSOLE_ROUTES for routing convenience but need their own subtitle, not the platform-admin one. */
const CLINICAL_SPECIALTY_CONSOLE_ROUTE_PATHS: string[] = [
  CANONICAL_ROUTES.clinicalDecisionSupport,
  CANONICAL_ROUTES.research,
  CANONICAL_ROUTES.knowledgeGraph,
  CANONICAL_ROUTES.laboratory,
  CANONICAL_ROUTES.pharmacy,
  CANONICAL_ROUTES.radiology,
  CANONICAL_ROUTES.education,
  CANONICAL_ROUTES.cardiology,
  CANONICAL_ROUTES.nephrology,
  CANONICAL_ROUTES.neurologyDept,
  CANONICAL_ROUTES.gastroenterology,
  CANONICAL_ROUTES.endocrinology,
  CANONICAL_ROUTES.pediatricsObgyn,
  CANONICAL_ROUTES.psychiatryDept,
  CANONICAL_ROUTES.pulmonology,
  CANONICAL_ROUTES.medical3dViewer,
];

const CONSOLE_WORKSPACE_GROUPS: Array<{ routes: readonly ConsoleWorkspaceEntry[]; subtitle: string }> = [
  {
    routes: GOVERNANCE_WORKSPACE_ROUTES,
    subtitle:
      'Production readiness, policy state, release gates, and safety blockers for clinical AI operations.',
  },
  {
    routes: ADMIN_WORKSPACE_ROUTES,
    subtitle: 'Staff workflows, tenant administration, and system health for CareDroid operators.',
  },
  {
    routes: TRAINING_CONSOLE_ROUTES,
    subtitle: 'Simulation, competency, and credentialing surfaces for clinical training.',
  },
  {
    routes: [...TOOLS_AI_PAGE_ROUTES, ...TOOLS_SHORTCUT_PAGE_ROUTES],
    subtitle: 'AI-assisted clinical tools and calculators for point-of-care decision support.',
  },
  {
    routes: PROFILE_CONSOLE_ROUTES,
    subtitle: 'Account, notification, and billing settings for your CareDroid profile.',
  },
  {
    routes: PUBLIC_CONSOLE_ROUTES.filter((route) => !route.outsideShell),
    subtitle: 'Public and consent-facing CareDroid surfaces.',
  },
  {
    routes: OPERATIONS_FLEET_CONSOLE_ROUTES,
    subtitle: 'Fleet, hospital IoT, and operations command surfaces.',
  },
  {
    // 2026-08-25: PLATFORM_CONSOLE_ROUTES mixes clinical specialty/department
    // dashboards in with genuine platform-admin/analytics pages (routing
    // convenience, not a content grouping) -- every clinical page in it was
    // inheriting this group's platform-admin subtitle verbatim (e.g. the new
    // Cardiology dashboard showing "Platform intelligence, analytics, and
    // system administration surfaces."). Split by CANONICAL_ROUTES key
    // instead of hand-writing 30+ individual subtitles.
    routes: PLATFORM_CONSOLE_ROUTES.filter((route) =>
      CLINICAL_SPECIALTY_CONSOLE_ROUTE_PATHS.some(
        (path) => route.path === path || route.path === `${path}/*`,
      ),
    ),
    subtitle: 'Specialty and department clinical dashboards — tools, protocols, and decision support by service line.',
  },
  {
    routes: PLATFORM_CONSOLE_ROUTES,
    subtitle: 'Platform intelligence, analytics, and system administration surfaces.',
  },
];

/** Exported for AppShell.pageChrome.test.tsx's registry-drift guard. */
export function resolveConsoleWorkspaceEntry(
  pathname: string,
): { label: string; subtitle: string } | null {
  for (const group of CONSOLE_WORKSPACE_GROUPS) {
    const exact = group.routes.find((route) => route.path === pathname);
    if (exact) return { label: exact.label, subtitle: group.subtitle };
  }
  for (const group of CONSOLE_WORKSPACE_GROUPS) {
    const prefixed = group.routes.find(
      (route) => route.path.endsWith('/*') && pathname.startsWith(route.path.slice(0, -1)),
    );
    if (prefixed) return { label: prefixed.label, subtitle: group.subtitle };
  }
  return null;
}

export type AppShellProps = {
  children: ReactNode;
};

type CommandAction = {
  type: string;
  path?: string;
  patientId?: string;
  value?: string;
  calculatorId?: string;
  tab?: 'page' | 'role' | 'process' | 'topics' | 'shortcuts';
  topicId?: string;
};

function isEditableShortcutTarget(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false;
  return (
    ['INPUT', 'TEXTAREA', 'SELECT'].includes(target.tagName) ||
    target.isContentEditable ||
    target.closest('[contenteditable="true"]') !== null
  );
}

function matchesNavigationPath(pathname: string, path: string): boolean {
  return pathname === path || (path !== '/emergency' && pathname.startsWith(`${path}/`));
}

const COPILOT_AGENT_PREFILL_LABELS: Record<string, string> = {
  'agent-clinical': 'CareDroid',
  'agent-emergency': 'Emergency AI',
  'agent-lab': 'Laboratory AI',
  'agent-operations': 'Operations AI',
  'agent-fleet': 'Fleet AI',
  'agent-education': 'Education AI',
  'agent-research': 'Research AI',
  'agent-governance': 'Governance AI',
};

function buildCopilotPrefillFromSearch(search: string): { message: string; patientId?: string } {
  const params = new URLSearchParams(search);
  const patientId = params.get('patientId') || undefined;
  const prompt = params.get('prompt');
  if (prompt) return { message: prompt, patientId };

  const agent = params.get('agent');
  if (agent) {
    const agentLabel = COPILOT_AGENT_PREFILL_LABELS[agent] || agent;
    return {
      message: [
        `Use ${agentLabel} (${agent}) for this ED Copilot conversation.`,
        'Keep output concise, source-aware, human-reviewed, and scoped to Emergency Department operations.',
        'Do not make autonomous clinical decisions.',
      ].join(' '),
      patientId,
    };
  }

  const tool = params.get('tool') || params.get('calc');
  if (!tool) return { message: '', patientId };

  const complaint = params.get('complaint');
  return {
    message: [
      `Launch ${tool} in ED Copilot workflow.`,
      patientId ? `Patient ID: ${patientId}.` : '',
      complaint ? `Complaint: ${complaint}.` : '',
      'Keep output concise, human-reviewed, and scoped to Emergency Department operations.',
    ]
      .filter(Boolean)
      .join(' '),
    patientId,
  };
}

function buildEmergencyToolsPath(params: Record<string, string | null | undefined>): string {
  const searchParams = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value) searchParams.set(key, value);
  }
  const search = searchParams.toString();
  return `${CANONICAL_ROUTES.emergencyTools}${search ? `?${search}` : ''}`;
}

export function AppShell({ children }: AppShellProps) {
  return (
    <ConfirmDialogProvider>
      <PractitionerVisibilityProvider>
        <HelpHubProvider>
          <NotificationShellProvider>
            <AppShellFrame>{children}</AppShellFrame>
          </NotificationShellProvider>
        </HelpHubProvider>
      </PractitionerVisibilityProvider>
    </ConfirmDialogProvider>
  );
}

function RouteChromeReset() {
  const location = useLocation();
  const { clearChrome } = useRouteChrome();

  // useLayoutEffect, NOT useEffect: pages register their chrome (title/header
  // actions) in a passive effect, and layout effects run strictly before
  // passive effects within a commit. As a passive effect this clear could land
  // AFTER the incoming route's registration when the lazy chunk was already
  // cached (both in one commit), erasing freshly-registered header actions
  // with nothing left to re-register — the pilot walkthrough's intermittently
  // missing "New Referral" action. Layout-phase clearing makes the order
  // clear-then-register in every interleaving.
  useLayoutEffect(() => {
    clearChrome();
  }, [clearChrome, location.pathname]);

  return null;
}

function AppShellFrame({ children }: AppShellProps) {
  const navigate = useNavigate();
  const location = useLocation();
  const { effectiveProfile: backendEffectiveProfile } = useUserIdentity();
  const emergencyRole = useEmergencyRolePermissions();
  useRoleAccentTheme(emergencyRole.role);
  const screenCapabilities = useScreenModeCapabilities();
  const surfaces = usePractitionerSurfaceVisibility();
  const screenDensityProfile = useMemo(
    () => resolveScreenDensityProfile(screenCapabilities.screenMode),
    [screenCapabilities.screenMode],
  );
  const isEmergencyBoardRoute =
    location.pathname === CANONICAL_ROUTES.emergencyWhiteboard ||
    location.pathname === '/emergency';
  const isPublicWaitingKiosk =
    screenCapabilities.isPublicDisplay && isEmergencyBoardRoute;
  const isReadOnlyWhiteboardKiosk =
    screenCapabilities.isWallKiosk &&
    !screenCapabilities.isPublicDisplay &&
    isEmergencyBoardRoute;
  // Patient-facing self check-in kiosk -- was rendering with the full internal
  // staff console (Sidebar nav, Critical Alerts count, Copilot, Settings, live
  // header pills) with no kiosk-mode suppression at all, since isEmergencyBoardRoute
  // only covers the whiteboard route. A screen where patients enter their own
  // name/DOB should not expose internal clinical navigation or live alert counts.
  const isSelfArrivalKiosk = location.pathname === CANONICAL_ROUTES.emergencySelfArrival;
  const useWallKioskChrome =
    screenCapabilities.useMinimalAppChrome &&
    isEmergencyBoardRoute &&
    !isPublicWaitingKiosk &&
    !isReadOnlyWhiteboardKiosk;
  const useKioskShell =
    useWallKioskChrome || isPublicWaitingKiosk || isReadOnlyWhiteboardKiosk || isSelfArrivalKiosk;
  const startupStartedRef = useRef(false);
  const receptionRouteInitialMountRef = useRef(true);
  const previousSimulationModeRef = useRef<boolean | null>(null);
  const [showPalette, setShowPalette] = useState(false);
  const [showReassessmentDrawer, setShowReassessmentDrawer] = useState(false);
  const [isMobileViewport, setIsMobileViewport] = useState(() =>
    typeof window === 'undefined' || typeof window.matchMedia !== 'function'
      ? false
      : window.matchMedia('(max-width: 768px)').matches,
  );
  const selectPatient = useEmergencyStore((state) => state.selectPatient);
  const copilotOpen = useEmergencyStore((state) => state.copilotOpen);
  const setCopilotOpen = useEmergencyStore((state) => state.setCopilotOpen);
  // Select the raw array (cheap reference-equality check) and memoize the
  // O(n) reduce on it — the previous version ran this reduce inside the
  // Zustand selector itself, which executes on every single store mutation
  // (from any of the ~8 background engines, SSE events, or API responses),
  // not just when patients actually changed. AppShell mounts on every page,
  // so this was doing wasted O(n) work app-wide on nearly every store tick.
  const patientsForReassessmentCount = useEmergencyStore((state) => state.patients);
  const reassessmentCount = useMemo(
    () =>
      patientsForReassessmentCount.reduce(
        (count, patient) => count + (isPatientFlaggedForReassessment(patient) ? 1 : 0),
        0,
      ),
    [patientsForReassessmentCount],
  );
  const { active: simulationModeActive } = useSimulationMode();
  const { canUseCopilot, hiddenOnReception } = useCopilotChromeAccess();
  const { saasRole, profileCopy } = useEffectiveUserProfile();
  const profileNavigate = useCallback(
    (to: To, options?: { replace?: boolean; state?: unknown }) =>
      navigateProfileAware(navigate, to, { saasRole, emergencyRole, ...options }),
    [emergencyRole, navigate, saasRole],
  );
  // effectiveProfile is non-null only with real backend auth (null in demo/offline).
  // Skip the saasRole nav path in demo so the emergency-role dropdown drives the sidebar.
  const navSaasRole = backendEffectiveProfile ? saasRole : undefined;
  const visibleNavigationItems = useMemo(
    () =>
      getVisibleNavigation(emergencyRole.role, {
        saasRole: navSaasRole,
        compiledProfile: emergencyRole.compiledProfile,
      }),
    [emergencyRole.compiledProfile, emergencyRole.role, navSaasRole],
  );
  const currentPage = useMemo(() => {
    const surface = getEmergencySurface(location.pathname);
    const activeItem = visibleNavigationItems.find(
      (item) =>
        item.id === surface?.sidebarNavId ||
        item.activePaths?.some((path) => matchesNavigationPath(location.pathname, path)) ||
        matchesNavigationPath(location.pathname, item.path),
    );
    const title = EMERGENCY_OS_PAGE_TITLES[location.pathname];
    const labelFromTitle = title?.includes(' - ')
      ? title.split(' - ').slice(1).join(' - ')
      : title;
    const consoleWorkspaceEntry = resolveConsoleWorkspaceEntry(location.pathname);

    return {
      label:
        labelFromTitle || consoleWorkspaceEntry?.label || activeItem?.label || EMERGENCY_OS_BRANDING.productName,
      subtitle:
        EMERGENCY_OS_PAGE_SUBTITLES[location.pathname] ||
        consoleWorkspaceEntry?.subtitle ||
        (activeItem
          ? profileCopy.workspaceDescription || `Open ${activeItem.label} in CareDroid.`
          : profileCopy.workspaceDescription || EMERGENCY_OS_BRANDING.safetyLine),
    };
  }, [location.pathname, profileCopy.workspaceDescription, visibleNavigationItems]);

  useEffect(() => {
    if (startupStartedRef.current) return undefined;
    startupStartedRef.current = true;

    let cancelled = false;
    let stopSimulation: (() => void) | undefined;
    let stopRealtime: (() => void) | undefined;

    bootstrapAiPlatformIntegrations();
    if (isReceptionFirstUxEnabled()) {
      void import('../pages/emergency/ReceptionWorkspace');
    }
    let stopObservabilityHeartbeat: (() => void) | undefined;
    void import('../services/observabilityService').then(({ default: observabilityService }) => {
      if (cancelled) return;
      stopObservabilityHeartbeat = observabilityService.startDiagnosticsHeartbeat(120_000);
      observabilityService.recordEvent({
        category: 'health',
        name: 'app_shell_mounted',
        severity: 'info',
        source: 'AppShell',
        metadata: { route: location.pathname },
      });
    }).catch((error) => {
      console.error('[AppShell] observabilityService initialization failed:', error);
    });
    void (async () => {
      const session = await ensureDevBackendSession();
      // A successful ensureDevBackendSession() already proves the backend is
      // reachable (either a real response just landed, or an already-cached
      // JWT was reused) -- re-probing /health here was pure sequential
      // latency added on top of a fact we already know, confirmed live to
      // add up to ~1.2s to the reception page's pre-data-load chain.
      const backendReachable =
        session?.source === 'dev-session' || session?.source === 'cached-jwt'
          ? true
          : await probeBackendReachability();
      // Was `||`: since RECEPTION_FIRST_UX.enabled is a hardcoded `true`
      // constant (never toggled), that made receptionStartup unconditionally
      // true on EVERY route, so EVERY page load fired the reception-scoped
      // fetch (whiteboard + receptionSnapshot) AND THEN a separate full-scope
      // fetch that re-fetches those exact same two datasets again, plus
      // boarding/reassessment/referrals/workflowLogs/queues -- double
      // bootstrap network+state-churn on every non-reception page, and the
      // `else` single-fetch branch below was unreachable dead code. `&&`
      // restores the real gate: the reception fast-path only applies when
      // actually on/entering a reception route.
      const receptionStartup =
        isReceptionFirstUxEnabled() &&
        location.pathname.startsWith(CANONICAL_ROUTES.emergencyReception);
      if (backendReachable) {
        if (receptionStartup) {
          await useEmergencyStore.getState().initializeFromBackend({ scope: 'reception' });
          // 'full-supplemental' (not 'full'): scope:'reception' just fetched
          // whiteboard + receptionSnapshot already -- see
          // SUPPLEMENTAL_REFRESH_DATASETS's own comment in emergencyStore.ts.
          void useEmergencyStore
            .getState()
            .initializeFromBackend({ scope: 'full-supplemental', silent: true });
        } else {
          await useEmergencyStore.getState().initializeFromBackend();
        }
      } else {
        // No backend — stay on local/simulation data; no network calls needed
        useEmergencyStore.setState({ backendAvailable: false, persistenceMode: 'local' });
      }
      useEmergencyStore.getState().updateAlerts();
    })();

    stopRealtime = startEmergencyRealtime({
      onEvent: (event: { type?: string; payload?: unknown }) => {
        useEmergencyStore.getState().dispatchWebSocketEvent(event);
      },
      onStatus: (status: Partial<EmergencyWebSocketStatus>) => {
        useEmergencyStore.getState().setWebSocketStatus(status);
      },
      onPoll: async () => {
        if (isSimulationModeActive()) return;
        // Re-probe backend; skip all network calls if still unreachable
        const reachable = await probeBackendReachability();
        if (!reachable || isBackendKnownOffline()) return;
        const store = useEmergencyStore.getState();
        await store.refreshAllData({ silent: true });
        try {
          const envelope = await fetchCareDroidCentralNodeSnapshot();
          store.dispatchWebSocketEvent({ type: 'central_node_snapshot', payload: envelope });
          store.setWebSocketStatus({
            status: 'connected',
            mode: 'polling',
            lastEventAt: new Date().toISOString(),
            message: 'CareDroid snapshot refreshed via polling fallback.',
          });
        } catch (error: any) {
          const message =
            error instanceof Error ? error.message : 'Unable to refresh central node snapshot.';
          store.setWebSocketStatus({
            status: 'reconnecting',
            mode: 'polling',
            message,
            updatedAt: new Date().toISOString(),
          });
        }
      },
    });

    // Stage F: engines are session-local. Experimental engines default OFF in production
    // (VITE_ENABLE_EXPERIMENTAL_SHELL_ENGINES=true to re-enable).
    const experimentalEnginesEnabled = isExperimentalShellEngineRuntimeEnabled();
    const engineCaps = {
      showReassessmentEngine: screenCapabilities.showReassessmentEngine,
      showCapacityEngine: screenCapabilities.showCapacityEngine,
      showPatientFlowEngine: screenCapabilities.showPatientFlowEngine,
      showAdministrativeAutomationEngine: screenCapabilities.showAdministrativeAutomationEngine,
      showOperationalIntelligenceEngine: screenCapabilities.showOperationalIntelligenceEngine,
    };
    if (import.meta.env.DEV) {
      console.info(
        '[AppShell] experimental engines',
        experimentalEnginesEnabled ? 'ON' : 'OFF',
        listExperimentalShellEngines().map((e) => e.id).join(','),
      );
    }

    const reassessmentInterval = shouldStartShellEngine('reassessment', engineCaps, {
      experimentalEnabled: experimentalEnginesEnabled,
    })
      ? startReassessmentEngine()
      : undefined;
    const capacityInterval = shouldStartShellEngine('capacity', engineCaps, {
      experimentalEnabled: experimentalEnginesEnabled,
    })
      ? startCapacityEngine()
      : undefined;
    const patientFlowInterval = shouldStartShellEngine('continuousPatientFlow', engineCaps, {
      experimentalEnabled: experimentalEnginesEnabled,
    })
      ? startContinuousPatientFlowEngine()
      : undefined;
    const administrativeAutomationInterval = shouldStartShellEngine(
      'administrativeAutomation',
      engineCaps,
      { experimentalEnabled: experimentalEnginesEnabled },
    )
      ? startAdministrativeAutomationEngine()
      : undefined;
    const stopUnifiedWorkflowAutomation = shouldStartShellEngine(
      'unifiedWorkflowAutomation',
      engineCaps,
      { experimentalEnabled: experimentalEnginesEnabled },
    )
      ? startUnifiedWorkflowAutomationEngine()
      : undefined;
    const stopUnifiedOperationalIntelligence = shouldStartShellEngine(
      'unifiedOperationalIntelligence',
      engineCaps,
      { experimentalEnabled: experimentalEnginesEnabled },
    )
      ? startUnifiedOperationalIntelligenceEngine()
      : undefined;
    const stopUnifiedApplicationKnowledgeGraph = shouldStartShellEngine(
      'unifiedApplicationKnowledgeGraph',
      engineCaps,
      { experimentalEnabled: experimentalEnginesEnabled },
    )
      ? startUnifiedApplicationKnowledgeGraphEngine()
      : undefined;
    const stopLivingDocumentation = shouldStartShellEngine('livingDocumentation', engineCaps, {
      experimentalEnabled: experimentalEnginesEnabled,
    })
      ? startLivingDocumentationEngine()
      : undefined;
    const alertsInterval = window.setInterval(() => {
      useEmergencyStore.getState().updateAlerts();
      void import('../services/alertLifecycleOrchestrator').then(({ checkUnacknowledgedAlertEscalations }) =>
        checkUnacknowledgedAlertEscalations(),
      ).catch((error) => {
        console.error('[AppShell] checkUnacknowledgedAlertEscalations failed:', error);
      });
    }, 30_000);

    if (simulationModeActive) {
      void import('../engine/simulation').then((simulation) => {
        if (cancelled) return;
        simulation.startSimulation();
        stopSimulation = simulation.stopSimulation;
      }).catch((error) => {
        console.error('[AppShell] simulation start failed:', error);
      });
    }

    return () => {
      cancelled = true;
      stopObservabilityHeartbeat?.();
      stopRealtime?.();
      if (reassessmentInterval !== undefined) window.clearInterval(reassessmentInterval);
      if (capacityInterval !== undefined) window.clearInterval(capacityInterval);
      if (patientFlowInterval !== undefined) window.clearInterval(patientFlowInterval);
      if (administrativeAutomationInterval !== undefined) {
        window.clearInterval(administrativeAutomationInterval);
      }
      stopUnifiedWorkflowAutomation?.();
      stopUnifiedOperationalIntelligence?.();
      stopUnifiedApplicationKnowledgeGraph?.();
      stopLivingDocumentation?.();
      window.clearInterval(alertsInterval);
      stopSimulation?.();
      startupStartedRef.current = false;
    };
  }, [
    screenCapabilities.showCapacityEngine,
    screenCapabilities.showReassessmentEngine,
    screenCapabilities.showPatientFlowEngine,
    screenCapabilities.showOperationalIntelligenceEngine,
    screenCapabilities.showAdministrativeAutomationEngine,
    simulationModeActive,
  ]);

  // HEAL-347.2: Command Palette and Reassessment Drawer were reported as
  // "become permanently unresponsive after ~10-20 minutes of session use" --
  // live-timed instead of just statically read (two prior sessions'
  // approach), and that framing turned out to be a misdiagnosis of a Vite
  // dev-server artifact, not a real app bug. Every panel below is
  // React.lazy() -- Vite only transforms a lazy chunk's module graph the
  // FIRST time it's actually requested, and in dev that first request can
  // take several real seconds (confirmed live: Command Palette's first open
  // took >9s cold vs. ~300-600ms on every open after; Reassessment Drawer
  // ~1.8s cold vs. ~300ms warm). Testers commonly reach for these secondary
  // panels well into a session rather than immediately on load, which
  // produces exactly the "looks broken later in the session" correlation
  // that was previously attributed to session age/duration rather than to
  // "which panel had never been opened yet." Warming every shell panel's
  // chunk during a post-mount idle window (not blocking first paint, and a
  // harmless no-op in a production build where chunks are already static
  // assets) means no real interaction ever hits the cold-compile path.
  //
  // HEAL-347.9: the SAME mechanism also hits route-level React.lazy() pages,
  // not just these shell overlay panels -- live-timed a live-browser recon
  // session and found /emergency/referrals took 6.7s to render on its first
  // client-side navigation vs. ~530ms on every navigation after (the exact
  // same cold-vs-warm signature as Command Palette above), plus the same
  // pattern on the Triage-queue redirect (5.3s) and Handoffs (4.3s cold).
  // Whiteboard doesn't need its own entry -- it's the post-login landing
  // page, already warm by the time a user could navigate anywhere else.
  //
  // HEAL-347.10: the original HEAL-347.9 pass wrongly assumed Patients/
  // Queues/Reassessment shared Whiteboard's chunk (`pages/emergency/index.tsx`)
  // -- a fresh, unconfounded live test (isolated first-visit, no prior
  // navigation warming anything) showed Patients was ALSO cold. Reading
  // router.tsx found the real shape: `PatientsRoute`/`QueueRoute`/
  // `ReassessmentRoute`/`BoardingRoute`/`CapacityRoute`/`CopilotRoute` are
  // all `lazyNamed(() => import('pages/emergency/emergencyRoutePages'), ...)`
  // -- SIX named exports from ONE shared chunk, entirely separate from
  // Whiteboard's own chunk and missed by the original grep (which only
  // matched the `lazyRoute(() => import(...))` helper, not `lazyNamed`).
  // One prefetch of that module warms all six views at once.
  //
  // HEAL-347.43: all 13 of these fired in the same tick, every one a
  // concurrent dynamic-import request racing the CURRENT route's own
  // (higher-priority, blocking) chunk fetch for the dev server's limited
  // concurrent-transform capacity -- live-timed via network trace: landing
  // directly on /emergency/analytics (one of this list's own targets, and
  // documented above as this suite's heaviest fresh-mount route) produced
  // 100+ concurrent/aborted requests and left the page stuck on "Loading
  // analytics..." indefinitely, i.e. this prefetch batch was fighting the
  // very navigation a user was actively waiting on. Skip whichever entry
  // matches the route the user is ALREADY on -- the router is already
  // fetching that chunk with priority, so prefetching it too is pure
  // redundant load -- and stagger the rest instead of firing all at once,
  // so they don't stampede the dev server's transform queue together.
  useEffect(() => {
    // Each entry is its own statically-analyzable `import('literal/path')`
    // thunk (required for Vite to code-split it at all) paired with an
    // optional skip test; only the route-page entries need one, since only
    // they can duplicate a fetch the router itself is already making.
    const entries: Array<{ load: () => Promise<unknown>; skip?: () => boolean }> = [
      { load: () => import('./PatientDetailPanel') },
      { load: () => import('./CommandPalette') },
      { load: () => import('./ReassessmentDrawer') },
      { load: () => import('./help/HelpHub') },
      { load: () => import('./CopilotPanel') },
      { load: () => import('./ReferralPanel') },
      {
        load: () => import('../pages/emergency/ReceptionWorkspace'),
        skip: () => location.pathname.startsWith(CANONICAL_ROUTES.emergencyReception),
      },
      { load: () => import('../pages/emergency/FullJourneyOperatingPage') },
      {
        load: () => import('../pages/emergency/EmergencyAnalytics'),
        skip: () => location.pathname.startsWith(CANONICAL_ROUTES.emergencyAnalytics),
      },
      {
        load: () => import('../pages/emergency/EmergencySettings'),
        skip: () => location.pathname.startsWith(CANONICAL_ROUTES.emergencySettings),
      },
      { load: () => import('../pages/collaboration/CollaborationHub') },
      // Hospital Command Center is the 2nd item in the COMMAND sidebar
      // section (right below Whiteboard) -- one of the most likely first
      // clicks after login, and it was missing from this list, so it hit
      // the same cold-compile stall as the routes above (live-timed: 12s+
      // stuck on "Loading Hospital Command Center..." on first request).
      { load: () => import('../pages/emergency/HospitalCommandCenter') },
      // Warms PatientsRoute/QueueRoute/ReassessmentRoute/BoardingRoute/
      // CapacityRoute/CopilotRoute in one request -- see HEAL-347.10 above.
      // HEAL-347.52: unlike every other entry above whose target route can
      // duplicate the CURRENT navigation's own fetch, this one never had a
      // skip check at all -- landing directly on any of its six served
      // routes (the realistic case for a bookmarked/refreshed/deep-linked
      // URL, not just a click-through from another page) made this effect
      // redundantly re-fetch the exact chunk the router was already
      // fetching with priority, live-timed via network trace to leave
      // /emergency/queues stuck past 20s with 40-60 concurrent pending
      // requests (many of them unrelated chunks from OTHER entries in this
      // same list, all competing for the dev server's limited transform
      // capacity at once) -- the identical failure mode HEAL-347.43
      // documented and fixed for Reception/Analytics/Settings, just missed
      // on this one entry.
      {
        load: () => import('../pages/emergency/emergencyRoutePages'),
        skip: () =>
          [
            CANONICAL_ROUTES.emergencyPatients,
            CANONICAL_ROUTES.emergencyQueues,
            CANONICAL_ROUTES.emergencyReassessment,
            CANONICAL_ROUTES.emergencyBoarding,
            CANONICAL_ROUTES.emergencyCapacity,
            CANONICAL_ROUTES.emergencyCopilot,
            CANONICAL_ROUTES.triage,
          ].some((path) => location.pathname.startsWith(path)),
      },
      // HEAL-347.48: /tools/calculators (and every other /tools/* console
      // page -- ToolsFilteredConsole handles all of them) hit the same
      // cold-compile stall as the routes above -- live-timed at 13.5-25s
      // stuck on "Loading tool console..." on first navigation, since this
      // list previously covered zero pages outside the ED workspace.
      {
        load: () => import('../pages/tools/ToolsFilteredConsole'),
        skip: () => location.pathname.startsWith('/tools'),
      },
    ];
    const targets = entries.filter((entry) => !entry.skip?.());
    let cancelled = false;
    const timeouts: number[] = [];
    const prefetch = () => {
      targets.forEach((entry, index) => {
        timeouts.push(
          window.setTimeout(() => {
            if (!cancelled) void entry.load();
          }, index * 120),
        );
      });
    };
    const ric = (window as any).requestIdleCallback;
    if (typeof ric === 'function') {
      const handle = ric(prefetch, { timeout: 4000 });
      return () => {
        cancelled = true;
        timeouts.forEach((id) => window.clearTimeout(id));
        (window as any).cancelIdleCallback?.(handle);
      };
    }
    const timeoutId = window.setTimeout(prefetch, 2000);
    return () => {
      cancelled = true;
      timeouts.forEach((id) => window.clearTimeout(id));
      window.clearTimeout(timeoutId);
    };
    // Intentionally mount-only (see HEAL-347.2/347.9/347.10 above); location is read once to
    // decide the initial skip-list, not tracked reactively. (This used to carry a suppression
    // comment for the React hooks deps-array lint rule, but that plugin was never actually
    // installed in this repo, so ESLint 9's flat config treated the comment itself as an error:
    // a disable directive for a rule it can't find. Dropped -- there's nothing to suppress.)
  }, []);

  useEffect(() => {
    if (!location.pathname.startsWith(CANONICAL_ROUTES.emergencyReception)) return;
    if (receptionRouteInitialMountRef.current) {
      receptionRouteInitialMountRef.current = false;
      return;
    }
    void useEmergencyStore.getState().refreshAllData({ scope: 'reception', silent: true });
  }, [location.pathname]);

  useEffect(() => {
    if (previousSimulationModeRef.current === simulationModeActive) return;
    const isInitialMount = previousSimulationModeRef.current === null;
    previousSimulationModeRef.current = simulationModeActive;
    if (isInitialMount) return;
    void useEmergencyStore.getState().initializeFromBackend();
  }, [simulationModeActive]);

  useEffect(() => {
    if (!canUseCopilot || useKioskShell) return;
    if (hiddenOnReception) return;
    const dismissed =
      typeof sessionStorage !== 'undefined' && sessionStorage.getItem('ed:copilot-dismissed');
    if (isEmergencyBoardRoute && !dismissed && !copilotOpen && surfaces.chrome.copilotAutoOpen) {
      setCopilotOpen(true);
    }
  }, [
    canUseCopilot,
    copilotOpen,
    hiddenOnReception,
    isEmergencyBoardRoute,
    setCopilotOpen,
    surfaces.chrome.copilotAutoOpen,
    useKioskShell,
  ]);

  useEffect(() => {
    if (location.pathname !== CANONICAL_ROUTES.emergencyCopilot || !canUseCopilot) return;

    const prefill = buildCopilotPrefillFromSearch(location.search);
    setCopilotOpen(true);
    profileNavigate(`${CANONICAL_ROUTES.emergencyWhiteboard}${location.search}`, { replace: true });

    if (prefill.message || prefill.patientId) {
      const timer = window.setTimeout(() => {
        window.dispatchEvent(
          new CustomEvent('ed:copilot-prefill', {
            detail: { message: prefill.message, patientId: prefill.patientId },
          }),
        );
      }, 100);
      return () => window.clearTimeout(timer);
    }

    return undefined;
  }, [canUseCopilot, location.pathname, location.search, profileNavigate, setCopilotOpen]);

  useEffect(() => {
    if (typeof window.matchMedia !== 'function') return undefined;

    const mobileQuery = window.matchMedia('(max-width: 768px)');
    const syncViewportState = () => {
      setIsMobileViewport(mobileQuery.matches);
    };

    syncViewportState();
    mobileQuery.addEventListener('change', syncViewportState);
    return () => {
      mobileQuery.removeEventListener('change', syncViewportState);
    };
  }, []);

  useEffect(() => {
    const configuredTitle = EMERGENCY_OS_PAGE_TITLES[location.pathname];
    if (configuredTitle) {
      document.title = configuredTitle;
      return;
    }

    const consoleLabel = resolveConsoleWorkspaceEntry(location.pathname)?.label;
    if (consoleLabel) {
      document.title = `${EMERGENCY_OS_BRANDING.productName} - ${consoleLabel}`;
      return;
    }

    const activeItem = visibleNavigationItems.find((item) =>
      matchesNavigationPath(location.pathname, item.path),
    );
    document.title = activeItem
      ? `${EMERGENCY_OS_BRANDING.productName} - ${activeItem.label}`
      : EMERGENCY_OS_BRANDING.productName;
  }, [location.pathname, visibleNavigationItems]);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      const store = useEmergencyStore.getState();
      const inInput = isEditableShortcutTarget(e.target);

      if (inInput) return;

      if (e.key === 'Escape') {
        document.dispatchEvent(new Event('close-help-hub'));
        if (store.copilotOpen) {
          store.setCopilotOpen(false);
          return;
        }
        store.selectPatient(null);
        setShowReassessmentDrawer(false);
        document.dispatchEvent(new Event('close-all-panels'));
        return;
      }

      if (e.key === '?' && !e.metaKey && !e.ctrlKey && !e.altKey && !e.repeat) {
        e.preventDefault();
        dispatchOpenHelpHub({ tab: 'page' });
        return;
      }

      if (e.shiftKey && e.key.toLowerCase() === 'h') {
        e.preventDefault();
        profileNavigate(
          emergencyRole.landingRoute ||
            emergencyRole.defaultRoute ||
            CANONICAL_ROUTES.emergencyReception,
        );
        return;
      }

      if (e.shiftKey && e.key.toLowerCase() === 'w') {
        e.preventDefault();
        profileNavigate(emergencyRole.nearestRoute(CANONICAL_ROUTES.emergencyWhiteboard));
        return;
      }

      if (e.shiftKey && e.key.toLowerCase() === 'p') {
        e.preventDefault();
        profileNavigate(emergencyRole.nearestRoute(CANONICAL_ROUTES.emergencyPulse));
        return;
      }

      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        document.dispatchEvent(new Event('open-command-palette'));
        return;
      }

      if (
        e.key.toLowerCase() === 'c' &&
        !e.metaKey &&
        !e.ctrlKey &&
        !e.altKey &&
        !e.repeat &&
        canUseCopilot
      ) {
        e.preventDefault();
        store.toggleCopilot();
        return;
      }

      if (e.key.toLowerCase() === 'a' && !e.metaKey && !e.ctrlKey && !e.altKey && !e.repeat) {
        e.preventDefault();
        document.dispatchEvent(new Event('open-notification-center'));
        return;
      }

      if (e.key.toLowerCase() === 'd' && !e.metaKey && !e.ctrlKey && !e.altKey && !e.repeat) {
        if (emergencyRole.canAccessRoute(CANONICAL_ROUTES.emergencyDocumentation)) {
          e.preventDefault();
          profileNavigate(CANONICAL_ROUTES.emergencyDocumentation);
        }
        return;
      }

      if (e.key.toLowerCase() === 'r' && !e.metaKey && !e.ctrlKey && !e.altKey && !e.repeat) {
        // HEAL-347.84: screenCapabilities.showReassessAction is a pure
        // screen-mode/device flag (useScreenModeCapabilities.ts) -- it has no
        // awareness of the current role at all, unlike the identical-shape
        // 'd' shortcut just above, which already checks canAccessRoute(). A
        // role with no /emergency/reassessment access (registration-clerk,
        // read-only-viewer) could open ReassessmentDrawer -- which itself
        // also has zero permission check of its own -- purely because their
        // device happened to be in a clinical screen mode. The backend's
        // reassess/dismiss endpoints already require WRITE_PHI (confirmed via
        // the backend authorization audit, HEAL-347.83), so this was never a
        // real PHI-disclosure gap, but it let an unauthorized role open a
        // write-capable clinical UI it can't actually use -- fixed the same
        // way the route-level guard already does it.
        if (
          screenCapabilities.showReassessAction &&
          emergencyRole.canAccessRoute(CANONICAL_ROUTES.emergencyReassessment)
        ) {
          e.preventDefault();
          setShowReassessmentDrawer((open) => !open);
        }
        return;
      }

      if (e.key === '/' && !e.metaKey && !e.ctrlKey && !e.altKey) {
        e.preventDefault();
        if (location.pathname === CANONICAL_ROUTES.emergencyReception) {
          document.dispatchEvent(new Event('focus-reception-search'));
        } else {
          document.dispatchEvent(new Event('open-command-palette'));
        }
      }
      if (
        e.key === 'n' &&
        !e.metaKey &&
        !e.ctrlKey &&
        emergencyRole.actionEnabled(EMERGENCY_ACTIONS.createPatient)
      ) {
        e.preventDefault();
        if (prefersReceptionForPatientCreate(emergencyRole.role)) {
          profileNavigate(getReceptionPrimaryCreatePath(emergencyRole.role));
          return;
        }
        profileNavigate(CANONICAL_ROUTES.emergencyWhiteboard);
        window.setTimeout(() => document.dispatchEvent(new Event('open-intake')), 0);
      }
    };

    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [canUseCopilot, emergencyRole, location.pathname, profileNavigate, screenCapabilities.showReassessAction]);

  useEffect(() => {
    const openPalette = () => setShowPalette(true);
    const closePanels = () => {
      setShowPalette(false);
      setShowReassessmentDrawer(false);
    };
    const openReassessmentDrawer = () => {
      if (
        screenCapabilities.showReassessAction &&
        emergencyRole.canAccessRoute(CANONICAL_ROUTES.emergencyReassessment)
      ) {
        setShowReassessmentDrawer(true);
      }
    };
    document.addEventListener('open-command-palette', openPalette);
    document.addEventListener('open-reassessment', openReassessmentDrawer);
    document.addEventListener('open-reassessment-drawer', openReassessmentDrawer);
    document.addEventListener('close-all-panels', closePanels);
    return () => {
      document.removeEventListener('open-command-palette', openPalette);
      document.removeEventListener('open-reassessment', openReassessmentDrawer);
      document.removeEventListener('open-reassessment-drawer', openReassessmentDrawer);
      document.removeEventListener('close-all-panels', closePanels);
    };
  }, [screenCapabilities.showReassessAction, emergencyRole]);

  useEffect(() => {
    const openTools = (event: Event) => {
      const detail =
        (event as CustomEvent<{ filter?: string; query?: string; source?: string; patientId?: string }>).detail || {};
      const target = resolveClinicalToolLaunchTarget({
        emergencyRoleId: emergencyRole.role,
        canAccessToolsRoute: emergencyRole.canAccessRoute(CANONICAL_ROUTES.emergencyTools),
        kind: 'tools-hub',
        toolId: detail.query,
        patientId: detail.patientId,
        filter: detail.filter || 'all',
        source: detail.source || 'chat',
      });
      profileNavigate(`${target.pathname}${target.search}`);
    };

    const openCalculator = (event: Event) => {
      const detail =
        (event as CustomEvent<{ calculatorId?: string; patientId?: string | null }>).detail || {};
      const target = resolveClinicalToolLaunchTarget({
        emergencyRoleId: emergencyRole.role,
        canAccessToolsRoute: emergencyRole.canAccessRoute(CANONICAL_ROUTES.emergencyTools),
        kind: 'calculator',
        calculatorId: detail.calculatorId,
        patientId: detail.patientId || undefined,
        source: 'calculators',
      });
      profileNavigate(`${target.pathname}${target.search}`);
    };

    const openPatientDetail = (event: Event) => {
      const detail = (event as CustomEvent<{ patientId?: string }>).detail || {};
      if (!detail.patientId) return;
      selectPatient(detail.patientId);
    };

    window.addEventListener('ed:open-tools', openTools);
    window.addEventListener('ed:open-calculator', openCalculator);
    window.addEventListener('ed:open-patient-detail', openPatientDetail);
    return () => {
      window.removeEventListener('ed:open-tools', openTools);
      window.removeEventListener('ed:open-calculator', openCalculator);
      window.removeEventListener('ed:open-patient-detail', openPatientDetail);
    };
  }, [emergencyRole, profileNavigate, selectPatient]);

  const handleCommandExecute = (action: CommandAction) => {
    switch (action.type) {
      case 'OPEN_INTAKE':
        if (!emergencyRole.actionEnabled(EMERGENCY_ACTIONS.createPatient)) break;
        if (prefersReceptionForPatientCreate(emergencyRole.role)) {
          profileNavigate(getReceptionPrimaryCreatePath(emergencyRole.role));
          break;
        }
        profileNavigate(CANONICAL_ROUTES.emergencyWhiteboard);
        document.dispatchEvent(new Event('open-intake'));
        break;
      case 'OPEN_ROUTE':
        if (action.path) {
          profileNavigate(action.path);
        }
        break;
      case 'VIEW_PATIENT':
      case 'FIND_PATIENT':
        if (action.patientId) selectPatient(action.patientId);
        else if (action.value)
          profileNavigate(`${CANONICAL_ROUTES.emergencyPatients}?q=${encodeURIComponent(action.value)}`);
        else profileNavigate(CANONICAL_ROUTES.emergencyPatients);
        break;
      case 'OPEN_REFERRAL': {
        if (!emergencyRole.actionEnabled(EMERGENCY_ACTIONS.manageReferral)) break;
        const params = new URLSearchParams();
        if (action.patientId) params.set('patientId', action.patientId);
        if (action.value) params.set('patientSearch', action.value);
        params.set('new', '1');
        profileNavigate(`${CANONICAL_ROUTES.emergencyReferrals}?${params.toString()}`);
        break;
      }
      case 'OPEN_PEDIATRIC_DRUGS':
        profileNavigate(
          buildEmergencyToolsPath({
            source: 'calculators',
            filter: 'calculator',
            q: 'pediatric-dose-safety-checker',
            open: 'pediatric-dose-safety-checker',
          }),
        );
        break;
      case 'OPEN_CALCULATOR': {
        const params = new URLSearchParams({
          source: 'calculators',
          filter: 'calculator',
        });
        if (action.calculatorId) {
          params.set('q', action.calculatorId);
          params.set('open', action.calculatorId);
        }
        if (action.patientId) params.set('patientId', action.patientId);
        profileNavigate(`${CANONICAL_ROUTES.emergencyTools}?${params.toString()}`);
        break;
      }
      case 'OPEN_CAPACITY':
        if (!emergencyRole.canAccessRoute(CANONICAL_ROUTES.emergencyCapacity)) break;
        profileNavigate(CANONICAL_ROUTES.emergencyCapacity);
        break;
      case 'OPEN_REASSESSMENT_QUEUE':
        if (!emergencyRole.canAccessRoute(CANONICAL_ROUTES.emergencyReassessment)) break;
        setShowReassessmentDrawer(true);
        break;
      case 'CLEAR_FILTERS':
        document.dispatchEvent(new Event('clear-whiteboard-filters'));
        profileNavigate(CANONICAL_ROUTES.emergencyWhiteboard);
        break;
      case 'OPEN_HELP':
        dispatchOpenHelpHub({ tab: action.tab || 'page', topicId: action.topicId });
        break;
      default:
        break;
    }
    setShowPalette(false);
  };

  const isReceptionSimpleDensity = screenDensityProfile.id === 'simple-fast';

  return (
    <div
      className={[
        'emergency-app-shell',
        'cdl-shell',
        'ml-app-shell',
        screenDensityShellClassName(screenCapabilities.screenMode),
        isPublicWaitingKiosk ? 'emergency-app-shell--public-waiting-kiosk' : '',
        isReadOnlyWhiteboardKiosk ? 'emergency-app-shell--read-only-whiteboard-kiosk' : '',
        isSelfArrivalKiosk ? 'emergency-app-shell--self-arrival-kiosk' : '',
        copilotOpen && canUseCopilot && !useKioskShell ? 'emergency-app-shell--copilot-open' : '',
        isReceptionSimpleDensity ? 'emergency-app-shell--reception-density' : '',
      ]
        .filter(Boolean)
        .join(' ')}
      data-medical-theme="light"
      data-screen-density={screenDensityProfile.id}
      data-ai-chrome={copilotOpen && canUseCopilot ? 'open' : 'closed'}
    >
      <a className="ed-skip-link" href="#main-content">
        Skip to main content
      </a>
      {useKioskShell ? null : <Sidebar navigationItems={visibleNavigationItems} />}
      {!useKioskShell ? <SidebarNotificationPanel /> : null}
      <div className="emergency-app-shell__main-column">
        <RouteChromeProvider>
          <RouteChromeReset />
          {useWallKioskChrome ? (
            <header className="emergency-wall-kiosk-header">
              <strong>{screenCapabilities.label}</strong>
              <span className="emergency-wall-kiosk-header__safety">{EMERGENCY_OS_BRANDING.safetyLine}</span>
            </header>
          ) : isPublicWaitingKiosk || isReadOnlyWhiteboardKiosk || isSelfArrivalKiosk ? null : (
            <>
              <Header />
              {/* Reception simple-fast density: one route tab only — avoid stacking journey + session bars */}
              <ShellRouteTab title={currentPage.label} subtitle={currentPage.subtitle} />
              {!useKioskShell && !isReceptionSimpleDensity ? <HospitalJourneyCommandBar /> : null}
              {!useKioskShell && !isReceptionSimpleDensity ? <SessionChromeBar /> : null}
            </>
          )}
          <main
            id="main-content"
            className={[
              'app-shell-main-content',
              isMobileViewport ? 'app-shell-main-content--mobile-nav' : '',
            ]
              .filter(Boolean)
              .join(' ')}
            role="main"
            tabIndex={-1}
            data-screen-density-mode={screenDensityProfile.id}
            data-practitioner-compact={surfaces.compactLayout ? 'true' : undefined}
          >
            <ErrorBoundary
              key={location.pathname}
              resetKey={location.pathname}
              fallbackText={`${screenCapabilities.productLabel} page encountered an error. Refresh to reload.`}
            >
              <Suspense
                fallback={
                  <div role="status" className="app-shell-route-loading">
                    Loading {screenCapabilities.productLabel} page...
                  </div>
                }
              >
                {children}
              </Suspense>
            </ErrorBoundary>
          </main>
        </RouteChromeProvider>
      </div>
      {!screenCapabilities.isRegistrationScreen && !useKioskShell ? (
      <ErrorBoundary fallbackText="PatientDetailPanel encountered an error. Refresh to reload.">
        <Suspense fallback={null}>
          <PatientDetailPanel />
        </Suspense>
      </ErrorBoundary>
      ) : null}
      {canUseCopilot && !useKioskShell && !hiddenOnReception && copilotOpen ? (
        <ErrorBoundary
          key={`copilot-${copilotOpen ? 'open' : 'closed'}-${location.pathname}`}
          resetKey={`${copilotOpen}-${location.pathname}`}
          fallbackText="CopilotPanel encountered an error. Refresh to reload."
        >
          <Suspense fallback={<CopilotPanelLoader />}>
            <CopilotPanel />
          </Suspense>
        </ErrorBoundary>
      ) : null}
      <ErrorBoundary fallbackText="Critical broadcast overlay encountered an error.">
        <Suspense fallback={null}>

        </Suspense>
      </ErrorBoundary>
      {showReassessmentDrawer &&
      screenCapabilities.showReassessAction &&
      emergencyRole.canAccessRoute(CANONICAL_ROUTES.emergencyReassessment) &&
      !useKioskShell ? (
        <ErrorBoundary fallbackText="Reassessment drawer encountered an error.">
          <Suspense fallback={null}>
            <ReassessmentDrawer
              open={showReassessmentDrawer}
              count={reassessmentCount}
              onClose={() => setShowReassessmentDrawer(false)}
            />
          </Suspense>
        </ErrorBoundary>
      ) : null}
      {showPalette && !useKioskShell ? (
        <ErrorBoundary fallbackText="Command palette encountered an error.">
          <Suspense fallback={null}>
            <CommandPalette
              open={showPalette}
              onClose={() => setShowPalette(false)}
              onExecute={handleCommandExecute}
            />
          </Suspense>
        </ErrorBoundary>
      ) : null}
      {!useKioskShell ? (
        <ErrorBoundary fallbackText="Guide panel encountered an error.">
          <Suspense fallback={null}>
            <HelpHub />
          </Suspense>
        </ErrorBoundary>
      ) : null}
      <CareDroidToastHost />
    </div>
  );
}
