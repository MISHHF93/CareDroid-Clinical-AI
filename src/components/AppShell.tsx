import { lazy, Suspense, useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { useLocation, useNavigate, type To } from 'react-router-dom';
import { Toaster } from 'sonner';
import { Sidebar } from './Sidebar';
import { Header } from './Header';
import ErrorBoundary from './ErrorBoundary';
import { useEmergencyStore, type EmergencyWebSocketStatus } from '../store/emergencyStore';
import { startReassessmentEngine } from '../engine/reassessmentEngine';
import { startCapacityEngine } from '../engine/capacityEngine';
import { fetchCareDroidCentralNodeSnapshot } from '../services/emergencyOsApi';
import { probeBackendReachability, isBackendKnownOffline } from '../services/backendReachability';
import { ensureDevBackendSession } from '../services/devBackendAuth';
import startEmergencyRealtime from '../services/emergencyRealtimeService';
import { bootstrapAiPlatformIntegrations } from '../services/aiPlatformBootstrap';
import { resolveClinicalToolLaunchTarget } from '../services/unifiedClinicalToolsBridge';
import { CANONICAL_ROUTES } from '../config/routes.config';
import { EMERGENCY_OS_BRANDING } from '../config/emergencyOsBranding.config';
import { RECEPTION_FIRST_UX } from '../config/receptionFirstUx.config';
import {
  PractitionerVisibilityProvider,
  usePractitionerSurfaceVisibility,
} from '../contexts/PractitionerVisibilityContext';
import {
  EMERGENCY_ACTIONS,
  EMERGENCY_ROLE_IDS,
  getReceptionPrimaryCreatePath,
  getReceptionQuickCreatePath,
  prefersReceptionForPatientCreate,
} from '../config/emergencyRolePermissions';
import { getVisibleNavigation } from '../config/unified-navigation.config';
import useEffectiveUserProfile from '../hooks/useEffectiveUserProfile';
import { getEmergencySurface } from '../config/emergencyPipelineModel';
import { useEmergencyRolePermissions } from '../hooks/useEmergencyRolePermissions';
import useScreenModeCapabilities from '../hooks/useScreenModeCapabilities';
import { navigateProfileAware } from '../navigation/profileRouteLaunch';
import { useSimulationMode } from '../contexts/SimulationModeContext';
import { useUserIdentity } from '../contexts/UserIdentityContext';
import { isSimulationModeActive } from '../services/simulationModeService';
import SessionChromeBar from './chrome/SessionChromeBar';
import { useCopilotChromeAccess } from '../hooks/useCopilotChromeAccess';
import { HelpHubProvider, dispatchOpenHelpHub } from '../contexts/HelpHubContext';
import './app-shell.css';
import './CopilotPanel.css';
import { CopilotPanel } from './CopilotPanel';
import {
  resolveScreenDensityProfile,
  screenDensityShellClassName,
} from '../config/screenDensityModeModel';
import { PatientFlag, type Patient } from '../types/emergency';
import { patientFlags } from '../utils/patientVitals';

const PatientDetailPanel = lazy(() => import('./PatientDetailPanel'));
const CommandPalette = lazy(() => import('./CommandPalette'));
const EMSCriticalBroadcast = lazy(() => import('./EMSCriticalBroadcast'));
const ReassessmentDrawer = lazy(() => import('./ReassessmentDrawer'));
const HelpHub = lazy(() => import('./help/HelpHub'));

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

const EMERGENCY_OS_PAGE_TITLES: Record<string, string> = {
  '/emergency': `${EMERGENCY_OS_BRANDING.productName} - Board`,
  [CANONICAL_ROUTES.emergencyWhiteboard]: `${EMERGENCY_OS_BRANDING.productName} - Board`,
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
  [CANONICAL_ROUTES.emergencyHelp]: `${EMERGENCY_OS_BRANDING.productName} - Guide`,
  [CANONICAL_ROUTES.emergencyAnalytics]: `${EMERGENCY_OS_BRANDING.productName} - Analytics`,
  [CANONICAL_ROUTES.workspace]: `${EMERGENCY_OS_BRANDING.productName} - Platform`,
  [CANONICAL_ROUTES.workspaces]: `${EMERGENCY_OS_BRANDING.productName} - Workspaces`,
  '/settings': `${EMERGENCY_OS_BRANDING.productName} - Settings`,
  [CANONICAL_ROUTES.emergencySettings]: `${EMERGENCY_OS_BRANDING.productName} - Settings`,
  [CANONICAL_ROUTES.emergencyPulse]: `${EMERGENCY_OS_BRANDING.productName} - Pulse`,
  [CANONICAL_ROUTES.emergencyShift]: `${EMERGENCY_OS_BRANDING.productName} - Shift`,
};

const EMERGENCY_OS_PAGE_SUBTITLES: Record<string, string> = {
  '/emergency': 'Patient flow, capacity, EMS, and reassessment status.',
  [CANONICAL_ROUTES.emergencyWhiteboard]: 'Operational awareness after reception prepares each patient card.',
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
  '/settings': 'Tenant, module, AI, integration, and threshold controls.',
  [CANONICAL_ROUTES.emergencySettings]: 'Tenant, module, AI, integration, and threshold controls.',
};

type AppShellProps = {
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

function routePermissionPath(path: string): string {
  return path.split(/[?#]/)[0] || path;
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
    <PractitionerVisibilityProvider>
      <HelpHubProvider>
        <AppShellFrame>{children}</AppShellFrame>
      </HelpHubProvider>
    </PractitionerVisibilityProvider>
  );
}

function AppShellFrame({ children }: AppShellProps) {
  const navigate = useNavigate();
  const location = useLocation();
  const { effectiveProfile: backendEffectiveProfile } = useUserIdentity();
  const emergencyRole = useEmergencyRolePermissions();
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
  const useWallKioskChrome =
    screenCapabilities.useMinimalAppChrome &&
    isEmergencyBoardRoute &&
    !isPublicWaitingKiosk &&
    !isReadOnlyWhiteboardKiosk;
  const useKioskShell = useWallKioskChrome || isPublicWaitingKiosk || isReadOnlyWhiteboardKiosk;
  const startupStartedRef = useRef(false);
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
  const toggleCopilot = useEmergencyStore((state) => state.toggleCopilot);
  const setCopilotOpen = useEmergencyStore((state) => state.setCopilotOpen);
  const patients = useEmergencyStore((state) => state.patients);
  const { active: simulationModeActive } = useSimulationMode();


  const reassessmentCount = useMemo(
    () => patients.filter(isPatientFlaggedForReassessment).length,
    [patients],
  );
  const { canUseCopilot, showSessionCopilot, hiddenOnReception } = useCopilotChromeAccess();
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

    return {
      label: labelFromTitle || activeItem?.label || EMERGENCY_OS_BRANDING.productName,
      subtitle:
        EMERGENCY_OS_PAGE_SUBTITLES[location.pathname] ||
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
    void (async () => {
      await ensureDevBackendSession();
      const backendReachable = await probeBackendReachability();
      if (backendReachable) {
        await useEmergencyStore.getState().initializeFromBackend();
      } else {
        // No backend � stay on local/simulation data; no network calls needed
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
        await store.refreshAllData();
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

    const reassessmentInterval = screenCapabilities.showReassessmentEngine
      ? startReassessmentEngine()
      : undefined;
    const capacityInterval = screenCapabilities.showCapacityEngine
      ? startCapacityEngine()
      : undefined;
    const alertsInterval = window.setInterval(() => {
      useEmergencyStore.getState().updateAlerts();
      void import('../services/alertLifecycleOrchestrator').then(({ checkUnacknowledgedAlertEscalations }) =>
        checkUnacknowledgedAlertEscalations(),
      );
    }, 30_000);

    if (simulationModeActive) {
      void import('../engine/simulation').then((simulation) => {
        if (cancelled) return;
        simulation.startSimulation();
        stopSimulation = simulation.stopSimulation;
      });
    }

    return () => {
      cancelled = true;
      stopRealtime?.();
      if (reassessmentInterval !== undefined) window.clearInterval(reassessmentInterval);
      if (capacityInterval !== undefined) window.clearInterval(capacityInterval);
      window.clearInterval(alertsInterval);
      stopSimulation?.();
      startupStartedRef.current = false;
    };
  }, [
    screenCapabilities.showCapacityEngine,
    screenCapabilities.showReassessmentEngine,
    simulationModeActive,
  ]);

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
        if (emergencyRole.canAccessRoute(CANONICAL_ROUTES.emergencyAlerts)) {
          e.preventDefault();
          profileNavigate(CANONICAL_ROUTES.emergencyAlerts);
        }
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
        if (screenCapabilities.showReassessAction) {
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
      if (screenCapabilities.showReassessAction) setShowReassessmentDrawer(true);
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
  }, [screenCapabilities.showReassessAction]);

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

  return (
    <div
      className={[
        'emergency-app-shell',
        screenDensityShellClassName(screenCapabilities.screenMode),
        isPublicWaitingKiosk ? 'emergency-app-shell--public-waiting-kiosk' : '',
        isReadOnlyWhiteboardKiosk ? 'emergency-app-shell--read-only-whiteboard-kiosk' : '',
        copilotOpen && canUseCopilot && !useKioskShell ? 'emergency-app-shell--copilot-open' : '',
      ]
        .filter(Boolean)
        .join(' ')}
    >
      <a className="ed-skip-link" href="#main-content">
        Skip to main content
      </a>
      {useKioskShell ? null : <Sidebar navigationItems={visibleNavigationItems} />}
      <div className="emergency-app-shell__main-column">
        {useWallKioskChrome ? (
          <header className="emergency-wall-kiosk-header">
            <strong>{screenCapabilities.label}</strong>
            <span className="emergency-wall-kiosk-header__safety">{EMERGENCY_OS_BRANDING.safetyLine}</span>
          </header>
        ) : isPublicWaitingKiosk || isReadOnlyWhiteboardKiosk ? null : (
          <Header
            pageTitle={currentPage.label}
            pageSubtitle={surfaces.chrome.showHeaderSubtitle ? currentPage.subtitle : undefined}
          />
        )}
        {!useKioskShell ? <SessionChromeBar /> : null}
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
          <CopilotPanel />
        </ErrorBoundary>
      ) : null}
      {canUseCopilot && !useKioskShell && !hiddenOnReception && !copilotOpen && !showSessionCopilot ? (
        <button
          type="button"
          className="ed-copilot-launch"
          onClick={toggleCopilot}
          aria-label={`Open ${EMERGENCY_OS_BRANDING.copilotName}`}
          title={`Open ${EMERGENCY_OS_BRANDING.copilotName} (C)`}
        >
          {EMERGENCY_OS_BRANDING.copilotName}
        </button>
      ) : null}
      <ErrorBoundary fallbackText="Critical broadcast overlay encountered an error.">
        <Suspense fallback={null}>
          {screenCapabilities.showEmsCriticalOverlay ? <EMSCriticalBroadcast /> : null}
        </Suspense>
      </ErrorBoundary>
      {showReassessmentDrawer && screenCapabilities.showReassessAction && !useKioskShell ? (
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
      <Toaster
        richColors
        closeButton
        position="bottom-right"
        visibleToasts={2}
        duration={4000}
        gap={8}
      />
    </div>
  );
}
