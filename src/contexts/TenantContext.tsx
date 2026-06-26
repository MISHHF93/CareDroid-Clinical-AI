import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { apiFetch, getApiErrorMessage, parseApiResponse } from '../services/apiClient';
import {
  clearTenantContext,
  hasRequiredTenantContext,
  setTenantContext,
} from '../services/tenantContextStore';
import { readDevTenantContext } from '../services/devBackendAuth';
import { useUser } from './UserContext';
import logger from '../utils/logger';

export const DEMO_TENANT_CONTEXT = Object.freeze({
  organizationId: 'demo-organization',
  organizationName: 'CareDroid Demo Organization',
  workspaceId: 'demo-workspace',
  workspaceName: 'Demo Clinical Workspace',
  userId: 'dev-demo-user',
  role: 'physician',
  subscriptionPlan: 'free',
  source: 'demo',
  isDemoTenant: true,
});

const TenantContext = createContext<any>({
  tenantContext: null,
  isLoading: false,
  error: '',
  hasTenantContext: false,
  refreshTenantContext: () => {},
});

export const useTenantContext = () => {
  const context = useContext(TenantContext);
  if (!context) {
    throw new Error('useTenantContext must be used within TenantContextProvider');
  }
  return context;
};

const normalizeTenantContext = (input) => {
  const context = input?.tenantContext || input?.context || input;
  if (!context || typeof context !== 'object') return null;

  return {
    organizationId: context.organizationId || context.organization?.id,
    organizationName: context.organizationName || context.organization?.name,
    organizationType: context.organizationType || context.organization?.organizationType,
    branding: context.branding || context.organization?.branding || {},
    workspaceId: context.workspaceId || context.workspace?.id || context.activeWorkspace?.id,
    workspaceName: context.workspaceName || context.workspace?.name || context.activeWorkspace?.name,
    userId: context.userId || context.user?.id,
    role: context.role || context.user?.role,
    subscriptionPlan:
      context.subscriptionPlan || context.subscription?.tier || context.plan || context.tier,
    source: context.source || 'resolved',
    isDemoTenant: Boolean(context.isDemoTenant),
  };
};

const buildDemoTenantContext = (user) => ({
  ...DEMO_TENANT_CONTEXT,
  userId: user?.id || DEMO_TENANT_CONTEXT.userId,
  role: user?.role || DEMO_TENANT_CONTEXT.role,
  subscriptionPlan: user?.subscription?.tier || DEMO_TENANT_CONTEXT.subscriptionPlan,
});

export function TenantContextProvider({ children }) {
  const { user, authToken, isAuthenticated, isLoading: isUserLoading, isDevAuthBypass } = useUser();
  const [tenantContext, setTenantContextState] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  const canUseDemoTenant = Boolean(
    isDevAuthBypass ||
      user?.isDevAuthBypass ||
      user?.authMode === 'open-access' ||
      user?.authMode === 'platform-access' ||
      user?.authMode === 'local-dev-demo' ||
      user?.authMode === 'dev-demo'
  );

  const applyTenantContext = useCallback((nextContext) => {
    if (hasRequiredTenantContext(nextContext)) {
      const normalized = setTenantContext(nextContext);
      setTenantContextState(normalized);
      return normalized;
    }

    clearTenantContext();
    setTenantContextState(null);
    return null;
  }, []);

  const refreshTenantContext = useCallback(async () => {
    if (isUserLoading) return null;

    if (!isAuthenticated && !authToken) {
      setError('');
      applyTenantContext(null);
      return null;
    }

    setIsLoading(true);
    try {
      const response = await apiFetch('/api/tenant/context');
      const data = await parseApiResponse(response, { fallback: {} });

      if (!response.ok) {
        throw new Error(data?.message || getApiErrorMessage(null, response));
      }

      const resolvedContext = normalizeTenantContext(data);
      if (!hasRequiredTenantContext(resolvedContext)) {
        throw new Error('Tenant context required. Select an organization/workspace or retry.');
      }

      setError('');
      return applyTenantContext(resolvedContext);
    } catch (tenantError: any) {
      const message = tenantError?.message || 'Tenant context unavailable.';
      const devTenantContext = readDevTenantContext();
      if (devTenantContext && hasRequiredTenantContext(devTenantContext)) {
        setError('');
        return applyTenantContext(devTenantContext);
      }
      if (canUseDemoTenant) {
        const demoContext = buildDemoTenantContext(user);
        setError('');
        logger.warn('Using explicit demo tenant context', { message });
        return applyTenantContext(demoContext);
      }

      logger.error('Failed to resolve tenant context', { message });
      setError(message);
      applyTenantContext(null);
      return null;
    } finally {
      setIsLoading(false);
    }
  }, [
    applyTenantContext,
    authToken,
    canUseDemoTenant,
    isAuthenticated,
    isUserLoading,
    user,
  ]);

  useEffect(() => {
    refreshTenantContext();
  }, [refreshTenantContext]);

  useEffect(() => () => clearTenantContext(), []);

  const value = useMemo(
    () => ({
      tenantContext,
      isLoading: isLoading || isUserLoading,
      error,
      hasTenantContext: hasRequiredTenantContext(tenantContext),
      refreshTenantContext,
    }),
    [error, isLoading, isUserLoading, refreshTenantContext, tenantContext]
  );

  return <TenantContext.Provider value={value}>{children}</TenantContext.Provider>;
}

export function TenantRequired({ children, fallback = null }) {
  const { isAuthenticated } = useUser();
  const { error, hasTenantContext, isLoading, refreshTenantContext } = useTenantContext();

  if (!isAuthenticated) return children;
  if (hasTenantContext) return children;

  if (isLoading) {
    return (
      <div className="app-init-screen" role="status" aria-live="polite">
        <h1>Loading tenant context...</h1>
      </div>
    );
  }

  if (fallback) return fallback;

  return (
    <div className="app-init-screen" role="alert">
      <h1>Tenant context required</h1>
      <p>
        {error ||
          'Select an organization/workspace or retry before loading this feature. Tenant isolation prevents access without a verified context.'}
      </p>
      <button type="button" onClick={refreshTenantContext}>
        Retry
      </button>
    </div>
  );
}

export default TenantContext;
