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
  '/emergency': 'Emergency OS - Board',
  [CANONICAL_ROUTES.emergencyWhiteboard]: 'Emergency OS - Board',
  [CANONICAL_ROUTES.emergencyPulse]: 'Emergency OS - Pulse',
  [CANONICAL_ROUTES.emergencyEms]: 'Emergency OS - EMS',
  [CANONICAL_ROUTES.emergencyReferrals]: 'Emergency OS - Referrals',
  [CANONICAL_ROUTES.emergencyCapacity]: 'Emergency OS - Capacity',
  [CANONICAL_ROUTES.emergencyTools]: 'Emergency OS - Tools',
  [CANONICAL_ROUTES.emergencyShift]: 'Emergency OS - Shift',
  '/settings': 'Emergency OS - Settings',
  [CANONICAL_ROUTES.emergencySettings]: 'Emergency OS - Settings',
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

    const activeItem = visibleNavigationItems.find(
      (item) => location.pathname === item.path || location.pathname.startsWith(`${item.path}/`),
    );
    document.title = activeItem ? `Emergency OS — ${activeItem.label}` : 'Emergency OS';
  }, [location.pathname, visibleNavigationItems]);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      const store = useEmergencyStore.getState();
      const inInput = isEditableShortcutTarget(e.target);

      if (e.key === 'Escape') {
        store.selectPatient(null);
        setShowReassessmentDrawer(false);
        document.dispatchEvent(new Event('close-all-panels'));
      }

      if (e.shiftKey && e.key.toLowerCase() === 'h') {
        e.preventDefault();
        navigate(
          emergencyRole.canAccessRoute(CANONICAL_ROUTES.emergencyPulse)
            ? CANONICAL_ROUTES.emergencyPulse
            : emergencyRole.nearestRoute(CANONICAL_ROUTES.emergencyPulse),
        );
        return;
      }

      if (inInput) return;

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

  const handleCommandExecute = (action: CommandAction) => {
    switch (action.type) {
      case 'OPEN_INTAKE':
        if (!emergencyRole.can(EMERGENCY_ACTIONS.createPatient)) break;
        navigate(CANONICAL_ROUTES.emergencyWhiteboard);
        document.dispatchEvent(new Event('open-intake'));
        break;
      case 'OPEN_ROUTE':
        if (action.path)
          navigate(
            emergencyRole.canAccessRoute(action.path)
              ? action.path
              : emergencyRole.nearestRoute(action.path),
          );
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
        if (!emergencyRole.canAccessRoute(CANONICAL_ROUTES.emergencyTools)) break;
        navigate(`${CANONICAL_ROUTES.emergencyTools}?tool=pediatric-dose-safety-checker`);
        break;
      case 'OPEN_CALCULATOR':
        if (!emergencyRole.canAccessRoute(CANONICAL_ROUTES.emergencyTools)) break;
        navigate(
          `${CANONICAL_ROUTES.emergencyTools}${action.calculatorId ? `?tool=${action.calculatorId}` : ''}`,
        );
        break;
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
        height: '100vh',
        background: '#0A0E1A',
        color: '#F9FAFB',
        fontFamily: 'Inter, system-ui, sans-serif',
        overflow: 'hidden',
      }}
    >
      <Sidebar navigationItems={visibleNavigationItems} />
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        <Header />
        <main
          role="main"
          style={{ flex: 1, overflow: 'auto', paddingBottom: isMobileViewport ? 60 : 0 }}
        >
          {children}
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
