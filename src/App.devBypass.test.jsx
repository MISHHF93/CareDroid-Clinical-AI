import { describe, it, expect, vi, beforeEach } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, useLocation } from 'react-router-dom';
import { UserProvider } from './contexts/UserContext';
import { WelcomePage } from './App';

const mocks = vi.hoisted(() => ({
  appConfig: {
    features: {
      enableDevAuthBypass: false,
      enableDemoMode: false,
    },
    dev: {
      bearerToken: 'welcome-dev-token',
    },
  },
  apiFetchJson: vi.fn(),
  notifications: {
    info: vi.fn(),
    error: vi.fn(),
  },
}));

vi.mock('./config/appConfig', () => ({
  default: mocks.appConfig,
}));

vi.mock('./services/apiClient', () => ({
  apiFetchJson: (...args) => mocks.apiFetchJson(...args),
  apiFetch: vi.fn(),
  buildApiUrl: (path) => path,
}));

vi.mock('./hooks/useNotificationActions', () => ({
  useNotificationActions: () => mocks.notifications,
}));

function LocationProbe() {
  const location = useLocation();
  return <div data-testid="location">{location.pathname}</div>;
}

function renderWelcome() {
  render(
    <MemoryRouter initialEntries={['/']}>
      <UserProvider>
        <WelcomePage />
        <LocationProbe />
      </UserProvider>
    </MemoryRouter>
  );
}

describe('Welcome page local/demo dev bypass', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
    mocks.appConfig.features.enableDevAuthBypass = false;
    mocks.appConfig.features.enableDemoMode = false;
    mocks.apiFetchJson.mockRejectedValue(new Error('backend unavailable'));
  });

  it('hides the direct dev login action by default on the first unauthenticated screen', () => {
    renderWelcome();

    expect(
      screen.queryByRole('button', { name: /continue in demo \/ local dev mode/i })
    ).not.toBeInTheDocument();
  });

  it('shows the direct dev login action when explicitly enabled and routes to tools', async () => {
    mocks.appConfig.features.enableDevAuthBypass = true;
    renderWelcome();

    fireEvent.click(screen.getByRole('button', { name: /continue in demo \/ local dev mode/i }));

    await waitFor(() => {
      expect(screen.getByTestId('location')).toHaveTextContent('/tools');
    });
    expect(localStorage.getItem('caredroid_access_token')).toBe('welcome-dev-token');
    expect(JSON.parse(localStorage.getItem('caredroid_user_profile'))).toEqual(
      expect.objectContaining({
        authMode: 'local-dev-demo',
        isDevAuthBypass: true,
        role: 'physician',
      })
    );
  });
});


it('shows direct demo login when VITE_DEMO_MODE=true and still routes to tools', async () => {
  mocks.appConfig.features.enableDevAuthBypass = false;
  mocks.appConfig.features.enableDemoMode = true;
  renderWelcome();

  fireEvent.click(screen.getByRole('button', { name: /continue in demo \/ local dev mode/i }));

  await waitFor(() => {
    expect(screen.getByTestId('location')).toHaveTextContent('/tools');
  });
});
