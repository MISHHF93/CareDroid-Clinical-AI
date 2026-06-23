import { lazy, Suspense, useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Toaster } from 'sonner';
import { Sidebar } from './Sidebar';
import { Header } from './Header';
import ErrorBoundary from './ErrorBoundary';
import { useEmergencyStore, type EmergencyWebSocketStatus } from '../store/emergencyStore';
import { startReassessmentEngine } from '../engine/reassessmentEngine';
import { startCapacityEngine } from '../engine/capacityEngine';
import { fetchCareDroidCentralNodeSnapshot } from '../services/emergencyOsApi';
import startEmergencyRealtime from '../services/emergencyRealtimeService';
import { CANONICAL_ROUTES } from '../config/routes.config';
import { EMERGENCY_OS_BRANDING } from '../config/emergencyOsBranding.config';
import { RECEPTION_FIRST_UX } from '../config/receptionFirstUx.config';
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
import DemoPersonaPanel from './account/DemoPersonaPanel';
import './CopilotPanel.css';
import {
  resolveScreenDensityProfile,
  screenDensityShellClassName,
} from '../config/screenDensityModeModel';
import { PatientFlag, type Patient } from '../types/emergency';

const PatientDetailPanel = lazy(() => import('./PatientDetailPanel'));
const CopilotPanel = lazy(() =>
  import('./CopilotPanel').then((module) => ({ default: module.CopilotPanel })),
);
const CommandPalette = lazy(() => import('./CommandPalette'));
const EMSCriticalBroadcast = lazy(() => import('./EMSCriticalBroadcast'));
const ReassessmentDrawer = lazy(() => import('./ReassessmentDrawer'));

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
  return patient.flags.some((flag) => {
    const flagType = getPatientFlagType(flag);
    return flagType ? REASSESSMENT_FLAGS.has(flagType) : false;
  });
}

const EMERGENCY_OS_PAGE_TITLES: Record<string, string> = {
  '/emergency': `${EMERGENCY_OS_BRANDING.productName} - Board`,
  [CANONICAL_ROUTES.emergencyWhiteboard]: `${EMERGENCY_OS_BRANDING.productName} - Board`,
  [CANONICAL_ROUTES.emergencyPatients]: `${EMERGENCY_OS_BRANDING.productName} - Patients`,
  [CANONICAL_ROUTES.emergencyEms]: `${EMERGENCY_OS_BRANDING.productName} - EMS`,
  [CANONICAL_ROUTES.emergencyIntake]: `${EMERGENCY_OS_BRANDING.productName} - Intake`,
  [CANONICAL_ROUTES.emergencyReception]: EMERGENCY_OS_BRANDING.receptionName,
  [CANONICAL_ROUTES.emergencyQueues]: `${EMERGENCY_OS_BRANDING.productName} - Queues`,
  [CANONICAL_ROUTES.emergencyReassessment]: `${EMERGENCY_OS_BRANDING.productName} - Reassessment`,
  [CANONICAL_ROUTES.emergencyReferrals]: `${EMERGENCY_OS_BRANDING.productName} - Referrals`,
  [CANONICAL_ROUTES.emergencyCapacity]: `${EMERGENCY_OS_BRANDING.productName} - Capacity`,
  [CANONICAL_ROUTES.emergencyBoarding]: `${EMERGENCY_OS_BRANDING.productName} - Boarding`,
  [CANONICAL_ROUTES.emergencyCopilot]: `${EMERGENCY_OS_BRANDING.productName} - Copilot`,
  [CANONICAL_ROUTES.emergencyTools]: `${EMERGENCY_OS_BRANDING.productName} - Medical Tools`,
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
  [CANONICAL_ROUTES.emergencyEms]: 'Inbound EMS, offload pressure, and handoff actions.',
  [CANONICAL_ROUTES.emergencyIntake]: 'Identity verification and patient creation workflow.',
  [CANONICAL_ROUTES.emergencyReception]: EMERGENCY_OS_BRANDING.receptionSummary,
  [CANONICAL_ROUTES.emergencyQueues]: 'Queue bottlenecks and queue-level operating metrics.',
  [CANONICAL_ROUTES.emergencyReassessment]: 'Due and overdue reassessment tasks.',
  [CANONICAL_ROUTES.emergencyCapacity]: 'Capacity score, rooms, boarders, and pressure inputs.',
  [CANONICAL_ROUTES.emergencyBoarding]: 'Admission boarders and boarding escalation status.',
  [CANONICAL_ROUTES.emergencyReferrals]: 'Referral and transfer queue status.',
  [CANONICAL_ROUTES.emergencyCopilot]: 'Safe Emergency OS Copilot context and actions.',
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

function buildEmergencyToolsPath(params: Record<string, string | null | undefined>): string {
  const searchParams = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value) searchParams.set(key, value);
  }
  const search = searchParams.toString();
  return `${CANONICAL_ROUTES.emergencyTools}${search ? `?${search}` : ''}`;
}

