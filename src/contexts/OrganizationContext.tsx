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

  // HEAL-245: same race as TenantContext's refreshTenantContext (HEAL-244).
  // This callback is re-triggered whenever organization?.id changes (a user
  // switching organizations); with no staleness guard, a slower in-flight
  // call for the PREVIOUS organization could resolve after a newer call for
  // the new one and overwrite it -- and critically, also push the previous
  // organization's emergencyOs settings into the live, shared
  // useEmergencyStore, leaking one organization's clinical settings into
  // another's session.
  const refreshTokenRef = useRef(0);

  const refreshOrganizationEngine = useCallback(async () => {
    const token = ++refreshTokenRef.current;
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
      if (token !== refreshTokenRef.current) return null;
      const normalized = engine?.engine || engine;
      setOrganizationEngine(normalized || null);
      const emergencyOs = normalized?.settings?.emergencyOs;
      if (emergencyOs && typeof emergencyOs === 'object') {
        useEmergencyStore.getState().saveEmergencySettings(emergencyOs);
      }
      setError('');
      return normalized || null;
    } catch (engineError: any) {
      if (token !== refreshTokenRef.current) return null;
      const message = engineError?.message || 'Organization engine unavailable.';
      logger.warn('Organization engine unavailable', { message });
      setOrganizationEngine(null);
      setError(message);
      return null;
    } finally {
      if (token === refreshTokenRef.current) setIsLoading(false);
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

  // Same staleness race as refreshOrganizationEngine above, but on the write
  // path: OrganizationPages.tsx's "Save organization" button had no
  // double-submit guard, so a rapid double-click fires two overlapping
  // updateOrganizationSettings() calls. Without a token guard here, whichever
  // response lands last wins -- a slower first click's (stale) response could
  // overwrite a faster second click's (current) response, silently reverting
  // organizationEngine to the earlier submitted values.
  const saveSettingsTokenRef = useRef(0);

  const saveOrganizationSettings = useCallback(
    async (updates) => {
      const organizationId = organizationEngine?.organization?.id || organization?.id;
      if (!organizationId) {
        return { ok: false, message: 'Create an organization before saving settings.' };
      }
      const token = ++saveSettingsTokenRef.current;
      try {
        const nextEngine = await PlatformAssetsApi.updateOrganizationSettings(organizationId, updates);
        if (saveSettingsTokenRef.current !== token) {
          return { ok: false, message: 'Superseded by a newer save.' };
        }
        setOrganizationEngine(nextEngine);
        await refreshPlatformContext();
        setError('');
        return { ok: true, data: nextEngine };
      } catch (settingsError: any) {
        if (saveSettingsTokenRef.current !== token) {
          return { ok: false, message: 'Superseded by a newer save.' };
        }
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
