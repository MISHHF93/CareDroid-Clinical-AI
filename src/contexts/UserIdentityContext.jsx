import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { useTheme } from './ThemeContext';
import { useToolPreferences } from './ToolPreferencesContext';
import { useUser } from './UserContext';
import { useTenantContext } from './TenantContext';
import { useWorkspace } from './WorkspaceContext';
import { UserIdentityApi } from '../services/userIdentityApi';
import { PlatformAssetsApi } from '../services/platformAssetsApi';
import { readLocalClientProfile } from '../config/workspace.config';
import { fetchMemoryFabricContext, LOCAL_MEMORY_FABRIC_CONTEXT } from '../services/memoryApi';
import { setPlatformEntitlementContext } from '../data/assetEntitlements';
import logger from '../utils/logger';
import { enrichDemoIdentityFallback } from '../config/demoPersonaModel';

const BACKEND_TO_LOCAL_WORKSPACE = {
  personal: 'emergency',
  hospital: 'operations',
  emergency: 'emergency',
  icu: 'icu',
  cardiology: 'cardiology',
  laboratory: 'laboratory',
  pharmacy: 'pharmacy',
  operations: 'operations',
  fleet: 'fleet',
  'medical-iot': 'medical-iot',
  education: 'education',
  research: 'research',
  governance: 'governance',
  admin: 'governance',
};

const DEFAULT_SAAS_PROFILE = Object.freeze({
  organizationType: 'hospital',
  role: 'student',
  defaultWorkspace: 'emergency',
  allowedWorkspaces: ['emergency', 'icu', 'cardiology', 'laboratory', 'operations'],
  permissions: ['VIEW_DASHBOARD', 'USE_ASSISTANT', 'VIEW_TOOLS'],
  subscriptionEntitlements: ['core-platform'],
  enabledAssetPacks: ['core-platform'],
  pinnedAssets: [],
  hiddenAssets: [],
  recentAssets: [],
  preferredAIStyle: 'concise',
  themePreference: 'light',
  density: 'standard',
  compactMode: false,
  onboardingStatus: 'complete',
});

const UserIdentityContext = createContext({
  operationalProfile: null,
  account: null,
  preferences: null,
  workspaceState: null,
  activeWorkspace: null,
  workspaces: [],
  activity: null,
  aiPersonalization: null,
  security: null,
  audit: null,
  saasProfile: DEFAULT_SAAS_PROFILE,
  effectiveProfile: null,
  accessSummary: null,
  isLoading: false,
  error: '',
  refreshIdentity: () => {},
  switchWorkspace: () => {},
  savePreferences: () => {},
  updateProfile: () => {},
  recordActivity: () => {},
  hasEffectivePermission: () => false,
  platformContext: null,
  refreshPlatformContext: () => {},
  memoryFabricContext: LOCAL_MEMORY_FABRIC_CONTEXT,
  refreshMemoryFabricContext: () => {},
  organization: null,
  roleProfile: null,
  entitledAssetIds: [],
  entitledPackIds: [],
  allowedWorkspaces: [],
  enabledAssetPacks: [],
  pinnedAssets: [],
  hiddenAssets: [],
  recentAssets: [],
});

export const useUserIdentity = () => {
  const context = useContext(UserIdentityContext);
  if (!context) {
    throw new Error('useUserIdentity must be used within UserIdentityProvider');
  }
  return context;
};

