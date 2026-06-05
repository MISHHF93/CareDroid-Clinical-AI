import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { PlatformAssetsApi } from '../services/platformAssetsApi';
import { useUser } from './UserContext';
import { useUserIdentity } from './UserIdentityContext';
import logger from '../utils/logger';

const OrganizationContext = createContext({
  organizationEngine: null,
  organization: null,
  tenant: null,
  branding: null,
  subscription: null,
  integrations: [],
  supportedOrganizationTypes: [],
  isLoading: false,
  error: '',
  refreshOrganizationEngine: () => {},
  saveOrganizationSettings: () => {},
});

export const useOrganizationContext = () => {
  const context = useContext(OrganizationContext);
  if (!context) {
    throw new Error('useOrganizationContext must be used within OrganizationContextProvider');
  }
  return context;
};

export function OrganizationContextProvider({ children }) {
  const { isAuthenticated, authToken } = useUser();
  const { organization, platformContext, refreshPlatformContext } = useUserIdentity();
  const [organizationEngine, setOrganizationEngine] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  const refreshOrganizationEngine = useCallback(async () => {
    if (!isAuthenticated && !authToken) {
      setOrganizationEngine(null);
      setError('');
      return null;
    }

    setIsLoading(true);
    try {
      const engine = organization?.id
        ? await PlatformAssetsApi.getOrganizationEngine(organization.id)
        : await PlatformAssetsApi.getCurrentOrganizationEngine();
      const normalized = engine?.engine || engine;
      setOrganizationEngine(normalized || null);
      setError('');
      return normalized || null;
    } catch (engineError) {
      const message = engineError?.message || 'Organization engine unavailable.';
      logger.warn('Organization engine unavailable', { message });
      setOrganizationEngine(null);
      setError(message);
      return null;
    } finally {
      setIsLoading(false);
    }
  }, [authToken, isAuthenticated, organization?.id]);

  useEffect(() => {
    refreshOrganizationEngine();
  }, [refreshOrganizationEngine]);

  const saveOrganizationSettings = useCallback(
    async (updates) => {
      const organizationId = organizationEngine?.organization?.id || organization?.id;
      if (!organizationId) {
        return { ok: false, message: 'Create an organization before saving settings.' };
      }
      try {
        const nextEngine = await PlatformAssetsApi.updateOrganizationSettings(organizationId, updates);
        setOrganizationEngine(nextEngine);
        await refreshPlatformContext();
        setError('');
        return { ok: true, data: nextEngine };
      } catch (settingsError) {
        const message = settingsError?.message || 'Organization settings update failed.';
        setError(message);
        return { ok: false, message };
      }
    },
    [organization?.id, organizationEngine?.organization?.id, refreshPlatformContext]
  );

  const fallbackBranding = platformContext?.organization?.branding || organization?.branding || null;
  const value = useMemo(
    () => ({
      organizationEngine,
      organization: organizationEngine?.organization || organization || null,
      tenant: organizationEngine?.tenant || null,
      branding: organizationEngine?.branding || fallbackBranding,
      subscription: organizationEngine?.subscription || null,
      integrations: organizationEngine?.integrations || [],
      supportedOrganizationTypes: organizationEngine?.supportedOrganizationTypes || [],
      isLoading,
      error,
      refreshOrganizationEngine,
      saveOrganizationSettings,
    }),
    [
      error,
      fallbackBranding,
      isLoading,
      organization,
      organizationEngine,
      refreshOrganizationEngine,
      saveOrganizationSettings,
    ]
  );

  return <OrganizationContext.Provider value={value}>{children}</OrganizationContext.Provider>;
}

export default OrganizationContext;