export function AppShell({ children }: AppShellProps) {
  const navigate = useNavigate();
  const location = useLocation();
  const emergencyRole = useEmergencyRolePermissions();
  const screenCapabilities = useScreenModeCapabilities();
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
  const patients = useEmergencyStore((state) => state.patients);
  const reassessmentCount = useMemo(
    () => patients.filter(isPatientFlaggedForReassessment).length,
    [patients],
  );
  const copilotPresentation = emergencyRole.presentAction(EMERGENCY_ACTIONS.useCopilot);
  const canUseCopilot = copilotPresentation.visible && copilotPresentation.enabled;
  const { saasRole, profileCopy } = useEffectiveUserProfile();
  const profileNavigate = useCallback(
    (to: Parameters<typeof navigate>[0], options?: { replace?: boolean; state?: unknown }) =>
      navigateProfileAware(navigate, to, { saasRole, emergencyRole, ...options }),
    [emergencyRole, navigate, saasRole],
  );
  const visibleNavigationItems = useMemo(
    () => getVisibleNavigation(emergencyRole.role, { saasRole }),
    [emergencyRole.role, saasRole],
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
          ? profileCopy.workspaceDescription || `Open ${activeItem.label} in Emergency OS.`
          : profileCopy.workspaceDescription || EMERGENCY_OS_BRANDING.safetyLine),
    };
  }, [location.pathname, profileCopy.workspaceDescription, visibleNavigationItems]);

  useEffect(() => {
    if (startupStartedRef.current) return undefined;
    startupStartedRef.current = true;

    let cancelled = false;
    let stopSimulation: (() => void) | undefined;
    let stopRealtime: (() => void) | undefined;

    void useEmergencyStore.getState().initializeFromBackend();
    useEmergencyStore.getState().updateAlerts();

    stopRealtime = startEmergencyRealtime({
      onEvent: (event: { type?: string; payload?: unknown }) => {
        useEmergencyStore.getState().dispatchWebSocketEvent(event);
      },
      onStatus: (status: Partial<EmergencyWebSocketStatus>) => {
        useEmergencyStore.getState().setWebSocketStatus(status);
      },
      onPoll: async () => {
        const store = useEmergencyStore.getState();
        await store.refreshAllData();
        try {
          const envelope = await fetchCareDroidCentralNodeSnapshot();
          store.dispatchWebSocketEvent({ type: 'central_node_snapshot', payload: envelope });
          store.setWebSocketStatus({
            status: 'connected',
            mode: 'polling',
            lastEventAt: new Date().toISOString(),
            message: 'Emergency OS snapshot refreshed via polling fallback.',
          });
        } catch (error) {
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
    const alertsInterval = window.setInterval(
      () => useEmergencyStore.getState().updateAlerts(),
      30_000,
    );

    const isDevelopment = Boolean(
      (import.meta as ImportMeta & { env?: { DEV?: boolean } }).env?.DEV,
    );
    if (isDevelopment) {
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
  }, [screenCapabilities.showCapacityEngine, screenCapabilities.showReassessmentEngine]);

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
        if (store.copilotOpen) {
          store.setCopilotOpen(false);
          return;
        }
        store.selectPatient(null);
        setShowReassessmentDrawer(false);
        document.dispatchEvent(new Event('close-all-panels'));
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
        (event as CustomEvent<{ filter?: string; query?: string; source?: string }>).detail || {};
      const targetPath = buildEmergencyToolsPath({
        source: detail.source || 'chat',
        filter: detail.filter || 'all',
        q: detail.query,
      });
      profileNavigate(
        emergencyRole.canAccessRoute(CANONICAL_ROUTES.emergencyTools)
          ? targetPath
          : emergencyRole.nearestRoute(CANONICAL_ROUTES.emergencyTools),
      );
    };

    const openCalculator = (event: Event) => {
      const detail =
        (event as CustomEvent<{ calculatorId?: string; patientId?: string | null }>).detail || {};
      const targetPath = buildEmergencyToolsPath({
        source: 'calculators',
        filter: 'calculator',
        q: detail.calculatorId,
        open: detail.calculatorId,
        patientId: detail.patientId || undefined,
      });
      profileNavigate(
        emergencyRole.canAccessRoute(CANONICAL_ROUTES.emergencyTools)
          ? targetPath
          : emergencyRole.nearestRoute(CANONICAL_ROUTES.emergencyTools),
      );
    };

    window.addEventListener('ed:open-tools', openTools);
    window.addEventListener('ed:open-calculator', openCalculator);
    return () => {
      window.removeEventListener('ed:open-tools', openTools);
      window.removeEventListener('ed:open-calculator', openCalculator);
    };
  }, [emergencyRole, profileNavigate]);

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
      ]
        .filter(Boolean)
        .join(' ')}
      style={{
        display: 'flex',
        height: 'var(--app-viewport-height, 100dvh)',
        background: 'var(--color-background, var(--app-bg, #0A0E1A))',
        color: 'var(--color-text-primary, var(--app-fg, #F9FAFB))',
        fontFamily: 'var(--font-ui, Inter, system-ui, sans-serif)',
        overflow: 'hidden',
      }}
    >
      <a className="ed-skip-link" href="#main-content">
        Skip to main content
      </a>
      {useKioskShell ? null : <Sidebar navigationItems={visibleNavigationItems} />}
      <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        {useWallKioskChrome ? (
          <header
            className="emergency-wall-kiosk-header"
            style={{
              padding: '12px 20px',
              borderBottom: '1px solid rgba(148,163,184,0.2)',
              background: 'var(--color-background, #0B1220)',
            }}
          >
            <strong>{screenCapabilities.label}</strong>
            <span style={{ marginLeft: 12, opacity: 0.72, fontSize: 13 }}>
              {EMERGENCY_OS_BRANDING.safetyLine}
            </span>
          </header>
        ) : isPublicWaitingKiosk || isReadOnlyWhiteboardKiosk ? null : (
          <Header pageTitle={currentPage.label} pageSubtitle={currentPage.subtitle} />
        )}
        <DemoPersonaPanel />
        <main
          id="main-content"
          className="app-shell-main-content"
          role="main"
          tabIndex={-1}
          data-screen-density-mode={screenDensityProfile.id}
          style={{
            flex: 1,
            minWidth: 0,
            minHeight: 0,
            overflow: 'auto',
            overscrollBehavior: 'contain',
            scrollbarGutter: 'stable',
            WebkitOverflowScrolling: 'touch',
            paddingBottom: isMobileViewport ? 'calc(60px + env(safe-area-inset-bottom, 0px))' : 0,
          }}
        >
          <ErrorBoundary fallbackText={`${screenCapabilities.productLabel} page encountered an error. Refresh to reload.`}>
            <Suspense
              fallback={
                <div role="status" style={{ padding: 24, color: '#9CA3AF' }}>
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
      {canUseCopilot &&
      !useKioskShell &&
      !(RECEPTION_FIRST_UX.hideCopilotOnReception && screenCapabilities.isRegistrationScreen) &&
      copilotOpen ? (
        <ErrorBoundary fallbackText="CopilotPanel encountered an error. Refresh to reload.">
          <Suspense fallback={null}>
            <CopilotPanel />
          </Suspense>
        </ErrorBoundary>
      ) : null}
      {canUseCopilot &&
      !useKioskShell &&
      !(RECEPTION_FIRST_UX.hideCopilotOnReception && screenCapabilities.isRegistrationScreen) &&
      !copilotOpen ? (
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
      <Toaster richColors closeButton position="top-right" />
    </div>
  );
}
