import appConfig from '../config/appConfig';
import { AUTH_CONFIG } from '../config/auth.config';
import { API_ROUTES } from '../config/api.config';
import { setTenantContext } from './tenantContextStore';

async function readJsonBody(response, fallback = {}) {
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

const isDev =
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

function readStoredToken() {
  if (typeof localStorage === 'undefined') return '';
  return localStorage.getItem(AUTH_TOKEN_KEY) || '';
}

function persistDevSession(payload) {
  if (typeof localStorage === 'undefined' || !payload) return;
  if (payload.accessToken) {
    localStorage.setItem(AUTH_TOKEN_KEY, payload.accessToken);
  }
  if (payload.user) {
    localStorage.setItem(
      USER_PROFILE_KEY,
      JSON.stringify({
        ...payload.user,
        authMode: 'local-dev-demo',
        isDevAuthBypass: true,
      }),
    );
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

/**
 * In local dev, replace the static bypass token with a real backend JWT + tenant context.
 * Safe no-op when not in dev or when a JWT is already stored.
 */
export async function ensureDevBackendSession({ force = false } = {}) {
  if (!isDev) return { token: readStoredToken(), source: 'production' };

  const existingToken = readStoredToken();
  if (!force && looksLikeJwt(existingToken)) {
    const tenantContext = readDevTenantContext();
    if (tenantContext) setTenantContext(tenantContext);
    return { token: existingToken, source: 'cached-jwt' };
  }

  try {
    // Raw fetch avoids a circular import with apiClient (which bootstraps this session).
    const response = await fetch(API_ROUTES.auth.devSession, {
      method: 'POST',
      headers: { Accept: 'application/json' },
    });
    const payload = await readJsonBody(response, {});
    if (!response.ok || !payload?.accessToken) {
      return { token: existingToken || BYPASS_TOKEN, source: 'fallback-bypass', error: payload?.message };
    }

    persistDevSession(payload);
    return { token: payload.accessToken, source: 'dev-session', tenantContext: payload.tenantContext || null };
  } catch (error) {
    return {
      token: existingToken || BYPASS_TOKEN,
      source: 'fallback-bypass',
      error: error instanceof Error ? error.message : 'Dev session unavailable',
    };
  }
}