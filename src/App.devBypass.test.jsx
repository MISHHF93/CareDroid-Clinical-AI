import { describe, it, expect, vi, beforeEach } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, useLocation } from 'react-router-dom';
import { UserProvider, useUser } from './contexts/UserContext';
import { WelcomePage } from './App';

const mocks = vi.hoisted(() => ({
  appConfig: {
    app: {
      name: 'CareDroid-Clinical-AI',
      version: 'test',
      environment: 'test',
    },
    api: {
      baseUrl: '',
      wsUrl: '',
    },
    features: {
      enableDevAuthBypass: false,
      enableDemoMode: false,
      allowLocalDemoAuth: true,
      showDemoAuth: false,
      hideDivisionMode: true,
      enablePushNotifications: false,
      enableOfflineMode: false,
      enableBiometricAuth: false,
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
      {isAuthenticated ? 'authenticated' : 'anonymous'}:{isDevAuthBypass ? 'platform' : 'standard'}:
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

describe('Welcome page platform access', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
    mocks.appConfig.features.enableDevAuthBypass = false;
    mocks.appConfig.features.enableDemoMode = false;
    mocks.apiFetchJson.mockRejectedValue(new Error('backend unavailable'));
  });

  it('shows one platform access action in development even with flags disabled', () => {
    renderWelcome();

    expect(
      screen.queryByRole('button', { name: /enter platform/i })
    ).toBeInTheDocument();

    expect(
      screen.queryByRole('button', { name: /direct sign in/i })
    ).not.toBeInTheDocument();
  });

  it('allows platform access when flags are disabled in local dev and routes to dashboard', async () => {
    renderWelcome();

    fireEvent.click(screen.getByRole('button', { name: /enter platform/i }));

    await waitFor(() => {
      expect(screen.getByTestId('location')).toHaveTextContent('/dashboard');
    });
  });

  it('uses the platform access action when explicitly enabled and routes to dashboard', async () => {
    mocks.appConfig.features.enableDevAuthBypass = true;
    renderWelcome();

    fireEvent.click(screen.getByRole('button', { name: /enter platform/i }));

    await waitFor(() => {
      expect(screen.getByTestId('location')).toHaveTextContent('/dashboard');
    });
    expect(localStorage.getItem('caredroid_access_token')).toBe('welcome-dev-token');
    expect(JSON.parse(localStorage.getItem('caredroid_user_profile'))).toEqual(
      expect.objectContaining({
        authMode: 'platform-access',
        isDevAuthBypass: true,
        role: 'physician',
      })
    );
  });
});


it('shows platform access when VITE_DEMO_MODE=true and still routes to dashboard', async () => {
  mocks.appConfig.features.enableDevAuthBypass = false;
  mocks.appConfig.features.enableDemoMode = true;
  renderWelcome();

  fireEvent.click(screen.getByRole('button', { name: /enter platform/i }));

  await waitFor(() => {
    expect(screen.getByTestId('location')).toHaveTextContent('/dashboard');
  });
});

it('starts platform access automatically when no stored auth exists', async () => {
  localStorage.clear();

  render(
    <UserProvider>
      <AuthStateProbe />
    </UserProvider>
  );

  await waitFor(() => {
    expect(screen.getByTestId('auth-state')).toHaveTextContent('authenticated:platform:physician');
  });
  expect(localStorage.getItem('caredroid_access_token')).toBe('welcome-dev-token');
  expect(JSON.parse(localStorage.getItem('caredroid_user_profile'))).toEqual(
    expect.objectContaining({
      authMode: 'platform-access',
      devAuthLabel: 'Platform Access',
      isDevAuthBypass: true,
    })
  );
});

it('restores persisted platform access after refresh-compatible remounts', async () => {
  localStorage.setItem('caredroid_access_token', 'persisted-demo-token');
  localStorage.setItem(
    'caredroid_user_profile',
    JSON.stringify({
      id: 'platform-access-user',
      role: 'physician',
      authMode: 'platform-access',
      isDevAuthBypass: true,
      devAuthLabel: 'Platform Access',
    })
  );

  render(
    <UserProvider>
      <AuthStateProbe />
    </UserProvider>
  );

  await waitFor(() => {
    expect(screen.getByTestId('auth-state')).toHaveTextContent('authenticated:platform:physician');
  });
});
