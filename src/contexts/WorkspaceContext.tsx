import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import {
  CARE_WORKSPACES,
  DEFAULT_CARE_WORKSPACE_ID,
  filterWorkspacesForClient,
  readLocalClientProfile,
} from '../config/workspace.config';
import { mergeWorkspacesWithRegistry } from '../data/sidebarToolPresentation';
import { getUserFacingToolRegistryProjection } from '../data/toolInventory';
import { apiFetch, getApiErrorMessage, parseApiResponse } from '../services/apiClient';
import {
  WorkspaceContextEnvelopeContractSchema,
  WorkspaceContractSchema,
} from '../types/workspaceContracts';
import logger from '../utils/logger';
import { useUser } from './UserContext';

const STORAGE_KEY = 'careDroid.workspaces.v1';

function workspaceKeyFromContext(context) {
  // context.workspace.workspaceKey is always populated by the backend now (both
  // serializeWorkspace() and buildContext() set it) -- `type` is a real,
  // required fallback since it's the same underlying value under a different
  // name. The raw entity `id` (a UUID) was removed as a fallback here: it can
  // never actually match an activeWorkspaceId (always workspaceKey-shaped),
  // so checking it was a latent bug, not a real safety net.
  return context?.workspace?.workspaceKey || context?.workspace?.type || '';
}

function workspaceContextMatchesActive(context, activeWorkspaceId) {
  if (!context) return false;
  const contextKey = workspaceKeyFromContext(context);
  return Boolean(contextKey && activeWorkspaceId && contextKey === activeWorkspaceId);
}