function buildFallbackProfile({ user, localWorkspaces, activeWorkspaceId, themePreference, toolPrefs }) {
  const clientProfile = readLocalClientProfile();
  const profile = user?.profile || {};
  const workspaces = (localWorkspaces || []).map((workspace) => ({
    id: workspace.id,
    type: workspace.id === 'fleet' ? 'fleet' : workspace.id === 'hospital-operations' ? 'hospital' : 'personal',
    name: workspace.name,
    branding: { displayName: workspace.name },
    settings: {
      defaultDashboard: 'command',
      enabledToolIds: workspace.toolIds || [],
      enabledModules: ['dashboard', 'tools'],
    },
  }));
  const activeWorkspace = workspaces.find((workspace) => workspace.id === activeWorkspaceId) || workspaces[0];

  const saasProfile = {
    ...DEFAULT_SAAS_PROFILE,
    userId: user?.id || '',
    organizationId: clientProfile?.organizationId || profile.organizationId || null,
    organizationType: clientProfile?.organizationType || profile.organizationType || DEFAULT_SAAS_PROFILE.organizationType,
    displayName: user?.fullName || user?.name || profile.fullName || user?.email || 'CareDroid User',
    email: user?.email || '',
    role: profile.roleProfileId || user?.role || DEFAULT_SAAS_PROFILE.role,
    specialty: profile.specialty || '',
    department: profile.department || '',
    defaultWorkspace:
      clientProfile?.defaultWorkspace || activeWorkspace?.id || activeWorkspaceId || DEFAULT_SAAS_PROFILE.defaultWorkspace,
    allowedWorkspaces: clientProfile?.enabledWorkspaces || workspaces.map((workspace) => workspace.id),
    subscriptionEntitlements: clientProfile?.enabledAssetPacks || DEFAULT_SAAS_PROFILE.subscriptionEntitlements,
    enabledAssetPacks: clientProfile?.enabledAssetPacks || DEFAULT_SAAS_PROFILE.enabledAssetPacks,
    pinnedAssets: toolPrefs.pinned || [],
    hiddenAssets: toolPrefs.hiddenTools || [],
    recentAssets: toolPrefs.recentTools || [],
    themePreference: themePreference || DEFAULT_SAAS_PROFILE.themePreference,
    density: DEFAULT_SAAS_PROFILE.density,
    compactMode: false,
  };

  return enrichDemoIdentityFallback(user, {
    userId: user?.id || '',
    saasProfile,
    account: {
      userId: user?.id || '',
      displayName: user?.fullName || user?.name || profile.fullName || user?.email || 'CareDroid User',
      email: user?.email || '',
      avatarUrl: profile.avatarUrl,
      profession: profile.profession || 'Clinician',
      specialty: profile.specialty,
      organization: user?.institution || profile.institution,
      department: profile.department,
      role: user?.role || 'student',
      country: profile.country,
      timezone: profile.timezone,
      language: profile.languagePreference,
      verified: Boolean(profile.verified),
      trustScore: profile.trustScore || 0,
    },
    professional: {
      credentials: [],
      certifications: [],
      specialties: profile.specialty ? [profile.specialty] : [],
      experienceLevel: 'mid',
      clinicalInterests: [],
    },
    preferences: {
      theme: themePreference || 'light',
      language: profile.languagePreference || 'en',
      defaultDashboard: 'command',
      density: DEFAULT_SAAS_PROFILE.density,
      compactMode: false,
      accessibility: { reduceMotion: false, highContrast: false, fontScale: 'default' },
      calculatorPreferences: { pinnedCalculatorIds: [], defaultUnits: 'metric', rememberInputs: false },
      toolPreferences: {
        favoriteToolIds: toolPrefs.favorites,
        pinnedToolIds: toolPrefs.pinned,
        recentToolIds: toolPrefs.recentTools,
        hiddenToolIds: toolPrefs.hiddenTools,
        profileSettings: toolPrefs.profileSettings,
      },
      aiAssistantPreferences: {
        responseStyle: 'concise',
        citationLevel: 'standard',
        safetyTone: 'standard',
      },
      notificationSettings: {},
    },
    aiPersonalization: {
      preferredBehavior: 'clinical_copilot',
      savedPrompts: [],
      recentPrompts: [],
      suggestedTools: ['calculators', 'drug-check', 'lab-interp'],
      recommendedWorkflows: [],
    },
    workspace: {
      activeWorkspaceId: activeWorkspace?.id || 'all',
      recentWorkspaceIds: activeWorkspace ? [activeWorkspace.id] : [],
      workspaces,
      activeWorkspace,
      memberships: [],
      effectivePermissions: [],
      linkedTeams: [],
    },
    activity: {
      recentCalculators: [],
      recentTools: (toolPrefs.recentTools || []).map((toolId) => ({
        id: toolId,
        label: toolId,
        metadata: { toolId },
        occurredAt: new Date().toISOString(),
      })),
      recentAiChats: [],
      recentFleetActivity: [],
      recentIotActivity: [],
    },
    security: {
      emailVerified: Boolean(user?.emailVerified),
      role: user?.role || 'student',
      mfaEnabled: false,
      lastLoginAt: user?.lastLoginAt,
    },
    audit: { recentEvents: [] },
  });
}

