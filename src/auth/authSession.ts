import appConfig from '../config/appConfig';
import { CANONICAL_ROUTES } from '../config/routes.config';
import { resolveClinicalHomeRoute } from '../config/platformEntryModel';
import { resolveDemoDefaultLandingRoute, OPEN_ACCESS_USER_ID } from '../config/demoPersonaModel';

const BYPASS_TOKEN = appConfig.dev.bearerToken || 'dev-bypass-token';

/** Matches devBackendAuth.ts/UserContext.tsx's own looksLikeJwt -- kept as a
 * local, unexported copy rather than a shared import to avoid pulling this
 * module into their (larger, side-effect-heavier) dependency graphs. */
function looksLikeJwt(token: string | null | undefined): boolean {
  if (!token || token === BYPASS_TOKEN) return false;
  const parts = token.split('.');
  return parts.length === 3 && parts.every((part) => part.length > 0);
}

export function sanitizeReturnUrl(returnUrl?: string | null): string {
  const raw = String(returnUrl || '').trim();
  if (!raw || !raw.startsWith('/') || raw.startsWith('//') || raw.startsWith('/auth')) {
    return '/';
  }
  return raw;
}

/** HEAL-347.12: real /login and /register pages now exist (src/pages/auth/AuthPage.tsx) --
 * this used to unconditionally bounce every auth-style URL to the demo platform entry hub. */
export function buildAuthUrl({
  mode = 'login',
  returnUrl,
}: {
  mode?: 'login' | 'signup';
  returnUrl?: string;
  inviteToken?: string;
} = {}): string {
  const safe = sanitizeReturnUrl(returnUrl);
  const base = mode === 'signup' ? CANONICAL_ROUTES.register : CANONICAL_ROUTES.login;
  return safe !== '/' ? `${base}?returnUrl=${encodeURIComponent(safe)}` : base;
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

/** HEAL-347.12: was hardcoded to always return false ("Auth UI removed" era
 * stub) -- a genuine backend-issued JWT (real login or dev-session) is
 * structurally a signed 3-segment token, unlike the static bypass string. */
export function isRealAuthToken(token: string | null | undefined): boolean {
  return looksLikeJwt(token);
}

/** HEAL-347.12: was hardcoded to always return true -- mirrors the exact
 * open-access check UserContext.tsx's own readStoredUser() already uses. */
export function isOpenAccessUser(user: Record<string, unknown> | null | undefined): boolean {
  if (!user) return true;
  return user.id === OPEN_ACCESS_USER_ID || user.authMode === 'open-access';
}

type AuthMode =
  | 'real'
  | 'open-access'
  | 'platform-access'
  | 'local-dev-demo'
  | 'dev-demo'
  | 'explicit-dev-bypass';

/** HEAL-347.12: was hardcoded to always return 'open-access' regardless of
 * input. A user is only ever reported as 'real' when BOTH its own stored
 * authMode says so (stamped by realAuthApi.ts on a successful login/register)
 * AND the token is a genuine signed JWT, not the static dev-bypass string --
 * checking only one of the two would misreport a real user whose token
 * hasn't refreshed yet, or a demo session that happens to hold a real
 * dev-session JWT. */
export function deriveAuthMode(
  user: Record<string, unknown> | null | undefined,
  token: string | null | undefined,
): AuthMode {
  const userAuthMode = user?.authMode;
  if (userAuthMode === 'real' && isRealAuthToken(token)) return 'real';
  if (
    userAuthMode === 'platform-access' ||
    userAuthMode === 'local-dev-demo' ||
    userAuthMode === 'dev-demo' ||
    userAuthMode === 'explicit-dev-bypass'
  ) {
    return userAuthMode;
  }
  return 'open-access';
}
