import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { useTheme } from './ThemeContext';
import { useToolPreferences } from './ToolPreferencesContext';
import { useUser } from './UserContext';
import { useTenantContext } from './TenantContext';
import { useWorkspace } from './WorkspaceContext';
import { UserIdentityApi } from '../services/userIdentityApi';
import { PlatformAssetsApi } from '../services/platformAssetsApi';
import { setPlatformEntitlementContext } from '../data/assetEntitlements';
import logger from '../utils/logger';

const BACKEND_TO_LOCAL_WORKSPACE = {
  personal: 'emergency',
  hospital: 'operations',
  emergency: 'emergency',
  icu: 'icu',
  cardiology: 'cardiology',
  laboratory: 'laboratory',
  operations: 'operations',
  fleet: 'fleet',
  'medical-iot': 'medical-iot',
  education: 'education',
  research: 'research',
  governance: 'governance',
  admin: 'governance',
};

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
  organization: null,
  roleProfile: null,
  entitledAssetIds: [],
  entitledPackIds: [],
});

export const useUserIdentity = () => {
  const context = useContext(UserIdentityContext);
  if (!context) {
    throw new Error('useUserIdentity must be used within UserIdentityProvider');
  }
  return context;
};

function buildFallbackProfile({ user, localWorkspaces, activeWorkspaceId, themePreference, toolPrefs }) {
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

  return {
    userId: user?.id || '',
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
      theme: themePreference || 'system',
      language: profile.languagePreference || 'en',
      defaultDashboard: 'command',
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
  };
}

export const UserIdentityProvider = ({ children }) => {
  const { user, isAuthenticated, authToken } = useUser();
  const { refreshTenantContext } = useTenantContext();
  const { workspaces: localWorkspaces, activeWorkspaceId, setActiveWorkspaceId } = useWorkspace();
  const toolPrefs = useToolPreferences();
  const { preference: themePreference, setPreference } = useTheme();
  const [operationalProfile, setOperationalProfile] = useState(null);
  const [platformContext, setPlatformContext] = useState(null);
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

    return {
      ...profile,
      workspace: {
        ...workspaceState,
        workspaces,
        activeWorkspace,
        activeWorkspaceId: activeWorkspace?.id || workspaceState.activeWorkspaceId,
      },
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

  const refreshIdentity = useCallback(async () => {
    if (!isAuthenticated && !authToken) {
      setOperationalProfile(null);
      setPlatformContext(null);
      setPlatformEntitlementContext(null);
      setError('');
      return null;
    }
    setIsLoading(true);
    const [result] = await Promise.all([
      UserIdentityApi.fetchOperationalProfile(),
      refreshPlatformContext(),
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
  }, [authToken, fallbackProfile, isAuthenticated, normalizeProfile, refreshPlatformContext]);

  useEffect(() => {
    refreshIdentity();
  }, [refreshIdentity]);

  const profile = operationalProfile || fallbackProfile;
  const workspaceState = profile?.workspace || {};
  const activeWorkspace = workspaceState.activeWorkspace;

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
      if (updates?.theme) setPreference(updates.theme);
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
    [fallbackProfile, setPreference],
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
      isLoading,
      error,
      refreshIdentity,
      switchWorkspace,
      savePreferences,
      updateProfile,
      recordActivity,
      hasEffectivePermission,
      platformContext,
      refreshPlatformContext,
      organization: platformContext?.organization || null,
      roleProfile: platformContext?.roleProfile || null,
      entitledAssetIds: platformContext?.entitledAssetIds || [],
      entitledPackIds: platformContext?.entitledPackIds || [],
    }),
    [
      activeWorkspace,
      error,
      hasEffectivePermission,
      isLoading,
      platformContext,
      profile,
      recordActivity,
      refreshIdentity,
      refreshPlatformContext,
      savePreferences,
      switchWorkspace,
      updateProfile,
      workspaceState,
    ],
  );

  return <UserIdentityContext.Provider value={value}>{children}</UserIdentityContext.Provider>;
};

export default UserIdentityContext;
