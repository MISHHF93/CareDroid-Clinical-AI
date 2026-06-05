import { describe, expect, it, vi } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { WorkspaceProvider, useWorkspace } from '../contexts/WorkspaceContext';

const mocks = vi.hoisted(() => ({
  apiFetch: vi.fn(),
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
  parseApiResponse: async (response, { fallback = {} } = {}) => {
    const body = await response.text();
    return body ? JSON.parse(body) : fallback;
  },
}));

vi.mock('../utils/logger', () => ({
  default: { warn: vi.fn() },
}));

describe('WorkspaceContext backend context', () => {
  it('loads active workspace context with visible assets, recommendations, assistant context, and shortcuts', async () => {
    mocks.apiFetch.mockResolvedValue(
      new Response(
        JSON.stringify({
          workspace: {
            id: 'workspace-icu',
            type: 'icu',
            workspaceKey: 'icu',
            name: 'ICU Workspace',
            assistantContext: 'ICU assistant context',
            settings: { enabledToolIds: ['sofa-score'] },
          },
          workspaceState: {
            workspaces: [
              {
                id: 'workspace-icu',
                type: 'icu',
                settings: { workspaceKey: 'icu', enabledToolIds: ['sofa-score'] },
                branding: { displayName: 'ICU' },
              },
            ],
          },
          visibleAssetIds: ['sofa-score'],
          recommendations: [{ assetId: 'sofa-score', reason: 'workspace' }],
          assistantContext: 'ICU assistant context',
          shortcuts: [{ id: 'sofa', label: 'SOFA', path: '/tools/calculators' }],
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
    expect(result.current.recommendations).toEqual([
      expect.objectContaining({ assetId: 'sofa-score' }),
    ]);
    expect(result.current.assistantContext).toBe('ICU assistant context');
    expect(result.current.shortcuts).toEqual([expect.objectContaining({ id: 'sofa' })]);
  });
});
