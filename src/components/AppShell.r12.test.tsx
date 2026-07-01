import { afterEach, describe, expect, it, vi } from 'vitest';
import { render, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { AppShell } from './AppShell';
import { useEmergencyStore } from '../store/emergencyStore';
import { startCapacityEngine } from '../engine/capacityEngine';
import { startReassessmentEngine } from '../engine/reassessmentEngine';
import { startSimulation, stopSimulation } from '../engine/simulation';

const mocks = vi.hoisted(() => ({
  startCapacityEngine: vi.fn(() => 222),
  startReassessmentEngine: vi.fn(() => 111),
  startContinuousPatientFlowEngine: vi.fn(() => 333),
  startAdministrativeAutomationEngine: vi.fn(() => 444),
  startSimulation: vi.fn(() => [333]),
  stopSimulation: vi.fn(),
  startEmergencyRealtime: vi.fn(() => vi.fn()),
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

vi.mock('../services/emergencyRealtimeService', () => ({
  default: mocks.startEmergencyRealtime,
}));

vi.mock('../engine/capacityEngine', () => ({
  startCapacityEngine: mocks.startCapacityEngine,
  calculateCapacity: mocks.calculateCapacity,
}));

vi.mock('../engine/reassessmentEngine', () => ({
  startReassessmentEngine: mocks.startReassessmentEngine,
}));

vi.mock('../engine/continuousPatientFlowEngine', () => ({
  startContinuousPatientFlowEngine: mocks.startContinuousPatientFlowEngine,
}));

vi.mock('../engine/administrativeAutomationEngine', () => ({
  startAdministrativeAutomationEngine: mocks.startAdministrativeAutomationEngine,
}));

vi.mock('../engine/simulation', () => ({
  startSimulation: mocks.startSimulation,
  stopSimulation: mocks.stopSimulation,
}));

vi.mock('../services/backendReachability', () => ({
  probeBackendReachability: vi.fn().mockResolvedValue(true),
  isBackendKnownOffline: vi.fn().mockReturnValue(false),
}));

vi.mock('../services/devBackendSession', () => ({
  ensureDevBackendSession: vi.fn().mockResolvedValue(undefined),
}));

const emergencyRoleMock = vi.hoisted(() => {
  const { PERMISSIVE_EMERGENCY_ROLE_MOCK } = require('../test/permissiveEmergencyRoleMock.ts');
  return PERMISSIVE_EMERGENCY_ROLE_MOCK;
});

vi.mock('../hooks/useEmergencyRolePermissions', () => ({
  useEmergencyRolePermissions: () => emergencyRoleMock,
  default: () => emergencyRoleMock,
}));

vi.mock('../contexts/SimulationModeContext', () => ({
  useSimulationMode: () => ({
    enabled: true,
    active: true,
    setActive: vi.fn(),
    toggle: vi.fn(),
  }),
}));

vi.mock('./account/DemoPersonaPanel', () => ({
  default: () => null,
}));

vi.mock('./chrome/SessionChromeBar', () => ({
  default: () => null,
}));

vi.mock('./Sidebar', () => ({
  Sidebar: () => <nav aria-label="Sidebar" />,
}));

vi.mock('./Header', () => ({
  Header: () => <header>Header</header>,
}));

vi.mock('./CopilotPanel', () => ({
  CopilotPanel: () => <aside>Copilot</aside>,
}));

vi.mock('./PatientDetailPanel', () => ({
  default: () => null,
}));

vi.mock('./CommandPalette', () => ({
  default: () => null,
}));

vi.mock('./EMSCriticalBroadcast', () => ({
  default: () => null,
}));

vi.mock('./ReassessmentDrawer', () => ({
  default: () => null,
  isPatientFlaggedForReassessment: () => false,
}));

vi.mock('sonner', () => ({
  Toaster: () => null,
}));

const originalState = useEmergencyStore.getState();

afterEach(() => {
  useEmergencyStore.setState(originalState, true);
  vi.restoreAllMocks();
});

describe('AppShell R12 startup wiring', () => {
  it('initializes backend state and starts engines with cleanup from AppShell', async () => {
    const initializeFromBackend = vi
      .spyOn(useEmergencyStore.getState(), 'initializeFromBackend')
      .mockResolvedValue({ errors: {} });
    const clearIntervalSpy = vi.spyOn(window, 'clearInterval');

    const { rerender, unmount } = render(
      <MemoryRouter>
        <AppShell>
          <div>Emergency route</div>
        </AppShell>
      </MemoryRouter>,
    );

    rerender(
      <MemoryRouter>
        <AppShell>
          <div>Emergency route updated</div>
        </AppShell>
      </MemoryRouter>,
    );

    await waitFor(() => expect(initializeFromBackend).toHaveBeenCalledTimes(1));
    expect(mocks.startEmergencyRealtime).toHaveBeenCalledTimes(1);
    expect(startReassessmentEngine).toHaveBeenCalledTimes(1);
    expect(startCapacityEngine).toHaveBeenCalledTimes(1);
    expect(mocks.startContinuousPatientFlowEngine).toHaveBeenCalledTimes(1);
    expect(mocks.startAdministrativeAutomationEngine).toHaveBeenCalledTimes(1);

    await waitFor(() => expect(startSimulation).toHaveBeenCalledTimes(1));

    unmount();

    expect(clearIntervalSpy).toHaveBeenCalledWith(111);
    expect(clearIntervalSpy).toHaveBeenCalledWith(222);
    expect(stopSimulation).toHaveBeenCalledTimes(1);
    expect(mocks.startEmergencyRealtime.mock.results[0]?.value).toEqual(expect.any(Function));
  });
});
