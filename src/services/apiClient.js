import axios from 'axios';
import appConfig from '../config/appConfig';
import { DEFAULT_API_TIMEOUT_MS, normalizeApiPath } from '../config/apiEnv';

// In development, use empty string to let Vite proxy handle routing
// In production, use full API URL (origin only; paths include /api)
const getApiBaseUrl = () => appConfig.api.baseUrl || '';

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

const AUTH_TOKEN_KEY = 'caredroid_access_token';
const LEGACY_AUTH_TOKEN_KEY = 'authToken';

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

export const apiFetch = async (path, options = {}) => {
  const {
    timeoutMs = DEFAULT_API_TIMEOUT_MS,
    signal: userSignal,
    headers: optionHeaders,
    ...fetchOptions
  } = options;

  const mergedHeaders = { ...(optionHeaders || {}) };
  if (!mergedHeaders.Authorization) {
    const token = getStoredAccessToken();
    if (token) {
      mergedHeaders.Authorization = `Bearer ${token}`;
    }
  }

  const { signal, cleanup } = mergeAbortSignals(timeoutMs, userSignal);

  try {
    return await fetch(buildApiUrl(path), {
      ...fetchOptions,
      headers: mergedHeaders,
      signal,
    });
  } finally {
    cleanup();
  }
};

export class ApiResponseError extends Error {
  constructor(message, { status = 0, statusText = '', url = '', contentType = '', bodyPreview = '', cause } = {}) {
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

export const parseApiResponse = async (response, { fallback = {} } = {}) => {
  const contentType = response.headers?.get?.('content-type') || '';
  const body = await response.text();

  if (!body) return fallback;

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
  } catch (error) {
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
export function getApiErrorMessage(error, response) {
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
  if (error?.message) return error.message;
  return 'Unable to reach the API. Ensure the backend is running or check VITE_API_URL.';
}

export const apiFetchJson = async (path, options = {}) => {
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
  if (!config.headers.Authorization) {
    const token = getStoredAccessToken();
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
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
