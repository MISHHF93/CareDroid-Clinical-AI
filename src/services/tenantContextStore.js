export const TENANT_HEADER_NAMES = Object.freeze({
  organizationId: 'X-CareDroid-Organization-Id',
  workspaceId: 'X-CareDroid-Workspace-Id',
  userId: 'X-CareDroid-User-Id',
  role: 'X-CareDroid-Role',
  subscriptionPlan: 'X-CareDroid-Subscription-Plan',
  source: 'X-CareDroid-Tenant-Source',
});

let currentTenantContext = null;

const normalizeValue = (value) => {
  if (value === undefined || value === null) return '';
  return String(value).trim();
};

export function setTenantContext(context) {
  currentTenantContext = context ? { ...context } : null;
  return currentTenantContext;
}

export function clearTenantContext() {
  currentTenantContext = null;
}

export function getTenantContext() {
  return currentTenantContext ? { ...currentTenantContext } : null;
}

export function hasRequiredTenantContext(context = currentTenantContext) {
  return Boolean(
    normalizeValue(context?.organizationId) &&
      normalizeValue(context?.workspaceId) &&
      normalizeValue(context?.userId) &&
      normalizeValue(context?.role) &&
      normalizeValue(context?.subscriptionPlan)
  );
}

export function getTenantHeaders(context = currentTenantContext) {
  if (!hasRequiredTenantContext(context)) return {};

  return {
    [TENANT_HEADER_NAMES.organizationId]: normalizeValue(context.organizationId),
    [TENANT_HEADER_NAMES.workspaceId]: normalizeValue(context.workspaceId),
    [TENANT_HEADER_NAMES.userId]: normalizeValue(context.userId),
    [TENANT_HEADER_NAMES.role]: normalizeValue(context.role),
    [TENANT_HEADER_NAMES.subscriptionPlan]: normalizeValue(context.subscriptionPlan),
    [TENANT_HEADER_NAMES.source]: normalizeValue(context.source || 'resolved'),
  };
}
