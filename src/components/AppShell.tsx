import { useEffect, useMemo, useState, type ReactNode } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Sidebar } from './Sidebar';
import { Header } from './Header';
import { CopilotPanel } from './CopilotPanel';
import PatientDetailPanel from './PatientDetailPanel';
import CommandPalette from './CommandPalette';
import EMSCriticalBroadcast from './EMSCriticalBroadcast';
import ReassessmentDrawer from './ReassessmentDrawer';
import { useEmergencyStore } from '../store/emergencyStore';
import { startReassessmentEngine } from '../engine/reassessmentEngine';
import { startCapacityEngine } from '../engine/capacityEngine';
import { CANONICAL_ROUTES } from '../config/routes.config';
import { EMERGENCY_ACTIONS } from '../config/emergencyRolePermissions';
import { getVisibleNavigation } from '../config/unified-navigation.config';
import { useEmergencyRolePermissions } from '../hooks/useEmergencyRolePermissions';
import { PatientFlag } from '../types/emergency';

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

export function AppShell({ children }: AppShellProps) {
  const navigate = useNavigate();
  const location = useLocation();
  const emergencyRole = useEmergencyRolePermissions();
  const [showPalette, setShowPalette] = useState(false);
  const [showReassessmentDrawer, setShowReassessmentDrawer] = useState(false);
  const selectPatient = useEmergencyStore((state) => state.selectPatient);
  const patients = useEmergencyStore((state) => state.patients);
  const reassessmentCount = patients.filter((patient) => patient.flags.includes(PatientFlag.ReassessmentDue)).length;
  const visibleNavigationItems = useMemo(
    () => getVisibleNavigation(emergencyRole.role),
    [emergencyRole.role],
  );

  useEffect(() => {
    const reassessmentInterval = startReassessmentEngine();
    const capacityInterval = startCapacityEngine();
    return () => {
      window.clearInterval(reassessmentInterval);
      window.clearInterval(capacityInterval);
    };
  }, []);

  useEffect(() => {
    const activeItem = visibleNavigationItems.find((item) =>
      location.pathname === item.path || location.pathname.startsWith(`${item.path}/`),
    );
    document.title = activeItem ? `${activeItem.label} | Emergency OS` : 'Emergency OS';
  }, [location.pathname, visibleNavigationItems]);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      const store = useEmergencyStore.getState();
      const tag = (e.target as HTMLElement).tagName;
      const inInput = ['INPUT', 'TEXTAREA', 'SELECT'].includes(tag);

      if (e.key === 'Escape') {
        store.selectPatient(null);
        document.dispatchEvent(new Event('close-all-panels'));
      }

      if (inInput) return;

      if (e.key === '/') {
        e.preventDefault();
        document.dispatchEvent(new Event('open-command-palette'));
      }
      if (e.key === 'n' && !e.metaKey && !e.ctrlKey && emergencyRole.can(EMERGENCY_ACTIONS.createPatient)) {
        document.dispatchEvent(new Event('open-intake'));
      }
    };

    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [emergencyRole]);

  useEffect(() => {
    const openPalette = () => setShowPalette(true);
    const closePanels = () => setShowPalette(false);
    const openReassessmentDrawer = () => setShowReassessmentDrawer(true);
    document.addEventListener('open-command-palette', openPalette);
    document.addEventListener('open-reassessment-drawer', openReassessmentDrawer);
    document.addEventListener('close-all-panels', closePanels);
    return () => {
      document.removeEventListener('open-command-palette', openPalette);
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
        if (action.path) navigate(emergencyRole.canAccessRoute(action.path) ? action.path : emergencyRole.nearestRoute(action.path));
        break;
      case 'VIEW_PATIENT':
      case 'FIND_PATIENT':
        if (action.patientId) selectPatient(action.patientId);
        else if (action.value) navigate(`${CANONICAL_ROUTES.emergencyPatients}?q=${encodeURIComponent(action.value)}`);
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
        navigate(`${CANONICAL_ROUTES.emergencyTools}${action.calculatorId ? `?tool=${action.calculatorId}` : ''}`);
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
        <main style={{ flex: 1, overflow: 'auto' }}>{children}</main>
      </div>
      <PatientDetailPanel />
      {emergencyRole.can(EMERGENCY_ACTIONS.useCopilot) ? <CopilotPanel /> : null}
      <EMSCriticalBroadcast />
      {emergencyRole.canAccessRoute(CANONICAL_ROUTES.emergencyReassessment) ? (
        <ReassessmentDrawer
          open={showReassessmentDrawer}
          count={reassessmentCount}
          onClose={() => setShowReassessmentDrawer(false)}
        />
      ) : null}
      <CommandPalette
        open={showPalette}
        onClose={() => setShowPalette(false)}
        onExecute={handleCommandExecute}
      />
    </div>
  );
}