function normalizeSaasProfile(profile, workspaceState) {
  const account = profile?.account || {};
  const preferences = profile?.preferences || {};
  const toolPreferences = preferences.toolPreferences || {};
  const saasPreferences = toolPreferences.saasProfile || {};
  const activeWorkspace = workspaceState?.activeWorkspace;
  const requestedDensity =
    profile?.saasProfile?.density ||
    preferences.density ||
    (profile?.saasProfile?.compactMode ?? preferences.compactMode ? 'compact' : 'standard');
  const density = requestedDensity === 'compact' ? 'compact' : 'standard';
  return {
    ...DEFAULT_SAAS_PROFILE,
    ...saasPreferences,
    ...(profile?.saasProfile || {}),
    userId: profile?.userId || account.userId || '',
    organizationId: profile?.saasProfile?.organizationId || account.organizationId || null,
    displayName: profile?.saasProfile?.displayName || account.displayName || 'CareDroid User',
    email: profile?.saasProfile?.email || account.email || '',
    role: profile?.saasProfile?.role || account.saasRole || account.role || DEFAULT_SAAS_PROFILE.role,
    specialty: profile?.saasProfile?.specialty || account.specialty || '',
    department: profile?.saasProfile?.department || account.department || '',
    defaultWorkspace:
      profile?.saasProfile?.defaultWorkspace ||
      saasPreferences.defaultWorkspace ||
      activeWorkspace?.workspaceKey ||
      activeWorkspace?.type ||
      DEFAULT_SAAS_PROFILE.defaultWorkspace,
    allowedWorkspaces:
      profile?.saasProfile?.allowedWorkspaces ||
      saasPreferences.allowedWorkspaces ||
      (workspaceState?.workspaces || []).map((workspace) => workspace.workspaceKey || workspace.type || workspace.id),
    pinnedAssets:
      profile?.saasProfile?.pinnedAssets ||
      toolPreferences.pinnedAssetIds ||
      toolPreferences.pinnedToolIds ||
      [],
    hiddenAssets:
      profile?.saasProfile?.hiddenAssets ||
      toolPreferences.hiddenAssetIds ||
      toolPreferences.hiddenToolIds ||
      [],
    recentAssets:
      profile?.saasProfile?.recentAssets ||
      toolPreferences.recentAssetIds ||
      toolPreferences.recentToolIds ||
      [],
    preferredAIStyle:
      profile?.saasProfile?.preferredAIStyle ||
      preferences.aiAssistantPreferences?.responseStyle ||
      DEFAULT_SAAS_PROFILE.preferredAIStyle,
    themePreference: profile?.saasProfile?.themePreference || preferences.theme || DEFAULT_SAAS_PROFILE.themePreference,
    density,
    compactMode: density === 'compact',
  };
}

