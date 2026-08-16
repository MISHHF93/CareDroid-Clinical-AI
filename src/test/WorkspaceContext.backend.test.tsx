import { beforeEach, describe, expect, it, vi } from 'vitest';
import { act, renderHook, waitFor } from '@testing-library/react';
import { WorkspaceProvider, useWorkspace } from '../contexts/WorkspaceContext';

const mocks = vi.hoisted(() => ({
  apiFetch: vi.fn(),
  loggerWarn: vi.fn(),
}));

vi.mock('../contexts/UserContext', () => ({
  useUser: () => ({
    authToken: 'token-1',
    isAuthenticated: true,
    isLoading: false,
  }),
}));

vi.mock('../services/apiClient', () => ({
  apiFetch: (...args) => mocks.apiFetch(...args),
  getApiErrorMessage: () => 'Request failed',
  parseApiResponse: async (response, { fallback = {} }: any = {}) => {
    const body = await response.text();
    return body ? JSON.parse(body) : fallback;
  },
}));

vi.mock('../utils/logger', () => ({
  default: { warn: (...args) => mocks.loggerWarn(...args) },
}));

// Full canonical shape (backend/src/modules/workspaces/workspace.contracts.ts's
// WorkspaceSchema) -- 2026-08-08: this file's mocks previously matched a STALE
// shape (assistantContext/shortcuts duplicated at the envelope root, no
// workspaceProfile/routePath/description/branding/settings on individual
// workspaceState.workspaces entries). WorkspaceContextEnvelopeContractSchema
// now validates every real response, and would have silently fallen back to
// local CARE_WORKSPACES defaults for this old-shaped mock instead of using
// its intended values -- exactly the kind of contract drift this whole pass
// was meant to catch, caught by its own regression tests.
const icuWorkspaceProfile = {
  workspaceId: 'icu',
  name: 'ICU Backend Display',
  description: 'Critical care workspace.',
  allowedRoles: [],
  intendedDepartments: [],
  defaultAssets: ['sofa-score'],
  recommendedAssetPacks: [],
  defaultDashboardWidgets: ['recommended-assets'],
  recommendedAIAgents: ['clinical-copilot'],
  visibleNavigationGroups: ['dashboard'],
  restrictedAssets: [],
  defaultFilters: {},
  allowedOrganizationTypes: [],
  subscriptionTier: 'starter',
  status: 'active',
};

function buildIcuWorkspace(overrides: Record<string, unknown> = {}) {
  return {
    id: 'workspace-icu',
    workspaceKey: 'icu',
    type: 'icu',
    name: 'ICU Backend Display',
    slug: 'icu-1',
    organizationId: null,
    parentWorkspaceId: null,
    routePath: '/workspace/icu',
    description: 'Critical care workspace.',
    assistantContext: 'ICU assistant context',
    defaultDashboard: 'icu',
    branding: { displayName: 'ICU Backend Display' },
    settings: { enabledToolIds: ['sofa-score'] },
    enabledToolIds: ['sofa-score'],
    enabledModules: ['dashboard'],
    shortcuts: [
      { id: 'sofa', label: 'SOFA', path: '/tools/calculators', description: 'Open SOFA scoring.' },
    ],
    workspaceProfile: icuWorkspaceProfile,
    defaultDashboardWidgets: ['recommended-assets'],
    defaultFilters: {},
    restrictedAssets: [],
    ...overrides,
  };
}

