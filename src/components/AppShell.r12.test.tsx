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
  startSimulation: vi.fn(() => [333]),
  stopSimulation: vi.fn(),
}));

vi.mock('../engine/capacityEngine', () => ({
  startCapacityEngine: mocks.startCapacityEngine,
}));

vi.mock('../engine/reassessmentEngine', () => ({
  startReassessmentEngine: mocks.startReassessmentEngine,
}));

vi.mock('../engine/simulation', () => ({
  startSimulation: mocks.startSimulation,
  stopSimulation: mocks.stopSimulation,
}));

vi.mock('../hooks/useEmergencyRolePermissions', () => ({
  useEmergencyRolePermissions: () => ({
    role: 'charge-nurse',
    roleLabel: 'Charge Nurse',
    can: () => true,
    canAccessRoute: () => true,
    nearestRoute: (path: string) => path,
  }),
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

    expect(initializeFromBackend).toHaveBeenCalledTimes(1);
    expect(startReassessmentEngine).toHaveBeenCalledTimes(1);
    expect(startCapacityEngine).toHaveBeenCalledTimes(1);

    await waitFor(() => expect(startSimulation).toHaveBeenCalledTimes(1));

    unmount();

    expect(clearIntervalSpy).toHaveBeenCalledWith(111);
    expect(clearIntervalSpy).toHaveBeenCalledWith(222);
    expect(stopSimulation).toHaveBeenCalledTimes(1);
  });
});
