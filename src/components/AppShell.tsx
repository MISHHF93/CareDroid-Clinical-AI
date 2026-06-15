import { lazy, Suspense, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Toaster } from 'sonner';
import { Sidebar } from './Sidebar';
import { Header } from './Header';
import ErrorBoundary from './ErrorBoundary';
import { useEmergencyStore } from '../store/emergencyStore';
import { startReassessmentEngine } from '../engine/reassessmentEngine';
import { startCapacityEngine } from '../engine/capacityEngine';
import { CANONICAL_ROUTES } from '../config/routes.config';
import { EMERGENCY_OS_BRANDING } from '../config/emergencyOsBranding.config';
import { EMERGENCY_ACTIONS } from '../config/emergencyRolePermissions';
import { getVisibleNavigation } from '../config/unified-navigation.config';
import { useEmergencyRolePermissions } from '../hooks/useEmergencyRolePermissions';
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
  [CANONICAL_ROUTES.emergencyQueues]: `${EMERGENCY_OS_BRANDING.productName} - Queues`,
  [CANONICAL_ROUTES.emergencyReassessment]: `${EMERGENCY_OS_BRANDING.productName} - Reassessment`,
  [CANONICAL_ROUTES.emergencyReferrals]: `${EMERGENCY_OS_BRANDING.productName} - Referrals`,
  [CANONICAL_ROUTES.emergencyCapacity]: `${EMERGENCY_OS_BRANDING.productName} - Capacity`,
  [CANONICAL_ROUTES.emergencyBoarding]: `${EMERGENCY_OS_BRANDING.productName} - Boarding`,
  [CANONICAL_ROUTES.emergencyCopilot]: `${EMERGENCY_OS_BRANDING.productName} - Copilot`,
  [CANONICAL_ROUTES.emergencyTools]: `${EMERGENCY_OS_BRANDING.productName} - Medical Tools`,
  [CANONICAL_ROUTES.emergencyAnalytics]: `${EMERGENCY_OS_BRANDING.productName} - Analytics`,
  '/settings': `${EMERGENCY_OS_BRANDING.productName} - Settings`,
  [CANONICAL_ROUTES.emergencySettings]: `${EMERGENCY_OS_BRANDING.productName} - Settings`,
};

