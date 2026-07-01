import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { useOrganizationContext } from './OrganizationContext';
import {
  cacheWhiteLabelBranding,
  fetchWhiteLabelBranding,
  getCachedWhiteLabelBranding,
  getRequestedWhiteLabelTenantId,
} from '../services/whiteLabelApi';
import logger from '../utils/logger';

const DEFAULT_BRANDING = Object.freeze({
  displayName: 'CareDroid',
  logoUrl: '',
  faviconUrl: '',
  primaryColor: '',
  accentColor: '',
  theme: 'system',
  loginTitle: '',
  loginSubtitle: '',
  loginBackgroundImageUrl: '',
  dashboardTitle: '',
  dashboardSubtitle: '',
  dashboardLogoUrl: '',
});

const WhiteLabelContext = createContext<any>({
  branding: DEFAULT_BRANDING,
  tenantId: '',
  organizationName: '',
  isWhiteLabeled: false,
});

export const useWhiteLabel = () => useContext(WhiteLabelContext);

function normalizeBranding(input: any = {}) {
  return {
    ...DEFAULT_BRANDING,
    ...Object.fromEntries(
      Object.entries(input || {}).map(([key, value]) => [key, typeof value === 'string' ? value : value || '']),
    ),
  };
}

function setRootVariable(root, name, value) {
  if (value) {
    root.style.setProperty(name, value);
  } else {
    root.style.removeProperty(name);
  }
}

function applyFavicon(faviconUrl) {
  if (typeof document === 'undefined') return;
  let link: any = document.querySelector('link[data-white-label-favicon="true"]');
  if (!faviconUrl) {
    link?.remove();
    return;
  }
  if (!link) {
    link = document.createElement('link');
    link.rel = 'icon';
    link.setAttribute('data-white-label-favicon', 'true');
    document.head.appendChild(link);
  }
  link.href = faviconUrl;
}

export function WhiteLabelProvider({ children }) {
  const { branding: tenantBranding, tenant, organization } = useOrganizationContext();
  const [publicBranding, setPublicBranding] = useState(() => getCachedWhiteLabelBranding());

  useEffect(() => {
    const tenantId = getRequestedWhiteLabelTenantId();
    if (!tenantId) return undefined;
    let cancelled = false;
    fetchWhiteLabelBranding(tenantId)
      .then((payload) => {
        if (cancelled) return;
        setPublicBranding(payload);
        cacheWhiteLabelBranding(payload);
      })
      .catch((error) => {
        logger.warn('White-label branding unavailable', { message: error?.message });
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const value = useMemo(() => {
    const activeBranding = tenantBranding || publicBranding?.branding || publicBranding || DEFAULT_BRANDING;
    const normalized = normalizeBranding(activeBranding);
    const tenantId = tenant?.tenantId || publicBranding?.tenantId || organization?.slug || '';
    const organizationName = organization?.name || publicBranding?.organizationName || normalized.displayName;
    return {
      branding: normalized,
      tenantId,
      organizationName,
      isWhiteLabeled: Boolean(
        normalized.logoUrl ||
          normalized.faviconUrl ||
          normalized.primaryColor ||
          normalized.accentColor ||
          normalized.loginTitle ||
          normalized.dashboardTitle,
      ),
    };
  }, [organization?.name, organization?.slug, publicBranding, tenant?.tenantId, tenantBranding]);

  useEffect(() => {
    if (!tenantBranding) return;
    cacheWhiteLabelBranding({
      tenantId: value.tenantId,
      organizationName: value.organizationName,
      branding: value.branding,
    });
  }, [tenantBranding, value.branding, value.organizationName, value.tenantId]);

  useEffect(() => {
    if (typeof document === 'undefined') return;
    const root = document.documentElement;
    const { branding } = value;
    setRootVariable(root, '--tenant-primary-color', branding.primaryColor);
    setRootVariable(root, '--tenant-accent-color', branding.accentColor);
    setRootVariable(root, '--app-accent-interactive', branding.primaryColor || branding.accentColor);
    setRootVariable(root, '--app-accent', branding.accentColor || branding.primaryColor);
    setRootVariable(
      root,
      '--tenant-login-background-image',
      branding.loginBackgroundImageUrl ? `url(${JSON.stringify(branding.loginBackgroundImageUrl)})` : '',
    );
    root.dataset.whiteLabelTheme = branding.theme || 'system';
    document.title = branding.displayName || 'CareDroid';
    applyFavicon(branding.faviconUrl);
  }, [value]);

  return <WhiteLabelContext.Provider value={value}>{children}</WhiteLabelContext.Provider>;
}

export default WhiteLabelContext;
