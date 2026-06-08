import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import {
  CARE_WORKSPACES,
  DEFAULT_CARE_WORKSPACE_ID,
  filterWorkspacesForClient,
  readLocalClientProfile,
} from '../config/workspace.config';
import { mergeWorkspacesWithRegistry } from '../data/sidebarToolPresentation';
import { getUserFacingToolRegistryProjection } from '../data/toolInventory';
import { apiFetch, getApiErrorMessage, parseApiResponse } from '../services/apiClient';
import logger from '../utils/logger';
import { useUser } from './UserContext';

const STORAGE_KEY = 'careDroid.workspaces.v1';

function workspaceKeyFromContext(context) {
  return (
    context?.workspace?.workspaceKey ||
    context?.workspace?.settings?.workspaceKey ||
    context?.workspace?.type ||
    context?.workspace?.id ||
    ''
  );
}

function workspaceContextMatchesActive(context, activeWorkspaceId) {
  if (!context) return false;
  const contextKey = workspaceKeyFromContext(context);
  return Boolean(contextKey && activeWorkspaceId && contextKey === activeWorkspaceId);
}

const defaultWorkspaces = (clientProfile = null, role = '') => {
  const userFacingTools = getUserFacingToolRegistryProjection();
  const byCategory = userFacingTools.reduce((acc, tool) => {
    acc[tool.category] = acc[tool.category] || [];
    acc[tool.category].push(tool.id);
    return acc;
  }, {});

  const enabledWorkspaces = filterWorkspacesForClient({
    workspaces: CARE_WORKSPACES,
    clientProfile,
    organizationType: clientProfile?.organizationType,
    subscriptionPlan: clientProfile?.subscriptionPlan,
    role,
    userWorkspaceIds: clientProfile?.userWorkspaceIds,
  });

  return enabledWorkspaces.map((workspace) => ({
    id: workspace.id,
    workspaceKey: workspace.id,
    name: workspace.label,
    path: workspace.path,
    assistantContext: workspace.aiContext,
    shortcuts: workspace.routeIds || [],
    toolIds: workspace.toolIds?.filter(Boolean) || byCategory[workspace.label] || [],
    workspaceProfile: workspace,
    defaultDashboardWidgets: workspace.defaultDashboardWidgets || [],
    defaultFilters: workspace.defaultFilters || {},
    restrictedAssets: workspace.restrictedAssets || [],
  }));
};

const WorkspaceContext = createContext({
  workspaces: [],
  activeWorkspaceId: DEFAULT_CARE_WORKSPACE_ID,
  activeWorkspace: null,
  workspaceContext: null,
  visibleAssetIds: [],
  recommendations: [],
  assistantContext: '',
  shortcuts: [],
  workspaceProfile: null,
  defaultDashboardWidgets: [],
  defaultFilters: {},
  restrictedAssets: [],
  recommendedAIAgents: [],
  recommendedAssetPacks: [],
  clientProfile: null,
  workspaceEmptyState: '',
  isLoading: false,
  error: '',
  setActiveWorkspaceId: () => {},
  switchWorkspace: () => {},
  refreshWorkspaceContext: () => {},
  addWorkspace: () => {},
  updateWorkspace: () => {},
  removeWorkspace: () => {},
});

export const useWorkspace = () => {
  const context = useContext(WorkspaceContext);
  if (!context) {
    throw new Error('useWorkspace must be used within WorkspaceProvider');
  }
  return context;
};

