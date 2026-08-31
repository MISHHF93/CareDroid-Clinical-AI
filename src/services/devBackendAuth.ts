import appConfig from '../config/appConfig';
import { AUTH_CONFIG } from '../config/auth.config';
import { API_ROUTES } from '../config/api.config';
import { DEV_SESSION_FETCH_TIMEOUT_MS } from '../config/startupTimeouts';
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
    //
    // HEAL: found live -- isDemoPersonaUser() alone still isn't enough. This
    // app's actual dev-bypass session (AuthPage.tsx's "Bypass sign-in"
    // button) stamps authMode 'explicit-dev-bypass', which isDemoPersonaUser()
    // has never recognized -- the identical gap hydrateStoredDemoUser() (right
    // below, in demoPersonaModel.ts) already had to special-case for
    // HEAL-347.14/.16. So this write still clobbered an explicit-dev-bypass
    // session's profile with the raw backend response whenever it landed
    // after a role switch -- confirmed live two ways: a switched-to
    // registration_clerk session lost its own action grants after a reload
    // (compiledProfile fallback rebuilt with the wrong emergencyRoleId, see
    // useEmergencyRolePermissions.ts's own HEAL comment), and a switched-to
    // public_display session came back with the backend's raw `role`
    // ("student") on later API calls, 403ing on READ_PHI for a page that
    // should have worked. Match hydrateStoredDemoUser()'s own already-shipped
    // "must survive a reload" authMode set here too, instead of only
    // checking isDemoPersonaUser().
    const existingProfile = readStoredUserProfile();
    const preservesExistingProfile =
      isDemoPersonaUser(existingProfile) ||
      ['real', 'local-dev-demo', 'dev-demo', 'explicit-dev-bypass'].includes(
        (existingProfile as any)?.authMode,
      );
    if (!preservesExistingProfile) {
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
// HEAL-347.42: forced callers used to unconditionally null out
// inFlightDevSession before starting their own fetch, defeating the
// dedup this whole mechanism exists for the instant more than one forced
// call landed close together -- e.g. several components independently
// hitting a protected route with the stale bypass token on mount, each
// one's apiClient.ts 401-retry calling ensureDevBackendSession({force:
// true}) at nearly the same moment. Each call reset the guard the
// previous one had just set, so every one of them fired its own real
// POST /api/auth/dev-session -- confirmed live via network trace: 15+
// concurrent POSTs to that route on a single login, taking 7+ seconds to
// resolve. That route is also documented (see resolveDevBackendSession's
// own HEAL-347.27 comment) to degrade under concurrent load, so this
// wasn't just wasteful -- it was actively making its own problem worse.
// Track forced in-flight requests separately so concurrent forced
// callers join the SAME fetch instead of each starting a new one; an
// unforced caller that arrives while a forced fetch is already running
// joins it too, since it's guaranteed to produce a fresh result.
let inFlightForcedSession: Promise<DevBackendSessionResult> | null = null;

async function resolveDevBackendSession({
  force = false,
  timeoutMs = DEV_SESSION_FETCH_TIMEOUT_MS,
  roleProfileId,
}: {
  force?: boolean;
  timeoutMs?: number;
  roleProfileId?: string;
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
  // HEAL: this probe used to hardcode BACKEND_PROBE_TIMEOUT_MS (1200ms) --
  // tuned for apiClient.ts's snappier per-call UX tradeoff, not for "is
  // there a backend at all" here. A merely slow-to-answer-/health-in-time
  // (but genuinely live) backend produced a false "unreachable" verdict,
  // which the unforced (ambient bootstrap) caller then turned into a
  // BYPASS_TOKEN/'local-demo-bypass' result WITHOUT ever attempting the
  // real session POST -- confirmed live to be the dominant cause of
  // UserContext.tsx's ambient bootstrap effect landing on
  // authMode:'open-access' and RequireRealSession bouncing to /login on
  // ordinary page loads. Give the probe the same patience already budgeted
  // for the real fetch it's gating, via this function's own timeoutMs
  // (defaults to DEV_SESSION_FETCH_TIMEOUT_MS), instead of the tighter
  // shared constant.
  try {
    const { ensureBackendReachabilityProbed } = await import('./backendReachability');
    const backendReachable = await ensureBackendReachabilityProbed({
      timeoutMs,
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
      body: roleProfileId ? JSON.stringify({ roleProfileId }) : '{}',
      signal: controller.signal,
    });
    window.clearTimeout(timeoutId);
    const payload = await readJsonBody(response, {});
    if (!response.ok || !payload?.accessToken) {
      // The app's error envelope nests the human message ({ success:false,
      // error:{ message } }), and a proxy-level 5xx (backend restarting)
      // carries no JSON body at all -- both used to surface as `undefined`
      // here, which AuthPage then replaced with its generic "unavailable
      // right now", hiding the actual reason from the person clicking.
      const serverMessage = payload?.error?.message || payload?.message;
      return {
        token: existingToken || BYPASS_TOKEN,
        source: 'fallback-bypass',
        error:
          serverMessage ||
          `The sign-in service responded with HTTP ${response.status}. If the backend was just restarted, try again in a few seconds.`,
      };
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
        ? 'The sign-in service took too long to respond. It may still be starting up — try again in a few seconds.'
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
  roleProfileId,
}: {
  force?: boolean;
  timeoutMs?: number;
  roleProfileId?: string;
} = {}) {
  if (force) {
    // A persona switch (roleProfileId set) must always hit the network to
    // sync the backend's role -- never join an in-flight fetch that was
    // kicked off for a different (or no) persona, since that fetch's
    // request body has already been sent with the old roleProfileId.
    if (roleProfileId) {
      return resolveDevBackendSession({ force, timeoutMs, roleProfileId });
    }
    if (inFlightForcedSession) {
      // Same rule as the unforced-join below: joining is for deduplication,
      // not for inheriting someone else's failure. The in-flight forced call
      // may be an apiClient 401-retry running on the DEFAULT 4s timeout --
      // confirmed live on a cold backend: the bypass click (20s budget)
      // joined such a chain and surfaced its abort at ~8s, never getting to
      // use its own budget. If the joined result is not a real session, run
      // this caller's own attempt with this caller's own timeout.
      return inFlightForcedSession.then((result) =>
        result?.source === 'dev-session'
          ? result
          : resolveDevBackendSession({ force: true, timeoutMs }),
      );
    }
    // HEAL-347.46: an unforced caller (e.g. UserContext.tsx's ambient
    // bootstrap effect, which runs on every mount including the /login page
    // itself) may already have a fetch running by the time a forced caller
    // (e.g. AuthPage.tsx's explicit bypass click) arrives. On a fresh
    // session neither call has a usable cached token to short-circuit on,
    // so the unforced fetch already in flight is fetching the exact same
    // fresh session a forced call would -- join it instead of firing a
    // second concurrent POST /api/auth/dev-session. Without this, HEAL-347.42
    // only covered forced-joins-forced and unforced-joins-forced; this
    // reverse ordering still slipped through as 2-3 concurrent POSTs,
    // confirmed live to be enough on its own to trip the backend's DB-pool
    // exhaustion under concurrent load on this route (see
    // resolveDevBackendSession's HEAL-347.27 comment).
    if (inFlightDevSession) {
      // Derive a separate promise (rather than aliasing the same reference)
      // so this call gets its own `.finally()` cleanup for
      // inFlightForcedSession -- the unforced promise's own cleanup only
      // ever nulls inFlightDevSession, so aliasing directly would leave
      // inFlightForcedSession permanently pointing at a stale, already-
      // resolved promise once this fetch settles.
      //
      // HEAL-347.46 assumed the unforced fetch in flight "is fetching the
      // exact same fresh session a forced call would". It is not, always: an
      // unforced call can spend its whole life in the backend-reachability
      // probe and then resolve as 'local-demo-bypass' (or 'fallback-bypass'
      // on a non-OK response) WITHOUT ever performing the session POST. A
      // forced caller that joined such a result inherited a non-'dev-session'
      // source, and AuthPage.tsx's bypass click -- which requires source ===
      // 'dev-session' -- threw and left the user on /login holding only the
      // ambient authMode:'local-dev-demo' profile, which RequireRealSession
      // refuses. Confirmed live: repeated "Enter CareDroid now" clicks stuck
      // at /login with a 200 dev-session POST in the network log, and the
      // outcome flipped run to run purely on whether the click landed inside
      // the ambient call's in-flight window. So: still join (that is what
      // keeps this route off its known DB-pool cliff), but if the joined
      // result is not a real dev session, do this caller's own forced fetch
      // rather than handing back a result it cannot use.
      const joined = inFlightDevSession.then((result) =>
        result?.source === 'dev-session'
          ? result
          : resolveDevBackendSession({ force: true, timeoutMs }),
      );
      inFlightForcedSession = joined.finally(() => {
        inFlightForcedSession = null;
      });
      return inFlightForcedSession;
    }
    inFlightForcedSession = resolveDevBackendSession({ force, timeoutMs }).finally(() => {
      inFlightForcedSession = null;
    });
    inFlightDevSession = inFlightForcedSession;
    return inFlightForcedSession;
  }

  if (inFlightForcedSession) {
    return inFlightForcedSession;
  }

  if (!inFlightDevSession) {
    inFlightDevSession = resolveDevBackendSession({ force, timeoutMs }).finally(() => {
      inFlightDevSession = null;
    });
  }

  return inFlightDevSession;
}
