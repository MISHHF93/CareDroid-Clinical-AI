export const TENANT_HEADER_NAMES = Object.freeze({
  organizationId: 'X-CareDroid-Organization-Id',
  workspaceId: 'X-CareDroid-Workspace-Id',
  userId: 'X-CareDroid-User-Id',
  role: 'X-CareDroid-Role',
  subscriptionPlan: 'X-CareDroid-Subscription-Plan',
  source: 'X-CareDroid-Tenant-Source',
});

let currentTenantContext: any = null;

// A role switch (useEmergencyRolePermissions.ts's switchDemoRole) clears the
// cache, then re-applies it from the dev-session sync's own response once
// that completes -- the one guaranteed-fresh source, since it's built from
// user.role strictly *after* the backend wrote it. TenantContext.tsx's
// independent effect-driven /api/tenant/context refetch (re-fires on every
// `user` reference change, which the same role switch triggers) has no way
// to know a switch is in flight and no ordering guarantee against it -- a
// plain GET, it routinely resolves *faster* than the dev-session POST it's
// racing, and repopulates the cache with whatever role the backend still had
// before that POST landed. Confirmed live: even with the clear + re-apply
// above, "Tenant role header does not match authenticated user" 403s
// persisted, because this second race kept overwriting the cleared cache
// before the re-apply had a chance to run. transitionToken lets the owner of
// a switch (the only one with a truly authoritative result to apply) tell
// every other caller of setTenantContext to stand down until it's done,
// rather than trying to out-race it.
let transitionToken: symbol | null = null;

const normalizeValue = (value) => {
  if (value === undefined || value === null) return '';
  return String(value).trim();
};

/**
 * Begin a tenant-context transition: every setTenantContext() call from
 * elsewhere is ignored until endTenantContextTransition(token) is called
 * with the SAME token. Returns the token the caller must hold onto and pass
 * back to end the transition (a stale/mismatched token can't reopen it).
 */
export function beginTenantContextTransition() {
  const token = Symbol('tenant-context-transition');
  transitionToken = token;
  currentTenantContext = null;
  return token;
}

export function endTenantContextTransition(token: symbol, context?) {
  if (token !== transitionToken) return currentTenantContext;
  transitionToken = null;
  if (context !== undefined) {
    currentTenantContext = context ? { ...context } : null;
  }
  return currentTenantContext;
}

export function setTenantContext(context) {
  if (transitionToken) return currentTenantContext;
  currentTenantContext = context ? { ...context } : null;
  return currentTenantContext;
}

export function clearTenantContext() {
  if (transitionToken) return;
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
    normalizeValue(context?.subscriptionPlan),
  );
}

export function getTenantHeaders(context: any = currentTenantContext) {
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