const defaultWorkspaces = (clientProfile: any = null, role = '') => {
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

const WorkspaceContext = createContext<any>({
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
  const [workspaceContext, setWorkspaceContext] = useState<any>(null);
  const [workspaces, setWorkspaces] = useState(() =>
    defaultWorkspaces(readLocalClientProfile(), user?.role),
  );
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
          const nextActive =
            parsed.activeWorkspaceId ||
            clientProfile?.defaultWorkspace ||
            defaults[0]?.id ||
            DEFAULT_CARE_WORKSPACE_ID;
          setActiveWorkspaceId(nextActive);
        }
      }
    } catch (error: any) {
      logger.warn('Failed to load workspaces', { error });
    }
  }, [clientProfile, user?.role]);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({ workspaces, activeWorkspaceId }));
    } catch (error: any) {
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
          : profile?.defaultWorkspace || nextWorkspaces[0]?.id || DEFAULT_CARE_WORKSPACE_ID,
      );
    };

    const handleClientProfileChanged = (event) =>
      applyClientProfile(event.detail || readLocalClientProfile());
    window.addEventListener('careDroid:clientProfileChanged', handleClientProfileChanged);

    const nextProfile = readLocalClientProfile();
    if (nextProfile && JSON.stringify(nextProfile) !== JSON.stringify(clientProfile)) {
      applyClientProfile(nextProfile);
    }

    return () =>
      window.removeEventListener('careDroid:clientProfileChanged', handleClientProfileChanged);
  }, [clientProfile, user?.role]);

  const applyBackendContext = useCallback(
    (context) => {
      if (!context?.workspace) return null;

      // Trust-boundary validation (2026-08-08): the backend previously had two
      // different serializers producing genuinely different shapes for the same
      // Workspace entity (WorkspacesService.serializeWorkspace() vs.
      // WorkspaceContextService.buildContext()) -- see
      // backend/src/modules/workspaces/workspace.contracts.ts for the full
      // history. Both are now required to conform to WorkspaceContractSchema.
      // Validating here means a future regression on either side surfaces as a
      // logged contract violation instead of silently reintroducing dead
      // fallback branches on the frontend (the old code checked
      // `workspace.displayName`/`workspace.label`/top-level `workspace.workspaceKey`
      // -- fields the real backend response never actually populated).
      const envelopeResult = WorkspaceContextEnvelopeContractSchema.safeParse(context);
      if (!envelopeResult.success) {
        logger.warn('Workspace context response violated the canonical contract', {
          issues: envelopeResult.error.issues.slice(0, 10),
        });
      }
      const validatedContext = envelopeResult.success ? envelopeResult.data : context;

      const backendWorkspaces = validatedContext.workspaceState?.workspaces || [];
      const fallbackById = Object.fromEntries(
        defaultWorkspaces(null, user?.role).map((workspace) => [workspace.id, workspace]),
      );
      const normalizedWorkspaces = backendWorkspaces.map((workspace) => {
        const workspaceResult = WorkspaceContractSchema.safeParse(workspace);
        if (!workspaceResult.success) {
          logger.warn('A workspace in workspaceState.workspaces violated the canonical contract', {
            workspaceId: workspace?.id,
            issues: workspaceResult.error.issues.slice(0, 10),
          });
        }
        // Once validated, every field below is guaranteed present (backend always
        // populates them -- serializeWorkspace() falls back to workspaceSettingsForType()
        // internally, so a real workspace type never has empty assistantContext/
        // shortcuts/enabledToolIds). Local CARE_WORKSPACES fallback is now only a
        // defensive net for the case validation itself failed (a malformed
        // response), not routine per-field reconciliation.
        const validated = workspaceResult.success ? workspaceResult.data : null;
        const workspaceKey = validated?.workspaceKey || workspace.type || workspace.workspaceKey;
        const fallback = fallbackById[workspaceKey] || {};
        return {
          ...fallback,
          ...workspace,
          id: workspaceKey,
          workspaceKey,
          backendWorkspaceId: validated?.id || workspace.id,
          name: validated?.name || fallback.name,
          path: validated?.routePath || `/workspace/${workspaceKey}`,
          assistantContext: validated?.assistantContext || fallback.assistantContext,
          shortcuts: validated?.shortcuts || fallback.shortcuts || [],
          toolIds: validated?.enabledToolIds || fallback.toolIds || [],
          workspaceProfile: validated?.workspaceProfile || fallback.workspaceProfile || null,
          defaultDashboardWidgets:
            validated?.defaultDashboardWidgets || fallback.defaultDashboardWidgets || [],
          defaultFilters: validated?.defaultFilters || fallback.defaultFilters || {},
          restrictedAssets: validated?.restrictedAssets || fallback.restrictedAssets || [],
        };
      });
      const merged = mergeWorkspacesWithRegistry(normalizedWorkspaces, defaultWorkspaces());
      // The raw entity `id` (a UUID) must never be used as a fallback here -- it
      // can never match activeWorkspaceId, which is always a workspaceKey-shaped
      // string (e.g. "emergency"). Removed as a real, if practically unreachable,
      // latent bug alongside the dead-field cleanup above.
      const activeWorkspaceId =
        validatedContext.workspace.workspaceKey || validatedContext.workspace.type;
      setWorkspaces(merged);
      setActiveWorkspaceId(activeWorkspaceId || DEFAULT_CARE_WORKSPACE_ID);
      setWorkspaceContext(validatedContext);
      return validatedContext;
    },
    [user?.role],
  );

  // HEAL-234: refreshWorkspaceContext's own async body (2 sequential
  // awaits: apiFetch then parseApiResponse, before applyBackendContext
  // sets workspaces/activeWorkspaceId/workspaceContext) had no staleness
  // guard. switchWorkspace (below) calls this after its own POST to
  // /api/workspaces/active resolves -- switching workspace A then quickly
  // re-switching to workspace B can let A's slower GET
  // /api/workspaces/context response land after B's, and
  // applyBackendContext's setActiveWorkspaceId/setWorkspaceContext would
  // silently revert the UI back to workspace A's data even though the
  // user is now on B. This is the sole call site of applyBackendContext,
  // so guarding here protects both callers (switchWorkspace and the
  // mount/auth-change effect below) uniformly.
  const refreshTokenRef = useRef(0);

  const refreshWorkspaceContext = useCallback(async () => {
    const token = ++refreshTokenRef.current;
    if (isUserLoading) return null;
    if (!isAuthenticated && !authToken) {
      if (refreshTokenRef.current === token) {
        setWorkspaceContext(null);
        setError('');
      }
      return null;
    }
    setIsLoading(true);
    try {
      const response = await apiFetch('/api/workspaces/context');
      const data = await parseApiResponse(response, { fallback: {} });
      if (!response.ok) {
        throw new Error(data?.message || getApiErrorMessage(null, response));
      }
      if (refreshTokenRef.current !== token) return null;
      setError('');
      return applyBackendContext(data);
    } catch (contextError: any) {
      if (refreshTokenRef.current !== token) return null;
      const message = contextError?.message || 'Workspace context unavailable.';
      logger.warn('Workspace context unavailable; using local fallback', { message });
      setWorkspaceContext(null);
      setError(message);
      return null;
    } finally {
      if (refreshTokenRef.current === token) setIsLoading(false);
    }
  }, [applyBackendContext, authToken, isAuthenticated, isUserLoading]);

  // Depending on [refreshWorkspaceContext] re-ran this effect (re-fetching
  // /api/workspaces/context and re-applying its result via setWorkspaces/
  // setActiveWorkspaceId/setWorkspaceContext) every time ANY of that callback's own
  // dependencies got a new reference, not just when auth state actually changed --
  // same bug class as UserIdentityContext's refreshIdentity effect (see its own comment).
  // Depend on the real trigger signals directly and read the latest callback via a ref.
  // Contributed to MB-P0-4/HEAL-082's app-wide render churn.
  const refreshWorkspaceContextRef = useRef(refreshWorkspaceContext);
  useEffect(() => {
    refreshWorkspaceContextRef.current = refreshWorkspaceContext;
  }, [refreshWorkspaceContext]);
  useEffect(() => {
    refreshWorkspaceContextRef.current();
  }, [authToken, isAuthenticated, isUserLoading]);

  const addWorkspace = (workspace) => {
    setWorkspaces((prev) => [...prev, workspace]);
  };

  const updateWorkspace = (workspaceId, updates) => {
    setWorkspaces((prev) =>
      prev.map((workspace) =>
        workspace.id === workspaceId ? { ...workspace, ...updates } : workspace,
      ),
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
          workspace.backendWorkspaceId === workspaceId,
      );
      if (!target) {
        const resolvedWorkspaceId = workspaceId || DEFAULT_CARE_WORKSPACE_ID;
        // `workspaces` only ever holds what applyBackendContext() last merged in
        // (the backend's per-user workspace membership list), which is not
        // guaranteed to include every id in the local CARE_WORKSPACES registry.
        // Without adding the local default here, activeWorkspace's own
        // `workspaces.find(...) || workspaces[0]` fallback below would silently
        // resolve to whatever workspace happened to be first in `workspaces`
        // (typically the previously-active one) instead of the workspace the
        // caller actually asked to switch to -- every field the context exposes
        // (assistantContext/shortcuts/toolIds/etc.) would then keep showing the
        // stale workspace's data while activeWorkspaceId already reports the
        // new one.
        const localMatch = defaultWorkspaces(clientProfile, user?.role).find(
          (workspace) =>
            workspace.id === resolvedWorkspaceId || workspace.workspaceKey === resolvedWorkspaceId,
        );
        setActiveWorkspaceId(resolvedWorkspaceId);
        setWorkspaceContext(null);
        if (localMatch) {
          setWorkspaces((prev) =>
            prev.some((workspace) => workspace.id === localMatch.id) ? prev : [...prev, localMatch],
          );
        }
        return { ok: true, data: null, source: 'local' };
      }

      const targetWorkspaceId = target.workspaceKey || target.id;
      setActiveWorkspaceId(targetWorkspaceId);
      setWorkspaceContext((current) =>
        workspaceContextMatchesActive(current, targetWorkspaceId) ? current : null,
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
      } catch (switchError: any) {
        const message = switchError?.message || 'Workspace switch failed.';
        logger.warn('Workspace switch failed; keeping local workspace selection', { message });
        setError(message);
        return { ok: false, message };
      }
    },
    [authToken, isAuthenticated, refreshWorkspaceContext, workspaces, clientProfile, user?.role],
  );

  const activeWorkspace = useMemo(
    () =>
      workspaces.find((workspace) => workspace.id === activeWorkspaceId) || workspaces[0] || null,
    [activeWorkspaceId, workspaces],
  );
  const activeWorkspaceContext = useMemo(
    () =>
      workspaceContextMatchesActive(workspaceContext, activeWorkspaceId) ? workspaceContext : null,
    [activeWorkspaceId, workspaceContext],
  );

  const value = useMemo(
    () => ({
      workspaces,
      activeWorkspaceId,
      activeWorkspace,
      workspaceContext: activeWorkspaceContext,
      visibleAssetIds: activeWorkspaceContext?.visibleAssetIds || activeWorkspace?.toolIds || [],
      recommendations: activeWorkspaceContext?.recommendations || [],
      // 2026-08-08: all of the below now read from `workspace.*` uniformly for
      // both the backend-context branch and the local-fallback branch, instead
      // of the backend-context branch reading a context-root duplicate that
      // backend/src/modules/workspaces/workspace-context.service.ts no longer
      // sends (removed as confirmed-redundant with workspace.* -- see
      // workspace.contracts.ts). recommendedAIAgents/recommendedAssetPacks'
      // local-fallback branch was ALSO silently checking a field that never
      // existed (`workspaceProfile.defaultAIAgents`/`.defaultAssetPacks` --
      // the real WorkspaceProfile fields are `recommendedAIAgents`/
      // `recommendedAssetPacks`, confirmed in workspace-taxonomy.ts), fixed
      // alongside this pass.
      assistantContext:
        activeWorkspaceContext?.workspace?.assistantContext ||
        activeWorkspace?.assistantContext ||
        '',
      shortcuts: activeWorkspaceContext?.workspace?.shortcuts || activeWorkspace?.shortcuts || [],
      workspaceProfile:
        activeWorkspaceContext?.workspace?.workspaceProfile ||
        activeWorkspace?.workspaceProfile ||
        null,
      defaultDashboardWidgets:
        activeWorkspaceContext?.workspace?.defaultDashboardWidgets ||
        activeWorkspace?.defaultDashboardWidgets ||
        [],
      defaultFilters:
        activeWorkspaceContext?.workspace?.defaultFilters || activeWorkspace?.defaultFilters || {},
      restrictedAssets:
        activeWorkspaceContext?.workspace?.restrictedAssets ||
        activeWorkspace?.restrictedAssets ||
        [],
      recommendedAIAgents:
        activeWorkspaceContext?.workspace?.workspaceProfile?.recommendedAIAgents ||
        activeWorkspace?.workspaceProfile?.recommendedAIAgents ||
        [],
      recommendedAssetPacks:
        activeWorkspaceContext?.workspace?.workspaceProfile?.recommendedAssetPacks ||
        activeWorkspace?.workspaceProfile?.recommendedAssetPacks ||
        [],
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
    ],
  );

  return <WorkspaceContext.Provider value={value}>{children}</WorkspaceContext.Provider>;
};

export default WorkspaceContext;
