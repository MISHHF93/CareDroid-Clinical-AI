import { afterEach, describe, expect, it, vi } from 'vitest';
import { render, waitFor, fireEvent, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { AppShell } from './AppShell';
import { useEmergencyStore } from '../store/emergencyStore';
import { withEmergencyRoleMock } from '../test/permissiveEmergencyRoleMock';
import { CANONICAL_ROUTES } from '../config/routes.config';

/**
 * HEAL-347.84: the global 'r' keyboard shortcut (and the
 * open-reassessment/open-reassessment-drawer DOM events, and the drawer's
 * own render condition) previously gated only on
 * screenCapabilities.showReassessAction -- a pure screen-mode/device flag
 * with zero awareness of the current role. ReassessmentDrawer itself also
 * has no permission check of its own. A role without
 * /emergency/reassessment access could still open it purely because the
 * device happened to be in a clinical screen mode -- fixed by also
 * requiring emergencyRole.canAccessRoute(CANONICAL_ROUTES.emergencyReassessment)
 * at all three gates (shortcut, DOM-event listener, render condition).
 */

vi.mock('../services/emergencyRealtimeService', () => ({
  default: vi.fn(() => vi.fn()),
  startEmergencyRealtime: vi.fn(() => vi.fn()),
}));
vi.mock('../engine/capacityEngine', () => ({
  startCapacityEngine: vi.fn(() => 1),
  calculateCapacity: vi.fn(() => ({
    score: 42,
    band: 'Green',
    label: 'Green capacity',
    riskLevel: 'Green',
    totalPatients: 0,
    occupiedRooms: 0,
    boardingCount: 0,
    reassessmentDue: 0,
    currentOccupancy: 0,
    maxCapacity: 15,
    occupancyPercent: 0,
  })),
}));
vi.mock('../engine/reassessmentEngine', () => ({ startReassessmentEngine: vi.fn(() => 2) }));
vi.mock('../engine/continuousPatientFlowEngine', () => ({
  startContinuousPatientFlowEngine: vi.fn(() => 3),
}));
vi.mock('../engine/administrativeAutomationEngine', () => ({
  startAdministrativeAutomationEngine: vi.fn(() => 4),
}));
vi.mock('../engine/unifiedWorkflowAutomationEngine', () => ({
  startUnifiedWorkflowAutomationEngine: vi.fn(() => vi.fn()),
  getLastWorkflowAutomationBackendEvent: vi.fn(() => undefined),
  scheduleWorkflowAutomationRefresh: vi.fn(),
}));
vi.mock('../engine/unifiedOperationalIntelligenceEngine', () => ({
  startUnifiedOperationalIntelligenceEngine: vi.fn(() => vi.fn()),
  getLastUnifiedOperationalIntelligenceBackendEvent: vi.fn(() => undefined),
  scheduleUnifiedOperationalIntelligenceRefresh: vi.fn(),
}));
vi.mock('../engine/unifiedApplicationKnowledgeGraphEngine', () => ({
  startUnifiedApplicationKnowledgeGraphEngine: vi.fn(() => vi.fn()),
  handleUnifiedApplicationKnowledgeGraphBackendEvent: vi.fn(),
}));
vi.mock('../engine/simulation', () => ({
  startSimulation: vi.fn(() => [9]),
  stopSimulation: vi.fn(),
}));
vi.mock('../services/backendReachability', () => ({
  probeBackendReachability: vi.fn().mockResolvedValue(true),
  isBackendKnownOffline: vi.fn().mockReturnValue(false),
}));
vi.mock('../services/devBackendSession', () => ({
  ensureDevBackendSession: vi.fn().mockResolvedValue(undefined),
}));

vi.mock('./ReassessmentDrawer', () => ({
  default: ({ open }: { open: boolean }) =>
    open ? <div data-testid="reassessment-drawer-open" /> : null,
  isPatientFlaggedForReassessment: () => false,
}));
vi.mock('./PatientDetailPanel', () => ({ default: () => null }));
vi.mock('./CommandPalette', () => ({ default: () => null }));
vi.mock('./help/HelpHub', () => ({ default: () => null }));
vi.mock('./CopilotPanel', () => ({ CopilotPanel: () => null }));
vi.mock('./account/DemoPersonaPanel', () => ({ default: () => null }));
vi.mock('./chrome/SessionChromeBar', () => ({ default: () => null }));
vi.mock('./Sidebar', () => ({ Sidebar: () => <nav aria-label="Sidebar" /> }));
vi.mock('./Header', () => ({ Header: () => <header>Header</header> }));
vi.mock('./EMSCriticalBroadcast', () => ({ default: () => null }));
vi.mock('./emergency/HospitalJourneyCommandBar', () => ({ default: () => null }));
vi.mock('sonner', () => ({ Toaster: () => null }));
vi.mock('../contexts/SimulationModeContext', () => ({
  useSimulationMode: () => ({ enabled: true, active: true, setActive: vi.fn(), toggle: vi.fn() }),
}));

const screenCapabilitiesMock = {
  screenMode: 'CHARGE_NURSE_SCREEN',
  label: 'Charge Nurse',
  productLabel: 'CareDroid',
  isPublicDisplay: false,
  isWallKiosk: false,
  useMinimalAppChrome: false,
  isRegistrationScreen: false,
  isReceptionScreen: false,
  isTriageScreen: false,
  showReassessmentEngine: true,
  showCapacityEngine: true,
  showPatientFlowEngine: true,
  showAdministrativeAutomationEngine: true,
  showOperationalIntelligenceEngine: true,
  // Device/screen-mode says yes -- this is the flag that alone used to be
  // sufficient to open the drawer, regardless of role.
  showReassessAction: true,
  showEmsCriticalOverlay: true,
  showCentralNodeBadge: true,
  showOperationalStrip: true,
};
vi.mock('../hooks/useScreenModeCapabilities', () => ({
  useScreenModeCapabilities: () => screenCapabilitiesMock,
  default: () => screenCapabilitiesMock,
}));

let currentRoleMock: any;
vi.mock('../hooks/useEmergencyRolePermissions', () => ({
  useEmergencyRolePermissions: () => currentRoleMock,
  default: () => currentRoleMock,
}));

const originalState = useEmergencyStore.getState();

afterEach(() => {
  useEmergencyStore.setState(originalState, true);
  vi.restoreAllMocks();
});

async function renderShellAndPressR() {
  vi.spyOn(useEmergencyStore.getState(), 'initializeFromBackend').mockResolvedValue({ errors: {} });
  render(
    <MemoryRouter>
      <AppShell>
        <div>Emergency route</div>
      </AppShell>
    </MemoryRouter>,
  );
  await waitFor(() =>
    expect(useEmergencyStore.getState().initializeFromBackend).toHaveBeenCalled(),
  );
  fireEvent.keyDown(document, { key: 'r' });
}

describe('HEAL-347.84: ReassessmentDrawer keyboard shortcut respects route-level clinical authorization', () => {
  it('does NOT open for a role with no /emergency/reassessment access, even though the device screen mode allows it', async () => {
    currentRoleMock = withEmergencyRoleMock({
      canAccessRoute: (path: string) => path !== CANONICAL_ROUTES.emergencyReassessment,
    });
    await renderShellAndPressR();
    expect(screen.queryByTestId('reassessment-drawer-open')).not.toBeInTheDocument();
  });

  it('DOES open for a role with /emergency/reassessment access (regression guard -- the fix must not over-block)', async () => {
    currentRoleMock = withEmergencyRoleMock({ canAccessRoute: () => true });
    await renderShellAndPressR();
    await waitFor(() => expect(screen.getByTestId('reassessment-drawer-open')).toBeInTheDocument());
  });
});
