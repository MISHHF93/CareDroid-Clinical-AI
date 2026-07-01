import { describe, expect, it, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import SessionChromeBar from './SessionChromeBar';

vi.mock('../../store/emergencyStore', () => ({
  useEmergencyStore: (selector: (state: Record<string, unknown>) => unknown) =>
    selector({
      activeScenarioId: null,
    }),
}));

vi.mock('../../contexts/SimulationModeContext', () => ({
  useSimulationMode: () => ({ enabled: false, active: false }),
}));

vi.mock('../../contexts/SystemConfigContext', () => ({
  useSystemConfig: () => ({ configDegraded: false, loading: false, refresh: vi.fn() }),
}));

vi.mock('../../contexts/PractitionerVisibilityContext', () => ({
  usePractitionerSurfaceVisibility: () => ({
    chrome: {
      showSessionDevSegments: true,
      showSessionSimulation: false,
    },
  }),
}));

describe('SessionChromeBar', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders dev status segment on local dev hosts', () => {
    render(<SessionChromeBar />);
    expect(screen.getByText('Dev')).toBeInTheDocument();
    expect(screen.getByText('Local session')).toBeInTheDocument();
  });
});