import { describe, expect, it, vi, beforeEach } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import SessionChromeBar from './SessionChromeBar';

const mockToggleCopilot = vi.fn();
const mockSetCopilotOpen = vi.fn();

vi.mock('../../store/emergencyStore', () => ({
  useEmergencyStore: (selector: (state: Record<string, unknown>) => unknown) =>
    selector({
      activeScenarioId: null,
      copilotOpen: false,
      toggleCopilot: mockToggleCopilot,
      setCopilotOpen: mockSetCopilotOpen,
    }),
}));

vi.mock('../../contexts/SimulationModeContext', () => ({
  useSimulationMode: () => ({ enabled: false, active: false }),
}));

vi.mock('../../contexts/SystemConfigContext', () => ({
  useSystemConfig: () => ({ configDegraded: false, loading: false, refresh: vi.fn() }),
}));

vi.mock('../../hooks/useProfileSwitcherVisibility', () => ({
  default: () => false,
}));

vi.mock('../../hooks/useEmergencyRolePermissions', () => ({
  default: () => ({ roleLabel: 'Physician' }),
}));

vi.mock('../../contexts/PractitionerVisibilityContext', () => ({
  usePractitionerSurfaceVisibility: () => ({
    chrome: {
      showSessionDevSegments: false,
      showSessionSimulation: false,
    },
    copilot: {
      showContextTab: true,
      showSafetyTab: true,
    },
  }),
}));

vi.mock('../../hooks/useCopilotChromeAccess', () => ({
  useCopilotChromeAccess: () => ({
    showSessionCopilot: true,
    copilotSurfaces: {
      showContextTab: true,
      showSafetyTab: true,
    },
  }),
}));

describe('SessionChromeBar', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders copilot controls in the session chrome bar', () => {
    render(<SessionChromeBar />);

    expect(screen.getByRole('group', { name: /controls/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /chat/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /context/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /safety/i })).toBeInTheDocument();
  });

  it('toggles copilot from the primary chrome control', () => {
    render(<SessionChromeBar />);

    fireEvent.click(screen.getByTitle(/open caredroid copilot/i));
    expect(mockToggleCopilot).toHaveBeenCalledTimes(1);
  });

  it('opens copilot and dispatches tab selection from chrome tabs', () => {
    render(<SessionChromeBar />);
    const dispatchSpy = vi.spyOn(window, 'dispatchEvent');

    fireEvent.click(screen.getByRole('button', { name: /context/i }));

    expect(mockSetCopilotOpen).toHaveBeenCalledWith(true);
    expect(dispatchSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        type: 'ed:copilot-set-tab',
      }),
    );
  });
});