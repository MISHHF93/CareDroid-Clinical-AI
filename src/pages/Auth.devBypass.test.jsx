import { describe, it, expect, vi, beforeEach } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import Auth from './Auth';

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
      hideDivisionMode: true,
      showDemoAuth: false,
      enableDemoMode: false,
      allowLocalDemoAuth: true,
      enablePushNotifications: false,
      enableOfflineMode: false,
      enableBiometricAuth: false,
    },
    dev: {
      bearerToken: 'test-dev-token',
    },
  },
  apiFetch: vi.fn(),
  apiFetchJson: vi.fn(),
  buildApiUrl: vi.fn((path) => path),
  notifications: {
    success: vi.fn(),
    error: vi.fn(),
    info: vi.fn(),
  },
}));

vi.mock('../config/appConfig', () => ({
  default: mocks.appConfig,
}));

vi.mock('../services/apiClient', () => ({
  apiFetch: (...args) => mocks.apiFetch(...args),
  apiFetchJson: (...args) => mocks.apiFetchJson(...args),
  buildApiUrl: (...args) => mocks.buildApiUrl(...args),
}));

vi.mock('../hooks/useNotificationActions', () => ({
  useNotificationActions: () => mocks.notifications,
}));

function renderAuth(onAuthSuccess = vi.fn()) {
  render(
    <MemoryRouter initialEntries={['/auth']}>
      <Auth onAuthSuccess={onAuthSuccess} />
    </MemoryRouter>
  );
  return onAuthSuccess;
}

describe('Auth platform access', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
    mocks.appConfig.features.enableDevAuthBypass = false;
    mocks.appConfig.features.enableDemoMode = false;
    mocks.appConfig.features.showDemoAuth = false;
    mocks.appConfig.features.allowLocalDemoAuth = true;
    mocks.apiFetchJson.mockRejectedValue(new Error('backend unavailable'));
  });

  it('shows one platform entry in development even when explicit flags are false', () => {
    renderAuth();

    expect(
      screen.getByRole('button', { name: /enter platform/i })
    ).toBeInTheDocument();

    expect(
      screen.queryByRole('button', { name: /direct sign in/i })
    ).not.toBeInTheDocument();
  });

  it('allows platform access even when bypass flags are disabled in local dev', async () => {
    const onAuthSuccess = renderAuth();

    fireEvent.click(screen.getByRole('button', { name: /enter platform/i }));

    await waitFor(() => {
      expect(onAuthSuccess).toHaveBeenCalledWith(
        'test-dev-token',
        expect.objectContaining({
          authMode: 'platform-access',
          isDevAuthBypass: true,
        })
      );
    });
  });

  it('uses platform access when the local dev flag is enabled and creates a marked mock session', async () => {
    mocks.appConfig.features.enableDevAuthBypass = true;
    const onAuthSuccess = renderAuth();

    fireEvent.click(screen.getByRole('button', { name: /enter platform/i }));

    await waitFor(() => {
      expect(onAuthSuccess).toHaveBeenCalledWith(
        'test-dev-token',
        expect.objectContaining({
          authMode: 'platform-access',
          devAuthLabel: 'Platform Access',
          isDevAuthBypass: true,
          role: 'physician',
        })
      );
    });

    expect(JSON.parse(localStorage.getItem('caredroid_user_profile'))).toEqual(
      expect.objectContaining({
        authMode: 'platform-access',
        isDevAuthBypass: true,
      })
    );
    expect(localStorage.getItem('caredroid_access_token')).toBe('test-dev-token');
  });

  it('appears when the deployed demo auth flag is enabled', () => {
    mocks.appConfig.features.showDemoAuth = true;

    renderAuth();

    expect(
      screen.getByRole('button', { name: /enter platform/i })
    ).toBeInTheDocument();
  });

  it('marks backend dev-session users before routing into the app', async () => {
    mocks.appConfig.features.enableDevAuthBypass = true;
    mocks.apiFetchJson.mockResolvedValueOnce({
      response: { ok: true },
      data: {
        accessToken: 'real-dev-jwt',
        user: {
          id: 'api-dev-user',
          email: 'dev@caredroid.local',
          role: 'physician',
          fullName: 'Dev Clinician',
        },
      },
    });
    const onAuthSuccess = renderAuth();

    fireEvent.click(screen.getByRole('button', { name: /enter platform/i }));

    await waitFor(() => {
      expect(onAuthSuccess).toHaveBeenCalledWith(
        'real-dev-jwt',
        expect.objectContaining({
          id: 'api-dev-user',
          authMode: 'platform-access',
          isDevAuthBypass: true,
        })
      );
    });
  });
});


it('renders and allows platform access when VITE_DEMO_MODE=true even if dev bypass is false', async () => {
  vi.clearAllMocks();
  localStorage.clear();
  mocks.apiFetchJson.mockRejectedValue(new Error('backend unavailable'));
  mocks.appConfig.features.allowLocalDemoAuth = true;
  mocks.appConfig.features.enableDevAuthBypass = false;
  mocks.appConfig.features.enableDemoMode = true;
  const onAuthSuccess = renderAuth();

  fireEvent.click(screen.getByRole('button', { name: /enter platform/i }));

  await waitFor(() => {
    expect(onAuthSuccess).toHaveBeenCalledWith(
      'test-dev-token',
      expect.objectContaining({
        authMode: 'platform-access',
        isDevAuthBypass: true,
      })
    );
  });
});

it('falls back to local platform access when hosted demo backend auth is unavailable', async () => {
  vi.clearAllMocks();
  localStorage.clear();
  mocks.appConfig.features.enableDevAuthBypass = false;
  mocks.appConfig.features.enableDemoMode = true;
  mocks.appConfig.features.allowLocalDemoAuth = false;
  mocks.apiFetchJson.mockRejectedValue(new Error('backend unavailable'));
  const onAuthSuccess = renderAuth();

  fireEvent.click(screen.getByRole('button', { name: /enter platform/i }));

  await waitFor(() => {
    expect(onAuthSuccess).toHaveBeenCalledWith(
      'test-dev-token',
      expect.objectContaining({
        authMode: 'platform-access',
        devAuthLabel: 'Platform Access',
        isDevAuthBypass: true,
      })
    );
  });
});
