import { describe, it, expect, vi, beforeEach } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, useLocation } from 'react-router-dom';
import { UserProvider, useUser } from './contexts/UserContext';
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

function AuthStateProbe() {
  const { isAuthenticated, isDevAuthBypass, user } = useUser();
  return (
    <output data-testid="auth-state">
      {isAuthenticated ? 'authenticated' : 'anonymous'}:{isDevAuthBypass ? 'demo' : 'standard'}:
      {user?.role || 'none'}
    </output>
  );
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

describe('Welcome page demo mode access', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
    mocks.appConfig.features.enableDevAuthBypass = false;
    mocks.appConfig.features.enableDemoMode = false;
    mocks.apiFetchJson.mockRejectedValue(new Error('backend unavailable'));
  });

  it('shows one demo mode action in development even with flags disabled', () => {
    renderWelcome();

    expect(
      screen.queryByRole('button', { name: /continue in demo mode/i })
    ).toBeInTheDocument();

    expect(
      screen.queryByRole('button', { name: /direct sign in/i })
    ).not.toBeInTheDocument();
  });

  it('allows demo mode when flags are disabled in local dev and routes to dashboard', async () => {
    renderWelcome();

    fireEvent.click(screen.getByRole('button', { name: /continue in demo mode/i }));

    await waitFor(() => {
      expect(screen.getByTestId('location')).toHaveTextContent('/dashboard');
    });
  });

  it('uses the demo mode action when explicitly enabled and routes to dashboard', async () => {
    mocks.appConfig.features.enableDevAuthBypass = true;
    renderWelcome();

    fireEvent.click(screen.getByRole('button', { name: /continue in demo mode/i }));

    await waitFor(() => {
      expect(screen.getByTestId('location')).toHaveTextContent('/dashboard');
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


it('shows demo mode when VITE_DEMO_MODE=true and still routes to dashboard', async () => {
  mocks.appConfig.features.enableDevAuthBypass = false;
  mocks.appConfig.features.enableDemoMode = true;
  renderWelcome();

  fireEvent.click(screen.getByRole('button', { name: /continue in demo mode/i }));

  await waitFor(() => {
    expect(screen.getByTestId('location')).toHaveTextContent('/dashboard');
  });
});

it('restores persisted demo auth after refresh-compatible remounts', async () => {
  localStorage.setItem('caredroid_access_token', 'persisted-demo-token');
  localStorage.setItem(
    'caredroid_user_profile',
    JSON.stringify({
      id: 'dev-demo-user',
      role: 'physician',
      authMode: 'local-dev-demo',
      isDevAuthBypass: true,
      devAuthLabel: 'Demo Mode',
    })
  );

  render(
    <UserProvider>
      <AuthStateProbe />
    </UserProvider>
  );

  await waitFor(() => {
    expect(screen.getByTestId('auth-state')).toHaveTextContent('authenticated:demo:physician');
  });
});
