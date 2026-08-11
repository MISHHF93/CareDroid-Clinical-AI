import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { PlatformAssetsApi } from '../services/platformAssetsApi';
import { useEmergencyStore } from '../store/emergencyStore';
import { useUser } from './UserContext';
import { useUserIdentity } from './UserIdentityContext';
import logger from '../utils/logger';

type OrgContextValue = {
  organizationEngine: any;
  organization: any;
  tenant: any;
  branding: any;
  subscription: any;
  integrations: any[];
  supportedOrganizationTypes: any[];
  isLoading: boolean;
  error: string;
  refreshOrganizationEngine: (...args: any[]) => any;
  saveOrganizationSettings: (...args: any[]) => any;
};

const OrganizationContext = createContext<OrgContextValue>({
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
  const [organizationEngine, setOrganizationEngine] = useState<any>(null);
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
      const emergencyOs = normalized?.settings?.emergencyOs;
      if (emergencyOs && typeof emergencyOs === 'object') {
        useEmergencyStore.getState().saveEmergencySettings(emergencyOs);
      }
      setError('');
      return normalized || null;
    } catch (engineError: any) {
      const message = engineError?.message || 'Organization engine unavailable.';
      logger.warn('Organization engine unavailable', { message });
      setOrganizationEngine(null);
      setError(message);
      return null;
    } finally {
      setIsLoading(false);
    }
  }, [authToken, isAuthenticated, organization?.id]);

  // See UserIdentityContext's refreshIdentity comment for the full explanation of this
  // pattern: depending on [refreshOrganizationEngine] re-ran this effect (re-fetching the
  // organization engine, including a real useEmergencyStore write when emergencyOs
  // settings are present) every time that callback's own dependencies got a new
  // reference. Depend on the real trigger signals directly.
  // Contributed to MB-P0-4/HEAL-082's app-wide render churn.
  const refreshOrganizationEngineRef = useRef(refreshOrganizationEngine);
  useEffect(() => {
    refreshOrganizationEngineRef.current = refreshOrganizationEngine;
  }, [refreshOrganizationEngine]);
  useEffect(() => {
    refreshOrganizationEngineRef.current();
  }, [authToken, isAuthenticated, organization?.id]);

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
      } catch (settingsError: any) {
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
