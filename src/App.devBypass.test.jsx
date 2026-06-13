import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { UserProvider, useUser } from './contexts/UserContext';

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

function AuthStateProbe() {
  const { isAuthenticated, isDevAuthBypass, user } = useUser();
  return (
    <output data-testid="auth-state">
      {isAuthenticated ? 'authenticated' : 'anonymous'}:{isDevAuthBypass ? 'platform' : 'open'}:
      {user?.role || 'none'}
    </output>
  );
}

describe('Emergency OS open access state', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
    mocks.appConfig.features.enableDevAuthBypass = false;
    mocks.appConfig.features.enableDemoMode = false;
    mocks.apiFetchJson.mockRejectedValue(new Error('backend unavailable'));
  });

  it('starts open access automatically when no stored auth exists', async () => {
    render(
      <UserProvider>
        <AuthStateProbe />
      </UserProvider>
    );

    await waitFor(() => {
      expect(screen.getByTestId('auth-state')).toHaveTextContent('anonymous:open:physician');
    });
    expect(localStorage.getItem('caredroid_access_token')).toBeNull();
    expect(localStorage.getItem('caredroid_user_profile')).toBeNull();
  });

  it('clears persisted auth and keeps open access after refresh-compatible remounts', async () => {
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
      expect(screen.getByTestId('auth-state')).toHaveTextContent('anonymous:open:physician');
    });
    expect(localStorage.getItem('caredroid_access_token')).toBeNull();
    expect(localStorage.getItem('caredroid_user_profile')).toBeNull();
  });
});
