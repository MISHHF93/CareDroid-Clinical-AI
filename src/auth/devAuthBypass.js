import appConfig from '../config/appConfig';
import { AUTH_CONFIG } from '../config/auth.config';
import { apiFetchJson } from '../services/apiClient';
import logger from '../utils/logger';

export const DEV_AUTH_LABEL = 'Platform Access';
export const AUTH_TOKEN_KEY = AUTH_CONFIG.tokenStorageKey;
export const USER_PROFILE_KEY = AUTH_CONFIG.userProfileStorageKey;

export const isDevAuthBypassEnabled = () =>
  Boolean(import.meta.env.DEV || AUTH_CONFIG.demo.exposed);

export const withDevSessionMarker = (user) => ({
  ...user,
  authMode: 'platform-access',
  isDevAuthBypass: true,
  devAuthLabel: DEV_AUTH_LABEL,
});

export const buildDevDemoUser = () =>
  withDevSessionMarker({
    id: 'platform-access-user',
    email: 'access@caredroid.local',
    name: 'CareDroid Clinician',
    role: 'physician',
    fullName: 'CareDroid Clinician',
    isEmailVerified: true,
    twoFactorEnabled: false,
    createdAt: new Date().toISOString(),
  });

export function createLocalPlatformAccessSession() {
  const user = buildDevDemoUser();
  const token = (appConfig.dev.bearerToken || '').trim() || 'platform-access-token';
  localStorage.setItem(USER_PROFILE_KEY, JSON.stringify(user));
  localStorage.setItem(AUTH_TOKEN_KEY, token);
  return {
    token,
    user,
    backendBacked: false,
  };
}

export async function createDevAuthSession() {
  if (!isDevAuthBypassEnabled()) {
    throw new Error('Platform access is disabled.');
  }

  try {
    const { response, data } = await apiFetchJson(AUTH_CONFIG.devSessionEndpoint, { method: 'POST' });
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
    if (!AUTH_CONFIG.demo.allowLocalFallback && !AUTH_CONFIG.demo.exposed) {
      logger.error('Backend platform access session unavailable and local fallback is disabled', { err });
      throw err;
    }
    logger.warn('Platform access API unavailable, using local clinician session only', { err });
  }

  const session = createLocalPlatformAccessSession();
  logger.info('Platform access: stored token and local clinician profile (no API)', {
    label: DEV_AUTH_LABEL,
  });

  return {
    token: session.token,
    user: session.user,
    backendBacked: false,
  };
}
