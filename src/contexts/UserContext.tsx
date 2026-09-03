import React, { createContext, useContext, useState, useEffect, useMemo, useRef } from 'react';
import appConfig from '../config/appConfig';
import { AUTH_CONFIG } from '../config/auth.config';
import { deriveAuthMode } from '../auth/authSession';
import {
  buildOpenAccessDemoUser,
  hydrateStoredDemoUser,
  OPEN_ACCESS_USER_ID,
} from '../config/demoPersonaModel';
import {
  buildSecurityContextFromUser,
  checkAllPermissions as checkAllSecurityPermissions,
  checkAnyPermission as checkAnySecurityPermissions,
  checkPermission as checkSecurityPermission,
} from '../config/security';
import logger from '../utils/logger';
import { ensureDevBackendSession } from '../services/devBackendAuth';
import { USER_BOOTSTRAP_MAX_MS } from '../config/startupTimeouts';
import { useEmergencyStore } from '../store/emergencyStore';

export { Permission } from '../config/backendPermissionCatalog';

/**
 * User Context for managing authentication and role-based access
 *
 * Provides user information and role-based permission checking
 * throughout the application.
 */

const AUTH_TOKEN_KEY = AUTH_CONFIG.tokenStorageKey;
const LEGACY_AUTH_TOKEN_KEY = AUTH_CONFIG.legacyTokenStorageKey;
const USER_PROFILE_KEY = AUTH_CONFIG.userProfileStorageKey;
const OPEN_ACCESS_TOKEN = appConfig.dev.bearerToken || 'dev-bypass-token';

const OPEN_ACCESS_USER = buildOpenAccessDemoUser();

// HEAL: bootstrapSession() below only ever runs `if (import.meta.env.DEV)`,
// so every fallback it reaches for is inherently a dev-only outcome -- but
// its fallback chains used to bottom out at OPEN_ACCESS_USER
// (authMode:'open-access'), which RequireRealSession (router.tsx) treats as
// "definitely not authenticated" and bounces to /login. That's the wrong
// read of "we couldn't confirm a session in time" for a code path whose sole
// purpose is frictionless dev/demo access -- a slow-but-live backend isn't
// evidence the visitor needs to log in for real. Same identity as
// OPEN_ACCESS_USER, but tagged the way a normal successful dev-session
// already is (persistDevSession()'s own authMode stamp), so
// RequireRealSession accepts it instead of bouncing.
const DEV_BOOTSTRAP_FALLBACK_USER = { ...OPEN_ACCESS_USER, authMode: 'local-dev-demo' };

// A plain `readStoredUser() || userRef.current || DEV_BOOTSTRAP_FALLBACK_USER`
// chain never actually reaches the new fallback in practice: userRef.current
// is itself seeded from `readStoredUser() || OPEN_ACCESS_USER` at mount, so
// on a fresh session it's already a truthy, open-access-tagged object that
// short-circuits the `||` chain before DEV_BOOTSTRAP_FALLBACK_USER is ever
// reached -- confirmed to be exactly the common-case path that reproduced
// the /login bounce. Relabel any resolved candidate whose authMode is
// 'open-access' (rather than only substituting when the whole chain is
// falsy) so this actually covers the case it was written for.
const resolveDevBootstrapFallbackUser = (candidate: any) =>
  candidate && candidate.authMode !== 'open-access' ? candidate : DEV_BOOTSTRAP_FALLBACK_USER;

const canUseStorage = () => typeof localStorage !== 'undefined';

const readStoredUser = () => {
  if (!canUseStorage()) return null;
  const raw = localStorage.getItem(USER_PROFILE_KEY);
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw);
    if (parsed?.id === OPEN_ACCESS_USER_ID || parsed?.authMode === 'open-access') {
      return hydrateStoredDemoUser(parsed);
    }
    return hydrateStoredDemoUser(parsed);
  } catch {
    localStorage.removeItem(USER_PROFILE_KEY);
    return null;
  }
};

const readStoredToken = () => {
  if (!canUseStorage()) return '';
  return localStorage.getItem(AUTH_TOKEN_KEY) || localStorage.getItem(LEGACY_AUTH_TOKEN_KEY) || '';
};

const looksLikeJwt = (token: string) => {
  if (!token || token === OPEN_ACCESS_TOKEN) return false;
  const parts = token.split('.');
  return parts.length === 3 && parts.every((part) => part.length > 0);
};

const resolveSessionToken = (preferredToken?: string) => {
  const candidate = preferredToken || readStoredToken();
  return looksLikeJwt(candidate) ? candidate : candidate || OPEN_ACCESS_TOKEN;
};

const persistSession = (nextUser, nextToken) => {
  if (!canUseStorage()) return;
  const userToPersist = nextUser || OPEN_ACCESS_USER;
  const tokenToPersist = resolveSessionToken(nextToken);
  localStorage.setItem(USER_PROFILE_KEY, JSON.stringify(userToPersist));
  localStorage.setItem(AUTH_TOKEN_KEY, tokenToPersist);
  localStorage.removeItem(LEGACY_AUTH_TOKEN_KEY);
};

