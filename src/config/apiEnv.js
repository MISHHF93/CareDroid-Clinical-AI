import appConfig from './appConfig';

/** Default fetch timeout (ms); override with VITE_API_TIMEOUT_MS */
export const DEFAULT_API_TIMEOUT_MS = Number(import.meta.env?.VITE_API_TIMEOUT_MS) || 30000;

/**
 * Ensures REST paths include the Nest global `/api` prefix.
 * Absolute URLs and `/health` are left unchanged.
 */
export function normalizeApiPath(path = '') {
  if (!path || /^https?:\/\//i.test(path)) return path;
  const p = path.startsWith('/') ? path : `/${path}`;
  if (p === '/api' || p.startsWith('/api/')) return p;
  if (p === '/health') return p;
  return `/api${p}`;
}

/** API origin without trailing slash (empty = same-origin + Vite proxy). */
export function getApiOrigin() {
  return appConfig.api.baseUrl || '';
}

/**
 * Base URL for services that append resource paths (e.g. `${root}/exports/pdf`).
 * Never hardcodes localhost — uses same-origin `/api` in the browser when env is unset.
 */
export function resolveApiRoot() {
  const origin = getApiOrigin();
  if (origin) {
    return origin.endsWith('/api') ? origin : `${origin}/api`;
  }
  if (typeof window !== 'undefined' && window.location?.origin) {
    return `${window.location.origin}/api`;
  }
  return '/api';
}

/** WebSocket origin (ws/wss + host). Empty when unavailable (no localhost fallback). */
export function resolveWebSocketOrigin() {
  const configured = appConfig.api.wsUrl?.replace(/\/$/, '');
  if (configured) return configured;
  if (typeof window !== 'undefined' && window.location?.host) {
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    return `${protocol}//${window.location.host}`;
  }
  return '';
}
