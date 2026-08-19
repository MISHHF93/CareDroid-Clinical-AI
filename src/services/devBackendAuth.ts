import appConfig from '../config/appConfig';
import { AUTH_CONFIG } from '../config/auth.config';
import { API_ROUTES } from '../config/api.config';
import { BACKEND_PROBE_TIMEOUT_MS, DEV_SESSION_FETCH_TIMEOUT_MS } from '../config/startupTimeouts';
import { setTenantContext } from './tenantContextStore';
import { isJwtExpired } from '../utils/jwt';
import { isDemoPersonaUser } from '../config/demoPersonaModel';

async function readJsonBody(response, fallback: any = {}) {
  try {
    return await response.json();
  } catch {
    return fallback;
  }
}

const AUTH_TOKEN_KEY = AUTH_CONFIG.tokenStorageKey;
const USER_PROFILE_KEY = AUTH_CONFIG.userProfileStorageKey;
const DEV_TENANT_CONTEXT_KEY = 'caredroid.devTenantContext.v1';
const BYPASS_TOKEN = appConfig.dev.bearerToken || 'dev-bypass-token';

/** Exported so other dev-only affordances (e.g. AuthPage.tsx's bypass button,
 * router.tsx's RequireRealSession gate) can share this exact check instead of
 * re-deriving their own -- three independent layers all need to agree on
 * "is this actually a local dev environment" for a bypass to stay safely
 * inert in a real deployment: this frontend check, RequireRealSession's own
 * gate condition, and (the one that matters most, since a browser-side check
 * can always be tampered with) createDevSession()'s own server-side
 * isLocalDevelopment/ENABLE_DEV_AUTH_BYPASS gate in auth.service.ts. */
export const isDev =
  typeof window !== 'undefined' &&
  (window.location.hostname === 'localhost' ||
    window.location.hostname === '127.0.0.1' ||
    import.meta?.env?.DEV);

function looksLikeJwt(token) {
  if (!token || typeof token !== 'string') return false;
  if (token === BYPASS_TOKEN) return false;
  const parts = token.split('.');
  return parts.length === 3 && parts.every((part) => part.length > 0);
}

/**
 * A structurally-valid, but expired, dev-session JWT (real access tokens are
 * short-lived -- 15 minutes) must NOT be treated as reusable. Without this
 * check, `resolveDevBackendSession` cached the first JWT it ever fetched and
 * returned that same token forever (nothing else in the frontend ever calls
 * `ensureDevBackendSession({ force: true })`), so any session left open past
 * 15 minutes silently lost every authenticated/realtime call -- observed
 * live as repeated 401s on `/api/emergency/realtime/stream` and other
 * endpoints hours into a dev session, made worse by `apiClient.ts`
 * explicitly silencing 401s in dev as an "expected demo" condition, so
 * nothing ever surfaced the failure or triggered a refresh.
 */
function hasUsableDevSession(token) {
  return looksLikeJwt(token) && !isJwtExpired(token);
}

function readStoredToken() {
  if (typeof localStorage === 'undefined') return '';
  return localStorage.getItem(AUTH_TOKEN_KEY) || '';
}

