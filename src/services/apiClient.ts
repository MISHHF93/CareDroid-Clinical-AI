import axios from 'axios';
import appConfig from '../config/appConfig';
import { DEFAULT_API_TIMEOUT_MS, normalizeApiPath } from '../config/api.config';
import { AUTH_CONFIG } from '../config/auth.config';
import { getTenantHeaders } from './tenantContextStore';
import {
  isBackendKnownOffline,
  isBackendReachableCached,
  isLikelyNetworkError,
  ensureBackendReachabilityProbed,
  markBackendReachable,
  markBackendUnreachable,
} from './backendReachability';
import { BACKEND_PROBE_TIMEOUT_MS } from '../config/startupTimeouts';
import observabilityService from './observabilityService';
import { isPublicApiPath as isSecurityPublicApiPath } from './securityAccessService';
import { toUserFacingApiErrorMessage } from '../config/errorRecoveryModel';

// In development, use empty string to let Vite proxy handle routing.
// VITE_API_URL is treated as an origin only; request paths own the /api prefix.
const getApiBaseUrl = () => {
  const configured = appConfig.api.baseUrl || '';
  if (!configured || configured.startsWith('/')) return '';

  try {
    return new URL(configured).origin;
  } catch {
    return configured.replace(/\/api\/?$/i, '').replace(/\/$/, '');
  }
};

const normalizePath = (path) => {
  if (!path) return '';
  return path.startsWith('/') ? path : `/${path}`;
};