const EMERGENCY_OS_PAGE_SUBTITLES: Record<string, string> = {
  '/emergency': 'Patient flow, capacity, EMS, and reassessment status.',
  [CANONICAL_ROUTES.emergencyWhiteboard]: 'Patient flow, capacity, EMS, and reassessment status.',
  [CANONICAL_ROUTES.emergencyPatients]: 'Active patient census and patient detail timeline.',
  [CANONICAL_ROUTES.emergencyEms]: 'Inbound EMS, offload pressure, and handoff actions.',
  [CANONICAL_ROUTES.emergencyIntake]: 'Identity verification and patient creation workflow.',
  [CANONICAL_ROUTES.emergencyQueues]: 'Queue bottlenecks and queue-level operating metrics.',
  [CANONICAL_ROUTES.emergencyReassessment]: 'Due and overdue reassessment tasks.',
  [CANONICAL_ROUTES.emergencyCapacity]: 'Capacity score, rooms, boarders, and pressure inputs.',
  [CANONICAL_ROUTES.emergencyBoarding]: 'Admission boarders and boarding escalation status.',
  [CANONICAL_ROUTES.emergencyReferrals]: 'Referral and transfer queue status.',
  [CANONICAL_ROUTES.emergencyCopilot]: 'Safe Emergency OS Copilot context and actions.',
  [CANONICAL_ROUTES.emergencyTools]:
    'Clinical calculators, tool launchers, and role-aware medical utilities.',
  [CANONICAL_ROUTES.emergencyAnalytics]: 'Operational KPIs and local analytics fallback.',
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
  const startupStartedRef = useRef(false);
  const [showPalette, setShowPalette] = useState(false);
  const [showReassessmentDrawer, setShowReassessmentDrawer] = useState(false);
  const [isTabletViewport, setIsTabletViewport] = useState(() =>
    typeof window === 'undefined' || typeof window.matchMedia !== 'function'
      ? false
      : window.matchMedia('(max-width: 1024px)').matches,
  );
  const [isMobileViewport, setIsMobileViewport] = useState(() =>
    typeof window === 'undefined' || typeof window.matchMedia !== 'function'
      ? false
      : window.matchMedia('(max-width: 768px)').matches,
  );
  const selectPatient = useEmergencyStore((state) => state.selectPatient);
  const copilotOpen = useEmergencyStore((state) => state.copilotOpen);
  const patients = useEmergencyStore((state) => state.patients);
  const reassessmentCount = useMemo(
    () => patients.filter(isPatientFlaggedForReassessment).length,
    [patients],
  );
  const canUseCopilot = emergencyRole.can(EMERGENCY_ACTIONS.useCopilot);
  const visibleNavigationItems = useMemo(
    () => getVisibleNavigation(emergencyRole.role),
    [emergencyRole.role],
  );
  const currentPage = useMemo(() => {
    const activeItem = visibleNavigationItems.find(
      (item) =>
        item.activePaths?.some((path) => matchesNavigationPath(location.pathname, path)) ||
        matchesNavigationPath(location.pathname, item.path),
    );
    const title = EMERGENCY_OS_PAGE_TITLES[location.pathname];
    const labelFromTitle = title?.replace(`${EMERGENCY_OS_BRANDING.productName} - `, '');

    return {
      label: labelFromTitle || activeItem?.label || EMERGENCY_OS_BRANDING.productName,
      subtitle:
        EMERGENCY_OS_PAGE_SUBTITLES[location.pathname] ||
        (activeItem
          ? `Open ${activeItem.label} in Emergency OS.`
          : EMERGENCY_OS_BRANDING.safetyLine),
    };
  }, [location.pathname, visibleNavigationItems]);

  useEffect(() => {
    if (startupStartedRef.current) return undefined;
    startupStartedRef.current = true;

    let cancelled = false;
    let stopSimulation: (() => void) | undefined;

    void useEmergencyStore.getState().initializeFromBackend();

    const reassessmentInterval = startReassessmentEngine();
    const capacityInterval = startCapacityEngine();

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
      window.clearInterval(reassessmentInterval);
      window.clearInterval(capacityInterval);
      stopSimulation?.();
      startupStartedRef.current = false;
    };
  }, []);

  useEffect(() => {
    if (typeof window.matchMedia !== 'function') return undefined;

    const tabletQuery = window.matchMedia('(max-width: 1024px)');
    const mobileQuery = window.matchMedia('(max-width: 768px)');
    const syncViewportState = () => {
      setIsTabletViewport(tabletQuery.matches);
      setIsMobileViewport(mobileQuery.matches);
    };

    syncViewportState();
    tabletQuery.addEventListener('change', syncViewportState);
    mobileQuery.addEventListener('change', syncViewportState);
    return () => {
      tabletQuery.removeEventListener('change', syncViewportState);
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
        store.selectPatient(null);
        setShowReassessmentDrawer(false);
        document.dispatchEvent(new Event('close-all-panels'));
        return;
      }

      if (e.shiftKey && e.key.toLowerCase() === 'h') {
        e.preventDefault();
        navigate(
          emergencyRole.canAccessRoute(CANONICAL_ROUTES.emergencyWhiteboard)
            ? CANONICAL_ROUTES.emergencyWhiteboard
            : emergencyRole.nearestRoute(CANONICAL_ROUTES.emergencyWhiteboard),
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
        e.preventDefault();
        setShowReassessmentDrawer((open) => !open);
        return;
      }

      if (e.key === '/' && !e.metaKey && !e.ctrlKey && !e.altKey) {
        e.preventDefault();
        document.dispatchEvent(new Event('open-command-palette'));
      }
      if (
        e.key === 'n' &&
        !e.metaKey &&
        !e.ctrlKey &&
        emergencyRole.can(EMERGENCY_ACTIONS.createPatient)
      ) {
        document.dispatchEvent(new Event('open-intake'));
      }
    };

    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [canUseCopilot, emergencyRole, navigate]);

  useEffect(() => {
    const openPalette = () => setShowPalette(true);
    const closePanels = () => {
      setShowPalette(false);
      setShowReassessmentDrawer(false);
    };
    const openReassessmentDrawer = () => setShowReassessmentDrawer(true);
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
  }, []);

  useEffect(() => {
    const openTools = (event: Event) => {
      const detail =
        (event as CustomEvent<{ filter?: string; query?: string; source?: string }>).detail || {};
      const targetPath = buildEmergencyToolsPath({
        source: detail.source || 'chat',
        filter: detail.filter || 'all',
        q: detail.query,
      });
      navigate(
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
      navigate(
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
  }, [emergencyRole, navigate]);

  const handleCommandExecute = (action: CommandAction) => {
    switch (action.type) {
      case 'OPEN_INTAKE':
        if (!emergencyRole.can(EMERGENCY_ACTIONS.createPatient)) break;
        navigate(CANONICAL_ROUTES.emergencyWhiteboard);
        document.dispatchEvent(new Event('open-intake'));
        break;
      case 'OPEN_ROUTE':
        if (action.path) {
          const permissionPath = routePermissionPath(action.path);
          navigate(
            emergencyRole.canAccessRoute(permissionPath)
              ? action.path
              : emergencyRole.nearestRoute(permissionPath),
          );
        }
        break;
      case 'VIEW_PATIENT':
      case 'FIND_PATIENT':
        if (action.patientId) selectPatient(action.patientId);
        else if (action.value)
          navigate(`${CANONICAL_ROUTES.emergencyPatients}?q=${encodeURIComponent(action.value)}`);
        else navigate(CANONICAL_ROUTES.emergencyPatients);
        break;
      case 'OPEN_REFERRAL': {
        if (!emergencyRole.can(EMERGENCY_ACTIONS.manageReferral)) break;
        const params = new URLSearchParams();
        if (action.patientId) params.set('patientId', action.patientId);
        if (action.value) params.set('patientSearch', action.value);
        params.set('new', '1');
        navigate(`${CANONICAL_ROUTES.emergencyReferrals}?${params.toString()}`);
        break;
      }
      case 'OPEN_PEDIATRIC_DRUGS':
        navigate(
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
        navigate(`${CANONICAL_ROUTES.emergencyTools}?${params.toString()}`);
        break;
      }
      case 'OPEN_CAPACITY':
        if (!emergencyRole.canAccessRoute(CANONICAL_ROUTES.emergencyCapacity)) break;
        navigate(CANONICAL_ROUTES.emergencyCapacity);
        break;
      case 'OPEN_REASSESSMENT_QUEUE':
        if (!emergencyRole.canAccessRoute(CANONICAL_ROUTES.emergencyReassessment)) break;
        setShowReassessmentDrawer(true);
        break;
      case 'CLEAR_FILTERS':
        document.dispatchEvent(new Event('clear-whiteboard-filters'));
        navigate(CANONICAL_ROUTES.emergencyWhiteboard);
        break;
      default:
        break;
    }
    setShowPalette(false);
  };

  return (
    <div
      className="emergency-app-shell"
      style={{
        display: 'flex',
        height: 'var(--app-viewport-height, 100dvh)',
        background: '#0A0E1A',
        color: '#F9FAFB',
        fontFamily: 'Inter, system-ui, sans-serif',
        overflow: 'hidden',
      }}
    >
      <a className="ed-skip-link" href="#main-content">
        Skip to main content
      </a>
      <Sidebar navigationItems={visibleNavigationItems} />
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        <Header pageTitle={currentPage.label} pageSubtitle={currentPage.subtitle} />
        <main
          id="main-content"
          className="app-shell-main-content"
          role="main"
          tabIndex={-1}
          style={{
            flex: 1,
            overflow: 'auto',
            paddingBottom: isMobileViewport ? 'calc(60px + env(safe-area-inset-bottom, 0px))' : 0,
          }}
        >
          <ErrorBoundary fallbackText="Emergency OS page encountered an error. Refresh to reload.">
            <Suspense
              fallback={
                <div role="status" style={{ padding: 24, color: '#9CA3AF' }}>
                  Loading Emergency OS page...
                </div>
              }
            >
              {children}
            </Suspense>
          </ErrorBoundary>
        </main>
      </div>
      <ErrorBoundary fallbackText="PatientDetailPanel encountered an error. Refresh to reload.">
        <Suspense fallback={null}>
          <PatientDetailPanel />
        </Suspense>
      </ErrorBoundary>
      {canUseCopilot && (!isTabletViewport || copilotOpen) ? (
        <ErrorBoundary fallbackText="CopilotPanel encountered an error. Refresh to reload.">
          <Suspense fallback={null}>
            <CopilotPanel />
          </Suspense>
        </ErrorBoundary>
      ) : null}
      <Suspense fallback={null}>
        <EMSCriticalBroadcast />
      </Suspense>
      {showReassessmentDrawer ? (
        <Suspense fallback={null}>
          <ReassessmentDrawer
            open={showReassessmentDrawer}
            count={reassessmentCount}
            onClose={() => setShowReassessmentDrawer(false)}
          />
        </Suspense>
      ) : null}
      {showPalette ? (
        <Suspense fallback={null}>
          <CommandPalette
            open={showPalette}
            onClose={() => setShowPalette(false)}
            onExecute={handleCommandExecute}
          />
        </Suspense>
      ) : null}
      <Toaster richColors closeButton position="top-right" />
    </div>
  );
}
