import { CANONICAL_ROUTES } from '../config/routes.config';
import { resolveClinicalHomeRoute } from '../config/platformEntryModel';
import { resolveDemoDefaultLandingRoute } from '../config/demoPersonaModel';

export function sanitizeReturnUrl(returnUrl?: string | null): string {
  const raw = String(returnUrl || '').trim();
  if (!raw || !raw.startsWith('/') || raw.startsWith('//') || raw.startsWith('/auth')) {
    return '/';
  }
  return raw;
}

/** Auth UI removed — legacy callers land on the platform entry hub. */
export function buildAuthUrl({
  returnUrl,
}: {
  mode?: 'login' | 'signup';
  returnUrl?: string;
  inviteToken?: string;
} = {}): string {
  const safe = sanitizeReturnUrl(returnUrl);
  return safe !== '/' ? safe : CANONICAL_ROUTES.platformStart;
}

export function resolvePostAuthDestination({
  returnUrl,
  user,
  profile,
}: {
  user?: Record<string, unknown> | null;
  profile?: Record<string, unknown> | null;
  returnUrl?: string | null;
} = {}): string {
  const safeReturn = sanitizeReturnUrl(returnUrl);
  if (safeReturn !== '/') return safeReturn;

  const saasProfile =
    (profile?.saasProfile as Record<string, unknown> | undefined) ||
    (profile?.effectiveProfile as Record<string, unknown> | undefined);
  const role =
    (user?.role as string | undefined) ||
    ((user?.profile as Record<string, unknown> | undefined)?.roleProfileId as string | undefined) ||
    (saasProfile?.saasRole as string | undefined);

  return resolveClinicalHomeRoute(role) || resolveDemoDefaultLandingRoute();
}

export function isRealAuthToken(_token: string | null | undefined): boolean {
  return false;
}

export function isOpenAccessUser(_user: Record<string, unknown> | null | undefined): boolean {
  return true;
}

export function deriveAuthMode(
  _user: Record<string, unknown> | null | undefined,
  _token: string | null | undefined,
): 'open-access' {
  return 'open-access';
}
