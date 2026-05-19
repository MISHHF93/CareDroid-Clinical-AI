import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('./apiClient', () => ({
  apiFetch: vi.fn(),
  parseApiResponse: vi.fn(async (response) => response._json ?? {}),
}));

import { apiFetch } from './apiClient';
import { executeClinicalTool } from './clinicalOrchestratorApi';

describe('clinicalOrchestratorApi', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('rejects unsupported tools without calling fetch', async () => {
    const result = await executeClinicalTool('dispatch-ai', {});
    expect(result.ok).toBe(false);
    expect(result.unsupported).toBe(true);
    expect(result.errorCode).toBe('UNSUPPORTED_TOOL');
    expect(apiFetch).not.toHaveBeenCalled();
  });

  it('rejects qsofa without calling fetch', async () => {
    const result = await executeClinicalTool('qsofa', { score: 2 });
    expect(result.unsupported).toBe(true);
    expect(apiFetch).not.toHaveBeenCalled();
  });

  it('calls POST execute for registered drug-interactions', async () => {
    apiFetch.mockResolvedValueOnce({
      ok: true,
      status: 200,
      _json: {
        success: true,
        toolId: 'drug-interactions',
        result: { success: true, data: { interactions: [] } },
      },
    });

    const result = await executeClinicalTool('drug-interactions', {
      medications: ['aspirin', 'warfarin'],
    });

    expect(apiFetch).toHaveBeenCalledWith(
      '/api/tools/drug-interactions/execute',
      expect.objectContaining({ method: 'POST' }),
    );
    expect(result.ok).toBe(true);
    expect(result.nluToolId).toBe('drug-interactions');
  });

  it('resolves registry id drug-check to drug-interactions execute path', async () => {
    apiFetch.mockResolvedValueOnce({
      ok: true,
      status: 200,
      _json: {
        success: true,
        toolId: 'drug-interactions',
        result: { success: true, data: {} },
      },
    });

    await executeClinicalTool('drug-check', { medications: ['a', 'b'] });
    expect(apiFetch).toHaveBeenCalledWith(
      '/api/tools/drug-interactions/execute',
      expect.any(Object),
    );
  });
});
