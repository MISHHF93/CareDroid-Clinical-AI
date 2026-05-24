import appConfig from '../config/appConfig';
import { apiFetchJson } from '../services/apiClient';
import logger from '../utils/logger';

export const DEV_AUTH_LABEL = 'Demo / Local Dev Mode';
export const AUTH_TOKEN_KEY = 'caredroid_access_token';
export const USER_PROFILE_KEY = 'caredroid_user_profile';

export const isDevAuthBypassEnabled = () => Boolean(appConfig.features.enableDevAuthBypass);

export const withDevSessionMarker = (user) => ({
  ...user,
  authMode: 'local-dev-demo',
  isDevAuthBypass: true,
  devAuthLabel: DEV_AUTH_LABEL,
});

export const buildDevDemoUser = () =>
  withDevSessionMarker({
    id: 'dev-demo-user',
    email: 'demo@caredroid.local',
    name: 'Demo Clinician',
    role: 'physician',
    fullName: 'Demo Clinician',
    isEmailVerified: true,
    twoFactorEnabled: false,
    createdAt: new Date().toISOString(),
  });

export async function createDevAuthSession() {
  if (!isDevAuthBypassEnabled()) {
    throw new Error('Local demo access is disabled.');
  }

  try {
    const { response, data } = await apiFetchJson('/api/auth/dev-session', { method: 'POST' });
    if (response.ok && data?.accessToken && data?.user) {
      const devUser = withDevSessionMarker(data.user);
      localStorage.setItem(USER_PROFILE_KEY, JSON.stringify(devUser));
      localStorage.setItem(AUTH_TOKEN_KEY, data.accessToken);
      return {
        token: data.accessToken,
        user: devUser,
        backendBacked: true,
      };
    }
  } catch (err) {
    logger.warn('Dev session API unavailable, using local demo session only', { err });
  }

  const mockUser = buildDevDemoUser();
  const fallbackToken = (appConfig.dev.bearerToken || '').trim() || 'dev-bypass-token';
  localStorage.setItem(USER_PROFILE_KEY, JSON.stringify(mockUser));
  localStorage.setItem(AUTH_TOKEN_KEY, fallbackToken);
  logger.info('Local demo auth bypass: stored token and mock profile (no API)', { label: DEV_AUTH_LABEL });

  return {
    token: fallbackToken,
    user: mockUser,
    backendBacked: false,
  };
}