export const WorkspaceProvider = ({ children }) => {
  const { authToken, isAuthenticated, isLoading: isUserLoading, user } = useUser();
  const [clientProfile, setClientProfile] = useState(() => readLocalClientProfile());
  const [workspaceContext, setWorkspaceContext] = useState(null);
  const [workspaces, setWorkspaces] = useState(() => defaultWorkspaces(readLocalClientProfile(), user?.role));
  const [activeWorkspaceId, setActiveWorkspaceId] = useState(DEFAULT_CARE_WORKSPACE_ID);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed.workspaces) && parsed.workspaces.length > 0) {
          const defaults = defaultWorkspaces(clientProfile, user?.role);
          setWorkspaces(mergeWorkspacesWithRegistry(parsed.workspaces, defaults));
          const nextActive = parsed.activeWorkspaceId || clientProfile?.defaultWorkspace || defaults[0]?.id || DEFAULT_CARE_WORKSPACE_ID;
          setActiveWorkspaceId(nextActive);
        }
      }
    } catch (error) {
      logger.warn('Failed to load workspaces', { error });
    }
  }, [clientProfile, user?.role]);

  useEffect(() => {
    try {
      localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify({ workspaces, activeWorkspaceId })
      );
    } catch (error) {
      logger.warn('Failed to persist workspaces', { error });
    }
  }, [workspaces, activeWorkspaceId]);

  useEffect(() => {
    const applyClientProfile = (profile) => {
      const nextWorkspaces = defaultWorkspaces(profile, user?.role);
      setClientProfile(profile);
      setWorkspaces(nextWorkspaces);
      setActiveWorkspaceId((current) =>
        nextWorkspaces.some((workspace) => workspace.id === current)
          ? current
          : profile?.defaultWorkspace || nextWorkspaces[0]?.id || DEFAULT_CARE_WORKSPACE_ID
      );
    };

    const handleClientProfileChanged = (event) => applyClientProfile(event.detail || readLocalClientProfile());
    window.addEventListener('careDroid:clientProfileChanged', handleClientProfileChanged);

    const nextProfile = readLocalClientProfile();
    if (nextProfile && JSON.stringify(nextProfile) !== JSON.stringify(clientProfile)) {
      applyClientProfile(nextProfile);
    }

    return () => window.removeEventListener('careDroid:clientProfileChanged', handleClientProfileChanged);
  }, [clientProfile, user?.role]);

  const applyBackendContext = useCallback((context) => {
    if (!context?.workspace) return null;
    const backendWorkspaces = context.workspaceState?.workspaces || [];
    const fallbackById = Object.fromEntries(defaultWorkspaces(null, user?.role).map((workspace) => [workspace.id, workspace]));
    const normalizedWorkspaces = backendWorkspaces.map((workspace) => {
      const workspaceKey = workspace.workspaceKey || workspace.settings?.workspaceKey || workspace.type;
      const fallback = fallbackById[workspaceKey] || {};
      return {
        ...fallback,
        ...workspace,
        id: workspaceKey,
        workspaceKey,
        backendWorkspaceId: workspace.id,
        name: workspace.displayName || workspace.label || workspace.branding?.displayName || workspace.name || fallback.name,
        path: `/workspace/${workspaceKey}`,
        assistantContext:
          workspace.assistantContext || workspace.settings?.assistantContext || fallback.assistantContext,
        shortcuts: workspace.settings?.shortcuts || fallback.shortcuts || [],
        toolIds: workspace.settings?.enabledToolIds || fallback.toolIds || [],
        workspaceProfile: workspace.workspaceProfile || workspace.settings?.workspaceProfile || null,
        defaultDashboardWidgets: workspace.defaultDashboardWidgets || workspace.settings?.workspaceProfile?.defaultDashboardWidgets || [],
        defaultFilters: workspace.defaultFilters || workspace.settings?.workspaceProfile?.defaultFilters || {},
        restrictedAssets: workspace.restrictedAssets || workspace.settings?.workspaceProfile?.restrictedAssets || [],
      };
    });
    const merged = mergeWorkspacesWithRegistry(normalizedWorkspaces, defaultWorkspaces());
    const activeWorkspaceId =
      context.workspace.workspaceKey || context.workspace.settings?.workspaceKey || context.workspace.type;
    setWorkspaces(merged);
    setActiveWorkspaceId(activeWorkspaceId || DEFAULT_CARE_WORKSPACE_ID);
    setWorkspaceContext(context);
    return context;
  }, [user?.role]);

  const refreshWorkspaceContext = useCallback(async () => {
    if (isUserLoading) return null;
    if (!isAuthenticated && !authToken) {
      setWorkspaceContext(null);
      setError('');
      return null;
    }
    setIsLoading(true);
    try {
      const response = await apiFetch('/api/workspaces/context');
      const data = await parseApiResponse(response, { fallback: {} });
      if (!response.ok) {
        throw new Error(data?.message || getApiErrorMessage(null, response));
      }
      setError('');
      return applyBackendContext(data);
    } catch (contextError) {
      const message = contextError?.message || 'Workspace context unavailable.';
      logger.warn('Workspace context unavailable; using local fallback', { message });
      setWorkspaceContext(null);
      setError(message);
      return null;
    } finally {
      setIsLoading(false);
    }
  }, [applyBackendContext, authToken, isAuthenticated, isUserLoading]);

  useEffect(() => {
    refreshWorkspaceContext();
  }, [refreshWorkspaceContext]);

  const addWorkspace = (workspace) => {
    setWorkspaces((prev) => [...prev, workspace]);
  };

  const updateWorkspace = (workspaceId, updates) => {
    setWorkspaces((prev) =>
      prev.map((workspace) =>
        workspace.id === workspaceId ? { ...workspace, ...updates } : workspace
      )
    );
  };

  const removeWorkspace = (workspaceId) => {
    setWorkspaces((prev) => prev.filter((workspace) => workspace.id !== workspaceId));
    if (workspaceId === activeWorkspaceId) {
      setActiveWorkspaceId(DEFAULT_CARE_WORKSPACE_ID);
    }
  };

  const switchWorkspace = useCallback(
    async (workspaceId) => {
      const target = workspaces.find(
        (workspace) =>
          workspace.id === workspaceId ||
          workspace.workspaceKey === workspaceId ||
          workspace.backendWorkspaceId === workspaceId
      );
      if (!target) {
        setActiveWorkspaceId(workspaceId || DEFAULT_CARE_WORKSPACE_ID);
        setWorkspaceContext(null);
        return { ok: true, data: null, source: 'local' };
      }

      const targetWorkspaceId = target.workspaceKey || target.id;
      setActiveWorkspaceId(targetWorkspaceId);
      setWorkspaceContext((current) =>
        workspaceContextMatchesActive(current, targetWorkspaceId) ? current : null
      );
      if (!target.backendWorkspaceId || (!isAuthenticated && !authToken)) {
        return { ok: true, data: null, source: 'local' };
      }

      try {
        const response = await apiFetch('/api/workspaces/active', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ workspaceId: target.backendWorkspaceId }),
        });
        const data = await parseApiResponse(response, { fallback: {} });
        if (!response.ok) {
          throw new Error(data?.message || getApiErrorMessage(null, response));
        }
        const context = await refreshWorkspaceContext();
        setError('');
        return { ok: true, data: context || data, source: 'backend' };
      } catch (switchError) {
        const message = switchError?.message || 'Workspace switch failed.';
        logger.warn('Workspace switch failed; keeping local workspace selection', { message });
        setError(message);
        return { ok: false, message };
      }
    },
    [authToken, isAuthenticated, refreshWorkspaceContext, workspaces]
  );

  const activeWorkspace = useMemo(
    () => workspaces.find((workspace) => workspace.id === activeWorkspaceId) || workspaces[0] || null,
    [activeWorkspaceId, workspaces]
  );
  const activeWorkspaceContext = useMemo(
    () => (workspaceContextMatchesActive(workspaceContext, activeWorkspaceId) ? workspaceContext : null),
    [activeWorkspaceId, workspaceContext]
  );

  const value = useMemo(
    () => ({
      workspaces,
      activeWorkspaceId,
      activeWorkspace,
      workspaceContext: activeWorkspaceContext,
      visibleAssetIds: activeWorkspaceContext?.visibleAssetIds || activeWorkspace?.toolIds || [],
      recommendations: activeWorkspaceContext?.recommendations || [],
      assistantContext: activeWorkspaceContext?.assistantContext || activeWorkspace?.assistantContext || '',
      shortcuts: activeWorkspaceContext?.shortcuts || activeWorkspace?.shortcuts || [],
      workspaceProfile: activeWorkspaceContext?.workspace?.workspaceProfile || activeWorkspace?.workspaceProfile || null,
      defaultDashboardWidgets:
        activeWorkspaceContext?.defaultDashboardWidgets || activeWorkspace?.defaultDashboardWidgets || [],
      defaultFilters: activeWorkspaceContext?.defaultFilters || activeWorkspace?.defaultFilters || {},
      restrictedAssets: activeWorkspaceContext?.restrictedAssets || activeWorkspace?.restrictedAssets || [],
      recommendedAIAgents: activeWorkspaceContext?.recommendedAIAgents || activeWorkspace?.workspaceProfile?.defaultAIAgents || [],
      recommendedAssetPacks: activeWorkspaceContext?.recommendedAssetPacks || activeWorkspace?.workspaceProfile?.defaultAssetPacks || [],
      clientProfile,
      workspaceEmptyState: workspaces.length
        ? ''
        : 'No workspaces are enabled for this organization or role. A safe default workspace is shown.',
      isLoading,
      error,
      setActiveWorkspaceId,
      switchWorkspace,
      refreshWorkspaceContext,
      addWorkspace,
      updateWorkspace,
      removeWorkspace,
    }),
    [
      activeWorkspace,
      activeWorkspaceId,
      activeWorkspaceContext,
      clientProfile,
      error,
      isLoading,
      refreshWorkspaceContext,
      switchWorkspace,
      workspaces,
    ]
  );

  return <WorkspaceContext.Provider value={value}>{children}</WorkspaceContext.Provider>;
};

export default WorkspaceContext;
