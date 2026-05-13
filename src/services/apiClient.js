import axios from 'axios';
import appConfig from '../config/appConfig';

// In development, use empty string to let Vite proxy handle routing
// In production, use full API URL
const API_BASE_URL = appConfig.api.baseUrl || '';

const normalizePath = (path) => {
  if (!path) return '';
  return path.startsWith('/') ? path : `/${path}`;
};

export const buildApiUrl = (path = '') => {
  if (!path) return API_BASE_URL || '';
  if (/^https?:\/\//i.test(path)) return path;
  // If no base URL (dev mode), use relative path for Vite proxy
  if (!API_BASE_URL) return normalizePath(path);
  return `${API_BASE_URL}${normalizePath(path)}`;
};

const AUTH_TOKEN_KEY = 'caredroid_access_token';

export const getStoredAccessToken = () => {
  if (typeof localStorage === 'undefined') return null;
  return localStorage.getItem(AUTH_TOKEN_KEY);
};

export const apiFetch = (path, options = {}) => {
  const mergedHeaders = { ...(options.headers || {}) };
  if (!mergedHeaders.Authorization) {
    const token = getStoredAccessToken();
    if (token) {
      mergedHeaders.Authorization = `Bearer ${token}`;
    }
  }
  return fetch(buildApiUrl(path), { ...options, headers: mergedHeaders });
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

export const apiFetchJson = async (path, options = {}) => {
  const response = await apiFetch(path, options);
  const data = await parseApiResponse(response);
  return { response, data };
};

export const buildStreamUrl = (path = '') => {
  const wsBase = appConfig.api.wsUrl
    ? appConfig.api.wsUrl.replace(/^ws/i, 'http')
    : API_BASE_URL;
  if (!path) return wsBase || '';
  if (/^https?:\/\//i.test(path)) return path;
  if (!wsBase) return path;
  return `${wsBase}${normalizePath(path)}`;
};

export const apiAxios = axios.create({
  baseURL: API_BASE_URL || undefined,
});

export default {
  apiFetch,
  apiFetchJson,
  parseApiResponse,
  apiAxios,
  buildApiUrl,
  buildStreamUrl,
  getStoredAccessToken,
};