function readStoredUserProfile() {
  if (typeof localStorage === 'undefined') return null;
  const raw = localStorage.getItem(USER_PROFILE_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

function persistDevSession(payload) {
  if (typeof localStorage === 'undefined' || !payload) return;
  if (payload.accessToken) {
    localStorage.setItem(AUTH_TOKEN_KEY, payload.accessToken);
  }
  if (payload.user) {
    // HEAL-319: this fetch (resolveDevBackendSession -> the fetch below) has no
    // cancellation and can resolve well after the caller stopped waiting for it --
    // UserContext.tsx's own bootstrap effect races it against a 4500ms timeout and
    // moves on regardless, while this fetch's own worst-case latency (backend probe +
    // dev-session fetch timeouts) can exceed 5000ms. When that happens, this write used
    // to fire AFTER a clinician had already switched their demo role via
    // ProfileRoleSwitcher -- and this backend dev-session payload's `user` shape
    // (id/email/role/profile/subscription, no demo-persona markers) fails
    // isDemoPersonaUser(), so the next read of storage fell through to
    // buildOpenAccessDemoUser() with no argument, silently resetting the role to the
    // hardcoded default (charge_nurse) -- confirmed live and via direct trace of
    // hydrateStoredDemoUser()/isDemoPersonaUser(). Only the accessToken (already
    // persisted above) is actually needed from a late-resolving fetch in demo mode;
    // don't let it clobber an already-active, correctly-role-switched demo persona.
    const existingProfile = readStoredUserProfile();
    if (!isDemoPersonaUser(existingProfile)) {
      localStorage.setItem(
        USER_PROFILE_KEY,
        JSON.stringify({
          ...payload.user,
          authMode: 'local-dev-demo',
          isDevAuthBypass: true,
        }),
      );
    }
  }
  if (payload.tenantContext) {
    localStorage.setItem(DEV_TENANT_CONTEXT_KEY, JSON.stringify(payload.tenantContext));
    setTenantContext(payload.tenantContext);
  }
}

export function readDevTenantContext() {
  if (typeof localStorage === 'undefined') return null;
  const raw = localStorage.getItem(DEV_TENANT_CONTEXT_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw);
  } catch {
    localStorage.removeItem(DEV_TENANT_CONTEXT_KEY);
    return null;
  }
}

type DevBackendSessionResult = Awaited<ReturnType<typeof resolveDevBackendSession>>;

let inFlightDevSession: Promise<DevBackendSessionResult> | null = null;

async function resolveDevBackendSession({
  force = false,
  timeoutMs = DEV_SESSION_FETCH_TIMEOUT_MS,
}: {
  force?: boolean;
  timeoutMs?: number;
} = {}) {
  if (!isDev) return { token: readStoredToken(), source: 'production' };

  const existingToken = readStoredToken();
  if (!force && hasUsableDevSession(existingToken)) {
    const tenantContext = readDevTenantContext();
    if (tenantContext) setTenantContext(tenantContext);
    return { token: existingToken, source: 'cached-jwt' };
  }

  // When local demo auth is allowed and no backend API URL is configured,
  // skip the network request — it will fail with ECONNREFUSED since there's no backend.
  try {
    const { ensureBackendReachabilityProbed } = await import('./backendReachability');
    const backendReachable = await ensureBackendReachabilityProbed({
      timeoutMs: BACKEND_PROBE_TIMEOUT_MS,
    });
    if (!backendReachable && !force) {
      return { token: existingToken || BYPASS_TOKEN, source: 'local-demo-bypass' };
    }
  } catch {
    if (!force) {
      return { token: existingToken || BYPASS_TOKEN, source: 'local-demo-bypass' };
    }
  }

  try {
    // Raw fetch avoids a circular import with apiClient (which bootstraps this session).
    const controller = new AbortController();
    const timeoutId = window.setTimeout(() => controller.abort(), timeoutMs);
    // HEAL-347.27: this POST previously had no body and no Content-Length --
    // confirmed live (curl direct to the backend port, curl through the Vite
    // proxy, and a real in-page fetch() all reproduced it identically) that a
    // bodyless POST here never completes: the backend hangs the request
    // indefinitely instead of returning near-instantly the way the exact same
    // route responds to a request that carries even a trivial 2-byte body.
    // Every dev-bypass login click -- and every unforced ambient bootstrap
    // call on mount -- went through this exact bodyless path, so each one
    // silently leaked a held-open request (very likely a checked-out DB pool
    // connection that's never released back). Enough of those and the whole
    // backend degrades for every consumer, not just this call: unrelated
    // routes -- including plain health checks -- start queueing behind the
    // exhausted pool and eventually return 503 rather than actually
    // recovering, since the leaked connections don't free themselves without
    // a restart. Sending an explicit empty JSON body sidesteps whatever
    // no-body edge case triggers the hang, matching the request shape that
    // was always observed to complete quickly.
    const response = await fetch(API_ROUTES.auth.devSession, {
      method: 'POST',
      headers: { Accept: 'application/json', 'Content-Type': 'application/json' },
      body: '{}',
      signal: controller.signal,
    });
    window.clearTimeout(timeoutId);
    const payload = await readJsonBody(response, {});
    if (!response.ok || !payload?.accessToken) {
      return { token: existingToken || BYPASS_TOKEN, source: 'fallback-bypass', error: payload?.message };
    }

    persistDevSession(payload);
    return {
      token: payload.accessToken,
      source: 'dev-session',
      tenantContext: payload.tenantContext || null,
      user: payload.user || null,
    };
  } catch (error: any) {
    const message =
      error?.name === 'AbortError'
        ? 'Dev session timed out'
        : error instanceof Error
          ? error.message
          : 'Dev session unavailable';
    return {
      token: existingToken || BYPASS_TOKEN,
      source: 'fallback-bypass',
      error: message,
    };
  }
}

/**
 * In local dev, replace the static bypass token with a real backend JWT + tenant context.
 * Safe no-op when not in dev or when a JWT is already stored.
 *
 * Falls back to the local bypass token only when the proxied dev-session route is unreachable.
 * Concurrent callers share one in-flight request so UserContext and AppShell do not double-fetch.
 */
export async function ensureDevBackendSession({
  force = false,
  timeoutMs = DEV_SESSION_FETCH_TIMEOUT_MS,
}: {
  force?: boolean;
  timeoutMs?: number;
} = {}) {
  if (force) {
    inFlightDevSession = null;
  }

  if (!inFlightDevSession) {
    inFlightDevSession = resolveDevBackendSession({ force, timeoutMs }).finally(() => {
      inFlightDevSession = null;
    });
  }

  return inFlightDevSession;
}