export const UserIdentityProvider = ({ children }) => {
  const { user, isAuthenticated, authToken } = useUser();
  const { refreshTenantContext } = useTenantContext();
  const { workspaces: localWorkspaces, activeWorkspaceId, setActiveWorkspaceId } = useWorkspace();
  const toolPrefs = useToolPreferences();
  const { preference: themePreference } = useTheme();
  const [operationalProfile, setOperationalProfile] = useState(null);
  const [platformContext, setPlatformContext] = useState(null);
  const [memoryFabricContext, setMemoryFabricContext] = useState(LOCAL_MEMORY_FABRIC_CONTEXT);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  const fallbackProfile = useMemo(
    () =>
      buildFallbackProfile({
        user,
        localWorkspaces,
        activeWorkspaceId,
        themePreference,
        toolPrefs,
      }),
    [activeWorkspaceId, localWorkspaces, themePreference, toolPrefs, user],
  );

  const normalizeProfile = useCallback((profile) => {
    if (!profile) return null;
    const workspaceState = profile.workspace || {};
    const workspaces = workspaceState.workspaces || [];
    const activeWorkspace =
      workspaceState.activeWorkspace ||
      workspaces.find((workspace) => workspace.id === workspaceState.activeWorkspaceId) ||
      workspaces[0];

    const normalized = {
      ...profile,
      workspace: {
        ...workspaceState,
        workspaces,
        activeWorkspace,
        activeWorkspaceId: activeWorkspace?.id || workspaceState.activeWorkspaceId,
      },
    };
    return {
      ...normalized,
      saasProfile: normalizeSaasProfile(normalized, normalized.workspace),
    };
  }, []);

  const refreshPlatformContext = useCallback(async () => {
    if (!isAuthenticated && !authToken) {
      setPlatformContext(null);
      setPlatformEntitlementContext(null);
      return null;
    }
    try {
      const ctx = await PlatformAssetsApi.getContext();
      setPlatformContext(ctx);
      setPlatformEntitlementContext(ctx);
      return ctx;
    } catch (platformError) {
      logger.warn('Platform context unavailable', { message: platformError?.message });
      setPlatformContext(null);
      setPlatformEntitlementContext(null);
      return null;
    }
  }, [authToken, isAuthenticated]);

  const refreshMemoryFabricContext = useCallback(async () => {
    if (!isAuthenticated && !authToken) {
      setMemoryFabricContext(LOCAL_MEMORY_FABRIC_CONTEXT);
      return LOCAL_MEMORY_FABRIC_CONTEXT;
    }
    const result = await fetchMemoryFabricContext();
    if (!result.ok) {
      logger.warn('Memory fabric context unavailable', { message: result.message });
      setMemoryFabricContext(LOCAL_MEMORY_FABRIC_CONTEXT);
      return LOCAL_MEMORY_FABRIC_CONTEXT;
    }
    setMemoryFabricContext(result);
    return result;
  }, [authToken, isAuthenticated]);

  const refreshIdentity = useCallback(async () => {
    if (!isAuthenticated && !authToken) {
      setOperationalProfile(null);
      setPlatformContext(null);
      setPlatformEntitlementContext(null);
      setMemoryFabricContext(LOCAL_MEMORY_FABRIC_CONTEXT);
      setError('');
      return null;
    }
    setIsLoading(true);
    const [result] = await Promise.all([
      UserIdentityApi.fetchOperationalProfile(),
      refreshPlatformContext(),
      refreshMemoryFabricContext(),
    ]);
    setIsLoading(false);
    if (!result.ok) {
      logger.warn('Operational profile backend unavailable; using local identity fallback', {
        message: result.message,
      });
      setError(result.message);
      setOperationalProfile(fallbackProfile);
      return fallbackProfile;
    }
    const normalized = normalizeProfile(result.data);
    setOperationalProfile(normalized);
    setError('');
    return normalized;
  }, [
    authToken,
    fallbackProfile,
    isAuthenticated,
    normalizeProfile,
    refreshMemoryFabricContext,
    refreshPlatformContext,
  ]);

  useEffect(() => {
    refreshIdentity();
  }, [refreshIdentity]);

  const profile = operationalProfile || fallbackProfile;
  const workspaceState = profile?.workspace || {};
  const activeWorkspace = workspaceState.activeWorkspace;
  const saasProfile = profile?.saasProfile || normalizeSaasProfile(profile, workspaceState);
  const enrichedPlatformContext = useMemo(
    () =>
      platformContext
        ? {
            ...platformContext,
            saasProfile,
            preferences: profile?.preferences,
            pinnedAssetIds: saasProfile.pinnedAssets,
            hiddenAssetIds: saasProfile.hiddenAssets,
            recentAssetIds: saasProfile.recentAssets,
            enabledAssetPacks: saasProfile.enabledAssetPacks,
          }
        : null,
    [platformContext, profile?.preferences, saasProfile],
  );

  useEffect(() => {
    const localWorkspaceId = BACKEND_TO_LOCAL_WORKSPACE[activeWorkspace?.type];
    if (localWorkspaceId && localWorkspaceId !== activeWorkspaceId) {
      setActiveWorkspaceId(localWorkspaceId);
    }
  }, [activeWorkspace?.type, activeWorkspaceId, setActiveWorkspaceId]);

  const switchWorkspace = useCallback(
    async (workspaceId) => {
      if (!workspaceId) return { ok: false, message: 'Workspace is required.' };
      const result = await UserIdentityApi.switchWorkspace(workspaceId);
      if (!result.ok) {
        setError(result.message);
        return result;
      }
      const normalized = normalizeProfile(result.data);
      setOperationalProfile((current) => ({
        ...(current || fallbackProfile),
        workspace: normalized.workspace,
      }));
      await refreshTenantContext();
      setError('');
      return { ok: true, data: normalized.workspace, message: '' };
    },
    [fallbackProfile, normalizeProfile, refreshTenantContext],
  );

  const savePreferences = useCallback(
    async (updates) => {
      if (updates?.theme) updates.theme = 'light';
      const result = await UserIdentityApi.updatePreferences(updates);
      if (!result.ok) {
        setError(result.message);
        return result;
      }
      setOperationalProfile((current) => ({
        ...(current || fallbackProfile),
        preferences: result.data,
      }));
      setError('');
      return result;
    },
    [fallbackProfile],
  );

  const updateProfile = useCallback(
    async (updates) => {
      const result = await UserIdentityApi.updateOperationalProfile(updates);
      if (!result.ok) {
        setError(result.message);
        return result;
      }
      setOperationalProfile(normalizeProfile(result.data));
      setError('');
      return result;
    },
    [normalizeProfile],
  );

  const recordActivity = useCallback(async (activity) => {
    const result = await UserIdentityApi.recordActivity({
      workspaceId: workspaceState.activeWorkspaceId,
      ...activity,
    });
    if (!result.ok) {
      logger.warn('Failed to record safe user activity', { message: result.message });
    }
    return result;
  }, [workspaceState.activeWorkspaceId]);

  const hasEffectivePermission = useCallback(
    (permission) => Boolean(workspaceState.effectivePermissions?.includes(permission)),
    [workspaceState.effectivePermissions],
  );

  const value = useMemo(
    () => ({
      operationalProfile: profile,
      account: profile?.account || null,
      preferences: profile?.preferences || null,
      workspaceState,
      activeWorkspace,
      workspaces: workspaceState.workspaces || [],
      activity: profile?.activity || null,
      aiPersonalization: profile?.aiPersonalization || null,
      security: profile?.security || null,
      audit: profile?.audit || null,
      saasProfile,
      effectiveProfile: profile?.effectiveProfile || null,
      accessSummary: profile?.accessSummary || null,
      isLoading,
      error,
      refreshIdentity,
      switchWorkspace,
      savePreferences,
      updateProfile,
      recordActivity,
      hasEffectivePermission,
      platformContext: enrichedPlatformContext,
      refreshPlatformContext,
      memoryFabricContext,
      refreshMemoryFabricContext,
      organization: enrichedPlatformContext?.organization || null,
      roleProfile: enrichedPlatformContext?.roleProfile || null,
      entitledAssetIds: enrichedPlatformContext?.entitledAssetIds || [],
      entitledPackIds: enrichedPlatformContext?.entitledPackIds || [],
      allowedWorkspaces: saasProfile.allowedWorkspaces || [],
      enabledAssetPacks: saasProfile.enabledAssetPacks || [],
      pinnedAssets: saasProfile.pinnedAssets || [],
      hiddenAssets: saasProfile.hiddenAssets || [],
      recentAssets: saasProfile.recentAssets || [],
    }),
    [
      activeWorkspace,
      error,
      hasEffectivePermission,
      isLoading,
      memoryFabricContext,
      enrichedPlatformContext,
      profile,
      recordActivity,
      refreshIdentity,
      refreshMemoryFabricContext,
      refreshPlatformContext,
      savePreferences,
      saasProfile,
      switchWorkspace,
      updateProfile,
      workspaceState,
    ],
  );

  return <UserIdentityContext.Provider value={value}>{children}</UserIdentityContext.Provider>;
};

export default UserIdentityContext;
