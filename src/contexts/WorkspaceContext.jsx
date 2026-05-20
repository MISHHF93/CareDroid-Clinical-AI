import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { mergeWorkspacesWithRegistry } from '../data/sidebarToolPresentation';
import { getUserFacingToolRegistryProjection } from '../data/toolInventory';
import logger from '../utils/logger';

const STORAGE_KEY = 'careDroid.workspaces.v1';

const defaultWorkspaces = () => {
  const userFacingTools = getUserFacingToolRegistryProjection();
  const byCategory = userFacingTools.reduce((acc, tool) => {
    acc[tool.category] = acc[tool.category] || [];
    acc[tool.category].push(tool.id);
    return acc;
  }, {});

  return [
    { id: 'all', name: 'All Tools', toolIds: userFacingTools.map((tool) => tool.id) },
    { id: 'diagnostic', name: 'Diagnostic', toolIds: byCategory.Diagnostic || [] },
    { id: 'calculator', name: 'Calculator', toolIds: byCategory.Calculator || [] },
    { id: 'reference', name: 'Reference', toolIds: byCategory.Reference || [] },
    { id: 'fleet', name: 'Fleet', toolIds: byCategory.Fleet || [] },
  ];
};

const WorkspaceContext = createContext({
  workspaces: [],
  activeWorkspaceId: 'all',
  setActiveWorkspaceId: () => {},
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
  const [workspaces, setWorkspaces] = useState(defaultWorkspaces());
  const [activeWorkspaceId, setActiveWorkspaceId] = useState('all');

  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed.workspaces) && parsed.workspaces.length > 0) {
          const defaults = defaultWorkspaces();
          setWorkspaces(mergeWorkspacesWithRegistry(parsed.workspaces, defaults));
          setActiveWorkspaceId(parsed.activeWorkspaceId || 'all');
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
      setActiveWorkspaceId('all');
    }
  };

  const value = useMemo(
    () => ({
      workspaces,
      activeWorkspaceId,
      setActiveWorkspaceId,
      addWorkspace,
      updateWorkspace,
      removeWorkspace,
    }),
    [workspaces, activeWorkspaceId]
  );

  return <WorkspaceContext.Provider value={value}>{children}</WorkspaceContext.Provider>;
};

export default WorkspaceContext;