/** A stable-enough key to detect "this is actually a different session/role,"
 * not just a re-hydration of the same identity (e.g. a background token
 * refresh). Only real identity changes should trigger a PHI-context wipe. */
const identityKey = (candidate) =>
  candidate ? `${candidate.id || ''}::${candidate.role || ''}` : '';

/**
 * Item 37: unauthorized PHI context must not survive a sign-out or role
 * switch. Clears the shared patient-selection store (closing anything driven
 * by it, e.g. PatientDetailPanel) and fires the same `close-all-panels`
 * event Copilot/Notification-Center already coordinate on (see HEAL-313),
 * plus a dedicated event any PHI-holding local component state (e.g.
 * CopilotPanel's own conversation history, which is not in the shared store)
 * can listen for to reset itself.
 */
const clearPhiAdjacentContext = () => {
  try {
    useEmergencyStore.getState().selectPatient(null);
  } catch {
    // Best-effort -- never let session-context cleanup break sign-out/role-switch itself.
  }
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new Event('close-all-panels'));
    window.dispatchEvent(new Event('caredroid:clear-session-context'));
  }
};

const UserContext = createContext<any>({
  user: null,
  authToken: '',
  isAuthenticated: false,
  isRealSession: false,
  authMode: 'open-access',
  isDevAuthBypass: false,
  isLoading: true,
  hasPermission: () => false,
  hasAnyPermission: () => false,
  hasAllPermissions: () => false,
  setUser: () => {},
  setAuthToken: () => {},
  signOut: () => {},
});

export const useUser = () => {
  const context = useContext(UserContext);
  if (!context) {
    throw new Error('useUser must be used within a UserProvider');
  }
  return context;
};

