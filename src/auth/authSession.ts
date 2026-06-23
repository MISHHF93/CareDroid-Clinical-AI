import { CANONICAL_ROUTES } from '../config/routes.config';
import {
  resolvePlatformLanding,
} from '../config/platformEntryModel';
import { apiFetchJson } from '../services/apiClient';
import appConfig from '../config/appConfig';

const OPEN_ACCESS_USER_ID = 'open-access-user';
const DEV_BYPASS_TOKEN = appConfig.dev?.bearerToken || 'dev-bypass-token';

export type HydratedSession = {
  user: Record<string, unknown> | null;
  profile: Record<string, unknown> | null;
};

export function sanitizeReturnUrl(returnUrl?: string | null): string {
  const raw = String(returnUrl || '').trim();
  if (!raw || !raw.startsWith('/') || raw.startsWith('//') || raw.startsWith('/auth')) {
    return '/';
  }
  return raw;
}

export function buildAuthUrl({
  mode = 'login',
  returnUrl,
  inviteToken,
}: {
  mode?: 'login' | 'signup';
  returnUrl?: string;
  inviteToken?: string;
} = {}): string {
  const params = new URLSearchParams();
  if (mode === 'signup') params.set('mode', 'signup');
  const safe = sanitizeReturnUrl(returnUrl);
  if (safe !== '/') params.set('returnUrl', safe);
  if (inviteToken) params.set('invite', inviteToken);
  const qs = params.toString();
  return qs ? `${CANONICAL_ROUTES.auth}?${qs}` : CANONICAL_ROUTES.auth;
}

export async function fetchAuthenticatedUser(token: string) {
  const { response, data } = await apiFetchJson('/api/auth/me', {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!response.ok) return null;
  return data as Record<string, unknown>;
}

export async function fetchOperationalProfile(token: string) {
  const { response, data } = await apiFetchJson('/api/profile/me', {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!response.ok) return null;
  return data as Record<string, unknown>;
}

export async function hydrateAuthenticatedSession(token: string): Promise<HydratedSession> {
  const [user, profile] = await Promise.all([
    fetchAuthenticatedUser(token),
    fetchOperationalProfile(token),
  ]);
  return { user, profile };
}

export function resolvePostAuthDestination({
  user,
  profile,
  returnUrl,
}: {
  user?: Record<string, unknown> | null;
  profile?: Record<string, unknown> | null;
  returnUrl?: string | null;
}): string {
  const saasProfile =
    (profile?.saasProfile as Record<string, unknown> | undefined) ||
    (profile?.effectiveProfile as Record<string, unknown> | undefined);
  const onboardingStatus = saasProfile?.onboardingStatus ?? profile?.onboardingStatus ?? 'complete';
  if (onboardingStatus !== 'complete') {
    return CANONICAL_ROUTES.welcome;
  }

  const safeReturn = sanitizeReturnUrl(returnUrl);
  if (safeReturn !== '/') return safeReturn;

  const role =
    (user?.role as string | undefined) ||
    ((user?.profile as Record<string, unknown> | undefined)?.roleProfileId as string | undefined) ||
    (saasProfile?.saasRole as string | undefined);

  return resolvePlatformLanding({
    authMode: 'authenticated',
    saasRole: role,
    onboardingStatus: String(onboardingStatus),
    returnUrl: safeReturn !== '/' ? safeReturn : null,
  });
}

export function isRealAuthToken(token: string | null | undefined): boolean {
  if (!token) return false;
  return token !== DEV_BYPASS_TOKEN;
}

export function isOpenAccessUser(user: Record<string, unknown> | null | undefined): boolean {
  if (!user) return true;
  return (
    user.id === OPEN_ACCESS_USER_ID ||
    user.authMode === 'open-access' ||
    user.authMode === 'platform-access'
  );
}

export function deriveAuthMode(
  user: Record<string, unknown> | null | undefined,
  token: string | null | undefined,
): 'open-access' | 'authenticated' {
  if (isOpenAccessUser(user) || !isRealAuthToken(token)) {
    return 'open-access';
  }
  return 'authenticated';
}
