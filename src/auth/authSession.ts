import { CANONICAL_ROUTES } from '../config/routes.config';
import { resolveClinicalHomeRoute } from '../config/platformEntryModel';
import { resolveAppStartupRoute } from '../config/appStartupModel';
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
  return safe !== '/' ? safe : resolveAppStartupRoute();
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
  // roleProfileId (e.g. 'charge_nurse') is the specific, unambiguous hospital-role
  // identifier -- prefer it over the coarse backend UserRole enum (only 5 values:
  // physician/nurse/student/admin/read_only_viewer) or saasRole, either of which can
  // collide across several distinct hospital roles and land on the wrong home page.
  const role =
    ((user?.profile as Record<string, unknown> | undefined)?.roleProfileId as string | undefined) ||
    (saasProfile?.saasRole as string | undefined) ||
    (user?.role as string | undefined);

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
