import {
  TENANT_HEADER_NAMES,
  TenantContextRequest,
  TenantScope,
} from './tenant-context.types';

const firstString = (value: unknown): string | undefined => {
  const raw = Array.isArray(value) ? value[0] : value;
  return typeof raw === 'string' && raw.trim() ? raw.trim() : undefined;
};

const readHeader = (request: TenantContextRequest, name: string) =>
  firstString(request.headers?.[name] || request.headers?.[name.toLowerCase()]);

const readContainer = (container: Record<string, any> | undefined, keys: string[]) => {
  if (!container) return undefined;
  for (const key of keys) {
    const value = firstString(container[key]);
    if (value) return value;
  }
  return undefined;
};

export function extractTenantScopeFromRequest(request: TenantContextRequest): TenantScope {
  const paramOrganizationId = readContainer(request.params, ['organizationId', 'orgId']);
  const paramWorkspaceId = readContainer(request.params, ['workspaceId']);
  const queryOrganizationId = readContainer(request.query, ['organizationId', 'orgId']);
  const queryWorkspaceId = readContainer(request.query, ['workspaceId']);
  const bodyOrganizationId = readContainer(request.body, ['organizationId', 'orgId']);
  const bodyWorkspaceId = readContainer(request.body, ['workspaceId']);
  const headerOrganizationId = readHeader(request, TENANT_HEADER_NAMES.organizationId);
  const headerWorkspaceId = readHeader(request, TENANT_HEADER_NAMES.workspaceId);
  const organizationId =
    paramOrganizationId ||
    queryOrganizationId ||
    bodyOrganizationId ||
    headerOrganizationId ||
    request.tenantContext?.organizationId;
  const workspaceId =
    paramWorkspaceId ||
    queryWorkspaceId ||
    bodyWorkspaceId ||
    headerWorkspaceId ||
    request.tenantContext?.workspaceId;

  if (paramOrganizationId || paramWorkspaceId) {
    return { organizationId, workspaceId, source: 'params' };
  }
  if (queryOrganizationId || queryWorkspaceId) {
    return { organizationId, workspaceId, source: 'query' };
  }
  if (bodyOrganizationId || bodyWorkspaceId) {
    return { organizationId, workspaceId, source: 'body' };
  }
  if (headerOrganizationId || headerWorkspaceId) {
    return { organizationId, workspaceId, source: 'headers' };
  }

  return {
    organizationId,
    workspaceId,
    source: request.tenantContext ? 'tenantContext' : undefined,
  };
}

export function isTenantBootstrapPath(request: TenantContextRequest): boolean {
  const method = (request.method || 'GET').toUpperCase();
  const path = (request.originalUrl || request.url || request.path || '').split('?')[0];

  if (path === '/health' || path.startsWith('/metrics')) return true;
  if (path === '/api/subscriptions/plans' || path === '/api/subscriptions/config') return true;
  if (path === '/api/subscriptions/webhook') return true;
  if (method === 'GET' && path === '/api/organizations') return true;
  if (method === 'GET' && path === '/api/organizations/current') return true;
  if (method === 'POST' && (path === '/api/organizations' || path === '/api/organizations/onboarding')) {
    return true;
  }

  return false;
}