export const buildApiUrl = (path = '') => {
  const base = getApiBaseUrl();
  if (!path) return base || '';
  if (/^https?:\/\//i.test(path)) return path;
  const apiPath = normalizeApiPath(path);
  if (!base) return apiPath;
  return `${base}${normalizePath(apiPath)}`;
};

const AUTH_TOKEN_KEY = AUTH_CONFIG.tokenStorageKey;
const LEGACY_AUTH_TOKEN_KEY = AUTH_CONFIG.legacyTokenStorageKey;

const isAbsoluteHttpUrl = (path = '') => /^https?:\/\//i.test(path);

const shouldAttachTenantHeaders = (path = '') => {
  if (!path || !isAbsoluteHttpUrl(path)) return true;

  const apiBaseUrl = getApiBaseUrl();
  if (apiBaseUrl && path.startsWith(apiBaseUrl)) return true;

  if (typeof window === 'undefined' || !window.location?.origin) return false;

  try {
    return new URL(path).origin === window.location.origin;
  } catch {
    return false;
  }
};

const normalizeHeaders = (headers) => {
  if (!headers) return {};
  if (typeof Headers !== 'undefined' && headers instanceof Headers) {
    return Object.fromEntries(headers.entries());
  }
  if (Array.isArray(headers)) return Object.fromEntries(headers);
  return { ...headers };
};

const hasHeader = (headers, name) => {
  if (!headers) return false;
  if (typeof headers.get === 'function') return Boolean(headers.get(name));
  const lowerName = name.toLowerCase();
  return Object.keys(headers).some((key) => key.toLowerCase() === lowerName);
};

const getHeaderValue = (headers, name) => {
  if (!headers) return '';
  if (typeof headers.get === 'function') return headers.get(name) || '';
  const lowerName = name.toLowerCase();
  const key = Object.keys(headers).find((candidate) => candidate.toLowerCase() === lowerName);
  return key ? String(headers[key] || '') : '';
};

const hasUsableAuthorization = (headers) => {
  const value = getHeaderValue(headers, 'Authorization').trim();
  if (!value) return false;
  return !/^Bearer\s*(undefined|null)?$/i.test(value);
};

const isPublicApiPath = (apiPath) => isSecurityPublicApiPath(apiPath);

// In development, reduce console noise from expected degraded/disabled services and 401s
// when running with the local dev-stack (many backends features are intentionally off).
// Disabled in Vitest so auth and offline-intercept behaviour can be unit-tested against real fetch.
const isDev = !import.meta.env.VITEST &&
  typeof window !== 'undefined' &&
  (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1' || import.meta?.env?.DEV);

const looksLikeJwt = (token) => {
  if (!token || typeof token !== 'string') return false;
  const parts = token.split('.');
  return parts.length === 3 && parts.every((part) => part.length > 0);
};

let devSessionBootstrapPromise: any = null;

async function bootstrapDevSessionIfNeeded(path) {
  if (!isDev) return;
  const apiPath = normalizeApiPath(path);
  if (apiPath === '/api/auth/dev-session') return;
  if (looksLikeJwt(getStoredAccessToken())) return;

  if (!devSessionBootstrapPromise) {
    devSessionBootstrapPromise = import('./devBackendAuth')
      .then(({ ensureDevBackendSession }) => ensureDevBackendSession())
      .catch(() => undefined)
      .finally(() => {
        devSessionBootstrapPromise = null;
      });
  }
  await devSessionBootstrapPromise;
}

function shouldSilenceInDev(status, url) {
  if (!isDev) return false;
  if (status === 401 || status === 403) return true; // auth is often bypassed or not fully set in pure demo
  if (status >= 500) return true; // disabled services (RAG, AI, Redis, external, etc.)
  // Common dev-disabled or demo paths
  const p = String(url || '');
  if (/\/ai\/|\/rag\/|\/memory\/|\/realtime\/|\/central-node|\/operational-intelligence/.test(p)) return true;
  return false;
}

const shouldShortCircuitProtectedApi = (path, headers) => {
  const apiPath = normalizeApiPath(path);
  if (!apiPath.startsWith('/api/')) return false;
  if (isPublicApiPath(apiPath)) return false;
  return !hasUsableAuthorization(headers);
};

// Dev-only: for many paths that hit disabled services, return graceful empty responses
// instead of letting the request fail and spam the console / error UI.
const DEV_GRACEFUL_EMPTY_PATHS = [
  /\/emergency\/(whiteboard|capacity|queues|reassessment|referrals|ems|analytics|central-node|workflow)/,
  /\/profile\/me/,
  /\/tools\/available/,
  /\/ai\//,
  /\/memory\//,
  /\/operational-intelligence/,
  /\/central-node/,
  /\/realtime\//,
  /\/interoperability/,
  /\/governance/,
  /\/config\//,
  /\/boarding/,
  /\/auth\//,
  /\/native-ai\//,
];

function buildDevOfflineJsonBody(path) {
  const p = normalizeApiPath(path);
  if (/\/subscriptions\/current/.test(p)) {
    return { plan: null, status: 'dev-offline', features: [] };
  }
  if (/\/organizations\/current/.test(p)) {
    return { organization: null, engine: null, status: 'dev-offline' };
  }
  if (/\/platform\/context/.test(p)) {
    return { assets: [], packs: [], entitlements: [], status: 'dev-offline' };
  }
  if (/\/tenant\/context/.test(p)) {
    return { tenant: null, organizationId: null, status: 'dev-offline' };
  }
  if (/\/workspaces\/context/.test(p)) {
    return { workspaces: [], activeWorkspaceId: null, status: 'dev-offline' };
  }
  if (/\/whiteboard|\/patients|\/reassessment/.test(p)) {
    return { patients: [], staff: [], rooms: [], alerts: [], workflowLogs: [], status: 'dev-offline' };
  }
  if (/\/ems/.test(p)) {
    return { arrivals: [], units: [], patients: [], status: 'dev-offline' };
  }
  if (/\/referrals/.test(p)) {
    return { referrals: [], items: [], status: 'dev-offline' };
  }
  if (/\/queues/.test(p)) {
    return { queues: [], items: [], status: 'dev-offline' };
  }
  if (/\/workflow/.test(p)) {
    return { logs: [], workflowLogs: [], status: 'dev-offline' };
  }
  if (/\/operational-intelligence/.test(p)) {
    return {
      module: 'CareDroid Operational Intelligence',
      source: 'dev-offline',
      status: 'degraded',
      data: {
        layer: 'CareDroidOperationalIntelligence',
        status: 'degraded',
        mode: 'rule_based',
        models: [],
        insights: [],
      },
    };
  }
  if (/\/central-node/.test(p)) {
    return {
      module: 'CareDroid Central Node',
      source: 'dev-offline',
      status: 'degraded',
      data: { node: 'CareDroidCentralNode', status: 'degraded' },
    };
  }
  return { data: null, items: [], patients: [], results: [], logs: [], status: 'dev-offline' };
}

function getDevGracefulResponse(path) {
  if (!isDev || !isBackendKnownOffline()) return null;
  const p = normalizeApiPath(path);
  if (DEV_GRACEFUL_EMPTY_PATHS.some((re) => re.test(p))) {
    return new Response(JSON.stringify(buildDevOfflineJsonBody(path)), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  }
  return null;
}

function getDevOfflineResponse(path) {
  if (!isDev) return null;
  const p = normalizeApiPath(path);
  if (p === '/health') {
    return new Response(JSON.stringify({ status: 'offline', mode: 'local-dev' }), {
      status: 503,
      headers: { 'Content-Type': 'application/json' },
    });
  }
  if (p.startsWith('/api/')) {
    return new Response(JSON.stringify(buildDevOfflineJsonBody(path)), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  }
  return null;
}

const unauthenticatedApiResponse = () =>
  new Response(JSON.stringify({ message: 'Sign in required to load this data.' }), {
    status: 401,
    statusText: 'Unauthorized',
    headers: { 'Content-Type': 'application/json' },
  });

const setHeaderIfMissing = (headers, name, value) => {
  if (!headers || hasHeader(headers, name)) return;
  if (typeof headers.set === 'function') {
    headers.set(name, value);
    return;
  }
  headers[name] = value;
};

const buildRequestHeaders = (path, optionHeaders) => {
  const mergedHeaders = {
    ...(shouldAttachTenantHeaders(path) ? getTenantHeaders() : {}),
    ...normalizeHeaders(optionHeaders),
  };

  if (!hasHeader(mergedHeaders, 'Authorization')) {
    const token = getStoredAccessToken();
    if (token) {
      mergedHeaders.Authorization = `Bearer ${token}`;
    } else if (isDev) {
      // In dev, auto-attach the known bypass token so we get fewer 401s and less console noise
      mergedHeaders.Authorization = 'Bearer dev-bypass-token';
    }
  }

  return mergedHeaders;
};

export const getStoredAccessToken = () => {
  if (typeof localStorage === 'undefined') return null;
  return localStorage.getItem(AUTH_TOKEN_KEY) || localStorage.getItem(LEGACY_AUTH_TOKEN_KEY);
};

const mergeAbortSignals = (timeoutMs, userSignal) => {
  const controller = new AbortController();
  let timeoutId;

  if (timeoutMs > 0) {
    timeoutId = setTimeout(() => {
      controller.abort(new DOMException('Request timed out', 'TimeoutError'));
    }, timeoutMs);
  }

  if (userSignal) {
    if (userSignal.aborted) {
      controller.abort(userSignal.reason);
    } else {
      userSignal.addEventListener(
        'abort',
        () => controller.abort(userSignal.reason),
        { once: true },
      );
    }
  }

  return {
    signal: controller.signal,
    cleanup: () => {
      if (timeoutId) clearTimeout(timeoutId);
    },
  };
};

export const apiFetch = async (path, options: any = {}) => {
  const {
    timeoutMs = DEFAULT_API_TIMEOUT_MS,
    signal: userSignal,
    headers: optionHeaders,
    ...fetchOptions
  } = options;

  if (isDev && !isBackendKnownOffline() && !isBackendReachableCached()) {
    await ensureBackendReachabilityProbed({ timeoutMs: BACKEND_PROBE_TIMEOUT_MS });
  }

  await bootstrapDevSessionIfNeeded(path);
  const mergedHeaders = buildRequestHeaders(path, optionHeaders);

  if (shouldShortCircuitProtectedApi(path, mergedHeaders)) {
    return unauthenticatedApiResponse();
  }

  // Dev noise reduction: return mocked success for known noisy/degraded endpoints
  const devGraceful = getDevGracefulResponse(path);
  if (devGraceful) {
    return devGraceful;
  }

  if (isDev && isBackendKnownOffline()) {
    const offline = getDevOfflineResponse(path);
    if (offline) return offline;
  }

  const traceHeaders = observabilityService.buildTraceHeaders();
  for (const [headerName, headerValue] of Object.entries(traceHeaders)) {
    setHeaderIfMissing(mergedHeaders, headerName, headerValue);
  }

  const { signal, cleanup } = mergeAbortSignals(timeoutMs, userSignal);
  const requestStartedAt = performance.now();
  const apiPath = normalizeApiPath(path);
  const requestMethod = String(fetchOptions.method || 'GET').toUpperCase();

  try {
    const response = await fetch(buildApiUrl(path), {
      ...fetchOptions,
      headers: mergedHeaders,
      signal,
    });
    observabilityService.recordApiTiming({
      path: apiPath,
      method: requestMethod,
      durationMs: Math.round(performance.now() - requestStartedAt),
      status: response.status,
    });
    if (response.ok) {
      markBackendReachable();
    }
    return response;
  } catch (error: any) {
    observabilityService.recordApiTiming({
      path: apiPath,
      method: requestMethod,
      durationMs: Math.round(performance.now() - requestStartedAt),
      status: 0,
    });
    const isTimeoutOrAbort =
      error?.name === 'TimeoutError' ||
      error?.name === 'AbortError' ||
      error?.message?.includes('timed out');
    if (!isTimeoutOrAbort && isLikelyNetworkError(error)) {
      markBackendUnreachable();
      const offline = getDevOfflineResponse(path);
      if (offline) return offline;
    }
    throw error;
  } finally {
    cleanup();
  }
};

export class ApiResponseError extends Error {
  status: any;
  statusText: any;
  url: any;
  contentType: any;
  bodyPreview: any;
  constructor(message, { status = 0, statusText = '', url = '', contentType = '', bodyPreview = '', cause }: any = {}) {
    super(message, cause ? { cause } : undefined);
    this.name = 'ApiResponseError';
    this.status = status;
    this.statusText = statusText;
    this.url = url;
    this.contentType = contentType;
    this.bodyPreview = bodyPreview;
  }
}

const getBodyPreview = (body = '') => body.replace(/\s+/g, ' ').trim().slice(0, 220);

const isProbablyHtml = (body = '', contentType = '') => {
  const normalizedType = contentType.toLowerCase();
  const trimmed = body.trim().toLowerCase();
  return normalizedType.includes('text/html') || trimmed.startsWith('<!doctype') || trimmed.startsWith('<html');
};

export const parseApiResponse = async <T = Record<string, any>>(
  response,
  options: { fallback?: Record<string, any> | null } = {},
): Promise<T> => {
  const fallback = (options.fallback !== undefined ? options.fallback : {}) as T;
  if (!response || typeof response.text !== 'function') {
    throw new ApiResponseError('The API did not return a valid response. Check backend availability or the request mock.', {
      status: response?.status || 0,
      statusText: response?.statusText || '',
      url: response?.url || '',
      contentType: '',
    });
  }

  const contentType = response.headers?.get?.('content-type') || '';
  const body = await response.text();

  if (!body) return fallback as T;

  if (isProbablyHtml(body, contentType)) {
    throw new ApiResponseError(
      'The API returned an HTML page instead of JSON. Check the API URL, proxy, backend availability, or authentication redirect.',
      {
        status: response.status,
        statusText: response.statusText,
        url: response.url,
        contentType,
        bodyPreview: getBodyPreview(body),
      },
    );
  }

  try {
    return JSON.parse(body);
  } catch (error: any) {
    throw new ApiResponseError('The API returned malformed JSON.', {
      status: response.status,
      statusText: response.statusText,
      url: response.url,
      contentType,
      bodyPreview: getBodyPreview(body),
      cause: error,
    });
  }
};

/**
 * User-facing message for failed API calls (network, timeout, HTTP, parse errors).
 */
export function getApiErrorMessage(error, response: any = undefined) {
  if (error?.name === 'TimeoutError' || error?.message?.includes('timed out')) {
    return 'The request timed out. Check your connection and try again.';
  }
  if (error?.name === 'AbortError') {
    return 'The request was cancelled.';
  }
  if (error instanceof ApiResponseError) {
    return error.message;
  }
  if (response && !response.ok) {
    if (response.status === 401) return 'Sign in required to load this data.';
    if (response.status === 403) return 'You do not have permission to access this resource.';
    if (response.status === 404) return 'The requested API endpoint was not found.';
    if (response.status >= 500) return 'The server is unavailable. Try again later.';
    return `Request failed (${response.status}${response.statusText ? ` ${response.statusText}` : ''}).`;
  }
  if (isLikelyNetworkError(error)) {
    return 'Unable to reach the API. Start the backend with `npm run dev:api` or `npm run dev:fullstack`.';
  }
  if (error?.message) {
    return toUserFacingApiErrorMessage(
      error,
      'Unable to reach the API. Ensure the backend is running or check VITE_API_URL.',
    );
  }
  return 'Unable to reach the API. Ensure the backend is running or check VITE_API_URL.';
}

export const apiFetchJson = async (path, options: any = {}) => {
  const response = await apiFetch(path, options);
  const data = await parseApiResponse(response);
  return { response, data };
};

export const buildStreamUrl = (path = '') => {
  const wsBase = appConfig.api.wsUrl
    ? appConfig.api.wsUrl.replace(/^ws/i, 'http')
    : getApiBaseUrl();
  if (!path) return wsBase || '';
  if (/^https?:\/\//i.test(path)) return path;
  const apiPath = normalizeApiPath(path);
  if (!wsBase) return apiPath;
  return `${wsBase}${normalizePath(apiPath)}`;
};

export const apiAxios = axios.create({
  baseURL: getApiBaseUrl() || undefined,
});

apiAxios.interceptors.request.use((config) => {
  if (config.url && !/^https?:\/\//i.test(config.url)) {
    config.url = normalizeApiPath(config.url);
  }
  config.headers = config.headers || {};
  if (shouldAttachTenantHeaders(config.url)) {
    for (const [name, value] of Object.entries(getTenantHeaders())) {
      setHeaderIfMissing(config.headers, name, value);
    }
  }
  if (!hasHeader(config.headers, 'Authorization')) {
    const token = getStoredAccessToken();
    if (token) {
      setHeaderIfMissing(config.headers, 'Authorization', `Bearer ${token}`);
    }
  }
  return config;
});

export default {
  apiFetch,
  apiFetchJson,
  parseApiResponse,
  apiAxios,
  buildApiUrl,
  buildStreamUrl,
  getStoredAccessToken,
  getApiErrorMessage,
  normalizeApiPath,
};
