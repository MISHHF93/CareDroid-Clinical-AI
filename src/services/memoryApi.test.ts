import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fetchMemoryFabricContext, recordMemorySignal } from './memoryApi';

vi.mock('./apiClient', () => ({
  apiFetch: vi.fn(),
  getApiErrorMessage: vi.fn(() => 'Request failed'),
  parseApiResponse: vi.fn(async (response) => response.json()),
}));

import { apiFetch } from './apiClient';

describe('memoryApi fabric methods', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('fetches normalized memory fabric context', async () => {
    vi.mocked(apiFetch).mockResolvedValue({
      ok: true,
      json: async () => ({
        workspaceMemory: { recentAssets: ['qsofa'], visibleAssetIds: ['qsofa'] },
        userMemory: { pinnedAssets: ['qsofa'], recentAssets: ['qsofa'] },
        rules: { rawPromptIncluded: false, rawSearchIncluded: false },
      }),
    } as any);

    const result = await fetchMemoryFabricContext();

    expect(apiFetch).toHaveBeenCalledWith(
      '/api/memory/fabric/context',
      expect.objectContaining({
        headers: expect.objectContaining({ 'Content-Type': 'application/json' }),
      }),
    );
    expect(result.ok).toBe(true);
    expect(result.workspaceMemory.recentAssets).toEqual(['qsofa']);
    expect(result.rules.rawPromptIncluded).toBe(false);
  });

  it('records sanitized fabric memory signals', async () => {
    vi.mocked(apiFetch).mockResolvedValue({
      ok: true,
      json: async () => ({ status: 'recorded' }),
    } as any);

    const result = await recordMemorySignal({
      scope: 'workspace',
      signalType: 'recent_asset',
      title: 'qsofa',
      assetId: 'qsofa',
    });

    expect(result.ok).toBe(true);
    expect(apiFetch).toHaveBeenCalledWith(
      '/api/memory/fabric/signals',
      expect.objectContaining({
        method: 'POST',
        body: expect.stringContaining('"signalType":"recent_asset"'),
      }),
    );
  });
});
