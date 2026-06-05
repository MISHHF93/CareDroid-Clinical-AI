import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { CARE_WORKSPACES, DEFAULT_CARE_WORKSPACE_ID } from '../config/workspace.config';
import { mergeWorkspacesWithRegistry } from '../data/sidebarToolPresentation';
import { getUserFacingToolRegistryProjection } from '../data/toolInventory';
import { apiFetch, getApiErrorMessage, parseApiResponse } from '../services/apiClient';
import logger from '../utils/logger';
import { useUser } from './UserContext';

const STORAGE_KEY = 'careDroid.workspaces.v1';

const defaultWorkspaces = () => {
  const userFacingTools = getUserFacingToolRegistryProjection();
  const byCategory = userFacingTools.reduce((acc, tool) => {
    acc[tool.category] = acc[tool.category] || [];
    acc[tool.category].push(tool.id);
    return acc;
  }, {});

  return CARE_WORKSPACES.map((workspace) => ({
    id: workspace.id,
    workspaceKey: workspace.id,
    name: workspace.label,
    path: workspace.path,
    assistantContext: workspace.aiContext,
    shortcuts: workspace.routeIds || [],
    toolIds: workspace.toolIds?.filter(Boolean) || byCategory[workspace.label] || [],
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
  const { authToken, isAuthenticated, isLoading: isUserLoading } = useUser();
  const [workspaceContext, setWorkspaceContext] = useState(null);
  const [workspaces, setWorkspaces] = useState(defaultWorkspaces());
  const [activeWorkspaceId, setActiveWorkspaceId] = useState(DEFAULT_CARE_WORKSPACE_ID);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed.workspaces) && parsed.workspaces.length > 0) {
          const defaults = defaultWorkspaces();
          setWorkspaces(mergeWorkspacesWithRegistry(parsed.workspaces, defaults));
          setActiveWorkspaceId(parsed.activeWorkspaceId || DEFAULT_CARE_WORKSPACE_ID);
        }
      }
    } catch (error) {
      logger.warn('Failed to load workspaces', { error });
    }
  }, []);

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

  const applyBackendContext = useCallback((context) => {
    if (!context?.workspace) return null;
    const backendWorkspaces = context.workspaceState?.workspaces || [];
    const fallbackById = Object.fromEntries(defaultWorkspaces().map((workspace) => [workspace.id, workspace]));
    const normalizedWorkspaces = backendWorkspaces.map((workspace) => {
      const workspaceKey = workspace.workspaceKey || workspace.settings?.workspaceKey || workspace.type;
      const fallback = fallbackById[workspaceKey] || {};
      return {
        ...fallback,
        ...workspace,
        id: workspaceKey,
        workspaceKey,
        backendWorkspaceId: workspace.id,
        name: workspace.branding?.displayName || workspace.name || fallback.name,
        path: `/workspace/${workspaceKey}`,
        assistantContext:
          workspace.assistantContext || workspace.settings?.assistantContext || fallback.assistantContext,
        shortcuts: workspace.settings?.shortcuts || fallback.shortcuts || [],
        toolIds: workspace.settings?.enabledToolIds || fallback.toolIds || [],
      };
    });
    const merged = mergeWorkspacesWithRegistry(normalizedWorkspaces, defaultWorkspaces());
    const activeWorkspaceId =
      context.workspace.workspaceKey || context.workspace.settings?.workspaceKey || context.workspace.type;
    setWorkspaces(merged);
    setActiveWorkspaceId(activeWorkspaceId || DEFAULT_CARE_WORKSPACE_ID);
    setWorkspaceContext(context);
    return context;
  }, []);

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
        return { ok: true, data: null, source: 'local' };
      }

      setActiveWorkspaceId(target.workspaceKey || target.id);
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

  const value = useMemo(
    () => ({
      workspaces,
      activeWorkspaceId,
      activeWorkspace,
      workspaceContext,
      visibleAssetIds: workspaceContext?.visibleAssetIds || activeWorkspace?.toolIds || [],
      recommendations: workspaceContext?.recommendations || [],
      assistantContext: workspaceContext?.assistantContext || activeWorkspace?.assistantContext || '',
      shortcuts: workspaceContext?.shortcuts || activeWorkspace?.shortcuts || [],
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
      error,
      isLoading,
      refreshWorkspaceContext,
      switchWorkspace,
      workspaceContext,
      workspaces,
    ]
  );

  return <WorkspaceContext.Provider value={value}>{children}</WorkspaceContext.Provider>;
};

export default WorkspaceContext;
