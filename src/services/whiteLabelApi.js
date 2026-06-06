import { apiFetch } from './apiClient';

export const WHITE_LABEL_CACHE_KEY = 'caredroid.whiteLabel.branding';
export const WHITE_LABEL_TENANT_KEY = 'caredroid.whiteLabel.tenantId';

export async function fetchWhiteLabelBranding(tenantId) {
  if (!tenantId) return null;
  const response = await apiFetch(`/api/white-label/${encodeURIComponent(tenantId)}`);
  if (!response.ok) throw new Error(`White label branding failed (${response.status})`);
  return response.json();
}

export function getCachedWhiteLabelBranding() {
  if (typeof localStorage === 'undefined') return null;
  try {
    const raw = localStorage.getItem(WHITE_LABEL_CACHE_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export function cacheWhiteLabelBranding(payload) {
  if (typeof localStorage === 'undefined' || !payload) return;
  localStorage.setItem(WHITE_LABEL_CACHE_KEY, JSON.stringify(payload));
  if (payload.tenantId) localStorage.setItem(WHITE_LABEL_TENANT_KEY, payload.tenantId);
}

export function getRequestedWhiteLabelTenantId() {
  if (typeof window === 'undefined') return '';
  const params = new URLSearchParams(window.location.search);
  const explicit = params.get('tenant') || params.get('tenantId') || params.get('org');
  if (explicit) return explicit;

  const cached = localStorage.getItem(WHITE_LABEL_TENANT_KEY);
  if (cached) return cached;

  const host = window.location.hostname || '';
  const [subdomain] = host.split('.');
  if (
    subdomain &&
    !['localhost', '127', 'www', 'app', 'demo'].includes(subdomain) &&
    host.includes('.')
  ) {
    return subdomain;
  }
  return '';
}
