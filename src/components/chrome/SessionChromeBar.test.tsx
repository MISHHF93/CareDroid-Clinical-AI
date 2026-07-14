import { describe, expect, it, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import SessionChromeBar from './SessionChromeBar';

const systemConfigState = {
  configDegraded: false,
  loading: false,
  refresh: vi.fn(),
};

vi.mock('../../contexts/SystemConfigContext', () => ({
  useSystemConfig: () => systemConfigState,
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
    systemConfigState.configDegraded = false;
    systemConfigState.loading = false;
  });

  it('renders nothing when system config is healthy', () => {
    const { container } = render(<SessionChromeBar />);
    expect(container).toBeEmptyDOMElement();
  });

  it('renders nothing while config is still loading, even if degraded', () => {
    systemConfigState.configDegraded = true;
    systemConfigState.loading = true;
    const { container } = render(<SessionChromeBar />);
    expect(container).toBeEmptyDOMElement();
  });

  it('shows an actionable connection warning when config is degraded', () => {
    systemConfigState.configDegraded = true;
    render(<SessionChromeBar />);
    expect(screen.getByText('Connection')).toBeInTheDocument();
    expect(screen.getByText('Settings unavailable')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Retry' })).toBeInTheDocument();
  });

  it('retries the config fetch when the retry button is clicked', async () => {
    systemConfigState.configDegraded = true;
    render(<SessionChromeBar />);
    screen.getByRole('button', { name: 'Retry' }).click();
    expect(systemConfigState.refresh).toHaveBeenCalledTimes(1);
  });
});