export const UserProvider = ({ children }) => {
  const [user, setUserState] = useState(() => readStoredUser() || OPEN_ACCESS_USER);
  const [authToken, setAuthTokenState] = useState(() => resolveSessionToken());
  const [isLoading, setIsLoading] = useState(
    () => import.meta.env.DEV && !looksLikeJwt(resolveSessionToken()),
  );

  // Bootstrap below is async and only re-runs on mount ([] deps), so it must
  // not read `user`/`authToken` from its closure — any setUser() call that
  // lands while ensureDevBackendSession() is still pending (e.g. a demo/pilot
  // caller setting a custom role right after mount) would otherwise be
  // silently clobbered by the stale pre-bootstrap value once this resolves.
  const userRef = useRef(user);
  const authTokenRef = useRef(authToken);
  useEffect(() => {
    userRef.current = user;
  }, [user]);
  useEffect(() => {
    authTokenRef.current = authToken;
  }, [authToken]);

  useEffect(() => {
    let cancelled = false;

    const bootstrapSession = async () => {
      if (!import.meta.env.DEV) {
        persistSession(userRef.current, authTokenRef.current);
        return;
      }

      if (looksLikeJwt(resolveSessionToken())) {
        persistSession(userRef.current, authTokenRef.current);
        setIsLoading(false);
        return;
      }

      setIsLoading(true);
      const session = await Promise.race([
        ensureDevBackendSession(),
        new Promise<Awaited<ReturnType<typeof ensureDevBackendSession>>>((resolve) => {
          window.setTimeout(
            () =>
              resolve({
                token: resolveSessionToken(),
                source: 'bootstrap-timeout',
                // A timeout is not evidence that no backend exists, so this
                // carries no reachability verdict for AuthPage's fallback.
                status: undefined,
                error: 'Dev session bootstrap timed out',
              }),
            USER_BOOTSTRAP_MAX_MS,
          );
        }),
      ]);
      if (cancelled) return;

      // HEAL-347.46: this effect's own USER_BOOTSTRAP_MAX_MS timeout is a
      // fixed wall-clock deadline with zero awareness of what else may be
      // resolving concurrently. On the /login page specifically, this same
      // effect runs on mount (before the user does anything) at the same
      // time AuthPage.tsx's "Bypass sign-in" click independently clears
      // storage and calls ensureDevBackendSession({ force: true }) itself.
      // If the backend is slow enough that this effect's own race times out
      // before either fetch resolves, the code below used to unconditionally
      // write readStoredUser() || userRef.current || OPEN_ACCESS_USER --
      // frequently OPEN_ACCESS_USER, since the click handler had already
      // cleared storage -- landing AFTER the click's own writes and
      // silently reverting the session back to the anonymous demo persona.
      // Live-confirmed via direct localStorage inspection across repeated
      // bypass-click runs (roughly 50% fail rate under a slow/degraded
      // backend). Re-checking storage for an already-valid JWT here means
      // whichever session actually landed in storage wins, instead of this
      // effect's own possibly-stale fallback overwriting it.
      const storedToken = resolveSessionToken();
      if (looksLikeJwt(storedToken)) {
        const latestStoredUser = resolveDevBootstrapFallbackUser(
          readStoredUser() || userRef.current,
        );
        setAuthTokenState(storedToken);
        setUserState(latestStoredUser);
        setIsLoading(false);
        return;
      }

      const nextToken = resolveSessionToken(session?.token);
      const storedUser = resolveDevBootstrapFallbackUser(readStoredUser() || userRef.current);
      setAuthTokenState(nextToken);
      setUserState(storedUser);
      persistSession(storedUser, nextToken);
      setIsLoading(false);

      logger.info('Dev platform session initialized', {
        source: session?.source,
        hasJwt: looksLikeJwt(nextToken),
      });
    };

    void bootstrapSession();
    return () => {
      cancelled = true;
    };
  }, []);

  // HEAL-347.39: this used to force `authMode: 'open-access'` on every
  // setUser() call, a leftover from the pre-login "Auth UI removed" era
  // (commit ce80849c) when the whole app was open-access-only. Once real
  // login/dev-bypass sessions and RequireRealSession's route gate existed
  // (HEAL-347.12/347.14/347.16), this stale override meant ANY setUser()
  // call -- most visibly the demo profile switcher's switchDemoRole(), but
  // also useCareDroidUser's role-switch path -- silently downgraded a real
  // 'real'/'explicit-dev-bypass' session to 'open-access', which
  // RequireRealSession then rejects, bouncing the user straight back to
  // /login. Live-reproduced: clicking any of the 8 profile-switcher chips
  // sent every session to /login instead of the intended landing route.
  // hydrateStoredDemoUser() already derives the correct authMode for
  // nextUser (passing 'real'/dev-session modes through untouched) -- trust it.
  const setUser = (newUser) => {
    const nextUser = newUser ? hydrateStoredDemoUser(newUser) : OPEN_ACCESS_USER;
    const identityChanged = identityKey(user) !== identityKey(nextUser);
    setUserState(nextUser);
    persistSession(nextUser, authToken);
    if (identityChanged) {
      clearPhiAdjacentContext();
    }
  };

  const setAuthToken = (nextToken = OPEN_ACCESS_TOKEN) => {
    const resolvedToken = resolveSessionToken(nextToken);
    setAuthTokenState(resolvedToken);
    persistSession(user, resolvedToken);
  };

  const signOut = () => {
    setUserState(OPEN_ACCESS_USER);
    setAuthTokenState(OPEN_ACCESS_TOKEN);
    persistSession(OPEN_ACCESS_USER, OPEN_ACCESS_TOKEN);
    clearPhiAdjacentContext();
  };

  /**
   * Check if user has a specific permission
   */
  const securityContext = useMemo(() => buildSecurityContextFromUser(user), [user]);

  const hasPermission = (permission) => {
    if (!user || !user.role) return false;
    return checkSecurityPermission(securityContext, permission);
  };

  const hasAnyPermission = (permissions) => {
    if (!user || !user.role) return false;
    return checkAnySecurityPermissions(securityContext, permissions);
  };

  const hasAllPermissions = (permissions) => {
    if (!user || !user.role) return false;
    return checkAllSecurityPermissions(securityContext, permissions);
  };

  const isAuthenticated = Boolean(user && authToken);
  const authMode = deriveAuthMode(user, authToken);
  const isRealSession = looksLikeJwt(authToken);
  const isDevAuthBypass = Boolean(
    user?.isDevAuthBypass ||
    user?.authMode === 'platform-access' ||
    user?.authMode === 'local-dev-demo' ||
    user?.authMode === 'dev-demo',
  );

  // Debug logging for authentication state changes
  useEffect(() => {
    logger.debug('UserContext auth state changed', {
      hasAuthToken: Boolean(authToken),
      hasUser: Boolean(user),
      isAuthenticated,
      isDevAuthBypass,
    });
    if (user) {
      logger.debug('User details', { id: user.id, email: user.email, role: user.role });
    }
  }, [isAuthenticated, isDevAuthBypass, authToken, user]);

  const value = useMemo(
    () => ({
      user,
      authToken,
      isAuthenticated,
      isRealSession,
      authMode,
      isDevAuthBypass,
      isLoading,
      hasPermission,
      hasAnyPermission,
      hasAllPermissions,
      setUser,
      setAuthToken,
      signOut,
    }),
    // hasPermission/hasAnyPermission/hasAllPermissions and signOut are re-created every
    // render as plain closures, but they only ever read user/securityContext — both
    // already tracked below — so it's safe to omit them here. Without this useMemo,
    // `value` was a brand-new object on every render of UserProvider (including renders
    // triggered by unrelated ancestors), which cascaded through every consumer that
    // depends on the whole user object (useEmergencyRolePermissions -> role/profile memos
    // -> useCareDroidCentralNode's snapshot memo, etc.), causing those to recompute and
    // re-publish store updates on every tick — a self-sustaining render storm that could
    // starve a freshly-mounting lazy route's Suspense boundary from ever committing
    // (MB-P0-4 / HEAL-082: /emergency/patients permanently stuck on "Loading patients...").
    [
      user,
      authToken,
      isAuthenticated,
      isRealSession,
      authMode,
      isDevAuthBypass,
      isLoading,
      securityContext,
    ],
  );

  return <UserContext.Provider value={value}>{children}</UserContext.Provider>;
};

export default UserContext;