describe('WorkspaceContext backend context', () => {
  beforeEach(() => {
    mocks.loggerWarn.mockClear();
  });

  it('loads active workspace context with visible assets, recommendations, assistant context, and shortcuts', async () => {
    mocks.apiFetch.mockResolvedValue(
      new Response(
        JSON.stringify({
          workspace: buildIcuWorkspace(),
          workspaceState: {
            workspaces: [buildIcuWorkspace()],
            memberships: [],
            activeWorkspaceId: 'workspace-icu',
            recentWorkspaceIds: [],
          },
          effectivePermissions: [],
          visibleAssetIds: ['sofa-score'],
          entitledPackIds: [],
          assetAccessDecisions: {},
          recommendations: [{ assetId: 'sofa-score', reason: 'workspace' }],
          workspaceTypes: ['icu'],
        }),
        { status: 200, headers: { 'content-type': 'application/json' } },
      ),
    );

    const wrapper = ({ children }) => <WorkspaceProvider>{children}</WorkspaceProvider>;
    const { result } = renderHook(() => useWorkspace(), { wrapper });

    await waitFor(() => {
      expect(result.current.activeWorkspaceId).toBe('icu');
    });
    expect(result.current.visibleAssetIds).toEqual(['sofa-score']);
    expect(result.current.activeWorkspace.name).toBe('ICU Backend Display');
    expect(result.current.recommendations).toEqual([
      expect.objectContaining({ assetId: 'sofa-score' }),
    ]);
    expect(result.current.assistantContext).toBe('ICU assistant context');
    expect(result.current.shortcuts).toEqual([expect.objectContaining({ id: 'sofa' })]);
  });

  it('does not leak stale backend context after switching to a local workspace', async () => {
    mocks.apiFetch.mockResolvedValue(
      new Response(
        JSON.stringify({
          workspace: buildIcuWorkspace(),
          workspaceState: {
            workspaces: [buildIcuWorkspace()],
            memberships: [],
            activeWorkspaceId: 'workspace-icu',
            recentWorkspaceIds: [],
          },
          effectivePermissions: [],
          visibleAssetIds: ['sofa-score'],
          entitledPackIds: [],
          assetAccessDecisions: {},
          recommendations: [{ assetId: 'sofa-score', reason: 'workspace' }],
          workspaceTypes: ['icu'],
        }),
        { status: 200, headers: { 'content-type': 'application/json' } },
      ),
    );

    const wrapper = ({ children }) => <WorkspaceProvider>{children}</WorkspaceProvider>;
    const { result } = renderHook(() => useWorkspace(), { wrapper });

    await waitFor(() => {
      expect(result.current.activeWorkspaceId).toBe('icu');
    });

    await act(async () => {
      await result.current.switchWorkspace('emergency');
    });

    expect(result.current.activeWorkspaceId).toBe('emergency');
    expect(result.current.workspaceContext).toBeNull();
    expect(result.current.recommendations).toEqual([]);
    expect(result.current.visibleAssetIds).not.toEqual(['sofa-score']);
    expect(result.current.assistantContext).not.toBe('ICU assistant context');
  });

  it('does not log a contract violation for a real, fully-conforming backend response', async () => {
    mocks.apiFetch.mockResolvedValue(
      new Response(
        JSON.stringify({
          workspace: buildIcuWorkspace(),
          workspaceState: {
            workspaces: [buildIcuWorkspace()],
            memberships: [],
            activeWorkspaceId: 'workspace-icu',
            recentWorkspaceIds: [],
          },
          effectivePermissions: [],
          visibleAssetIds: ['sofa-score'],
          entitledPackIds: [],
          assetAccessDecisions: {},
          recommendations: [],
          workspaceTypes: ['icu'],
        }),
        { status: 200, headers: { 'content-type': 'application/json' } },
      ),
    );

    const wrapper = ({ children }) => <WorkspaceProvider>{children}</WorkspaceProvider>;
    const { result } = renderHook(() => useWorkspace(), { wrapper });

    await waitFor(() => {
      expect(result.current.activeWorkspaceId).toBe('icu');
    });
    expect(mocks.loggerWarn).not.toHaveBeenCalledWith(
      'Workspace context response violated the canonical contract',
      expect.anything(),
    );
  });

  it('HEAL-234: a slower refreshWorkspaceContext() call does not overwrite a faster, more recently-started one', async () => {
    function deferred<T>() {
      let resolve!: (value: T) => void;
      const promise = new Promise<T>((r) => {
        resolve = r;
      });
      return { promise, resolve };
    }

    const jsonResponse = (body: unknown) =>
      new Response(JSON.stringify(body), {
        status: 200,
        headers: { 'content-type': 'application/json' },
      });

    const contextFor = (workspaceKey: string) => ({
      workspace: buildIcuWorkspace({ workspaceKey, type: workspaceKey, id: `workspace-${workspaceKey}` }),
      workspaceState: {
        workspaces: [buildIcuWorkspace({ workspaceKey, type: workspaceKey, id: `workspace-${workspaceKey}` })],
        memberships: [],
        activeWorkspaceId: `workspace-${workspaceKey}`,
        recentWorkspaceIds: [],
      },
      effectivePermissions: [],
      visibleAssetIds: [],
      entitledPackIds: [],
      assetAccessDecisions: {},
      recommendations: [],
      workspaceTypes: [workspaceKey],
    });

    // Initial mount load.
    mocks.apiFetch.mockResolvedValueOnce(jsonResponse(contextFor('icu')));
    const wrapper = ({ children }) => <WorkspaceProvider>{children}</WorkspaceProvider>;
    const { result } = renderHook(() => useWorkspace(), { wrapper });
    await waitFor(() => expect(result.current.activeWorkspaceId).toBe('icu'));

    // Call A (started first) stays pending on deferredA; call B (started
    // second, resolves immediately) must win regardless of resolution
    // order -- before HEAL-234, whichever GET /api/workspaces/context
    // response happened to land last would win, network-order not
    // call-order.
    const deferredA = deferred<Response>();
    mocks.apiFetch.mockImplementationOnce(() => deferredA.promise);
    const refreshA = result.current.refreshWorkspaceContext();

    mocks.apiFetch.mockResolvedValueOnce(jsonResponse(contextFor('emergency')));
    const refreshB = result.current.refreshWorkspaceContext();
    await refreshB;
    await waitFor(() => expect(result.current.activeWorkspaceId).toBe('emergency'));

    // A's slower response now resolves, after B has already landed.
    deferredA.resolve(jsonResponse(contextFor('radiology')));
    await refreshA;
    await new Promise((r) => setTimeout(r, 20));

    expect(result.current.activeWorkspaceId).toBe('emergency');
  });

  it('logs a contract violation (rather than silently disagreeing) when the backend response is missing required canonical fields', async () => {
    // A malformed/incomplete response -- missing workspaceProfile, routePath,
    // description, branding, settings entirely. Regression guard for the
    // trust-boundary validation itself: proves a real shape mismatch is
    // surfaced (logged) instead of silently producing a half-populated UI.
    mocks.apiFetch.mockResolvedValue(
      new Response(
        JSON.stringify({
          workspace: { id: 'workspace-icu', workspaceKey: 'icu', type: 'icu', name: 'ICU' },
          workspaceState: { workspaces: [], memberships: [], activeWorkspaceId: null, recentWorkspaceIds: [] },
          effectivePermissions: [],
          visibleAssetIds: [],
          entitledPackIds: [],
          assetAccessDecisions: {},
          recommendations: [],
          workspaceTypes: ['icu'],
        }),
        { status: 200, headers: { 'content-type': 'application/json' } },
      ),
    );

    const wrapper = ({ children }) => <WorkspaceProvider>{children}</WorkspaceProvider>;
    renderHook(() => useWorkspace(), { wrapper });

    await waitFor(() => {
      expect(mocks.loggerWarn).toHaveBeenCalledWith(
        'Workspace context response violated the canonical contract',
        expect.objectContaining({ issues: expect.any(Array) }),
      );
    });
  });
});
