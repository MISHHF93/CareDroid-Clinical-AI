import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('./apiClient', () => ({
  apiFetchJson: vi.fn(),
  getApiErrorMessage: () => 'Request failed',
}));

import { apiFetchJson } from './apiClient';
import { touchSurfaceView } from './surfaceViewsApi';

describe('surfaceViewsApi', () => {
  beforeEach(() => {
    vi.mocked(apiFetchJson).mockReset();
  });

  it('POSTs to the encoded surface key and returns the previous viewedAt', async () => {
    vi.mocked(apiFetchJson).mockResolvedValue({
      response: { ok: true } as Response,
      data: {
        surfaceKey: 'care-operations-inbox',
        previousViewedAt: '2026-08-20T00:00:00.000Z',
        viewedAt: '2026-08-20T00:05:00.000Z',
      },
    });

    const result = await touchSurfaceView('care-operations-inbox');

    expect(apiFetchJson).toHaveBeenCalledWith(
      '/api/surface-views/care-operations-inbox',
      expect.objectContaining({ method: 'POST' }),
    );
    expect(result).toEqual({ ok: true, previousViewedAt: '2026-08-20T00:00:00.000Z' });
  });

  it('returns null previousViewedAt (not undefined/throw) the first time a surface is touched', async () => {
    vi.mocked(apiFetchJson).mockResolvedValue({
      response: { ok: true } as Response,
      data: {
        surfaceKey: 'shift-summary',
        previousViewedAt: null,
        viewedAt: '2026-08-20T00:05:00.000Z',
      },
    });

    const result = await touchSurfaceView('shift-summary');

    expect(result).toEqual({ ok: true, previousViewedAt: null });
  });

  it('URL-encodes a surface key with unsafe characters', async () => {
    vi.mocked(apiFetchJson).mockResolvedValue({
      response: { ok: true } as Response,
      data: { previousViewedAt: null },
    });

    await touchSurfaceView('some surface/key');

    expect(apiFetchJson).toHaveBeenCalledWith(
      '/api/surface-views/some%20surface%2Fkey',
      expect.anything(),
    );
  });

  it('degrades to "nothing new" (ok:false, previousViewedAt:null) rather than throwing on failure', async () => {
    vi.mocked(apiFetchJson).mockResolvedValue({
      response: { ok: false } as Response,
      data: { error: 'Not authorized' },
    });

    const result = await touchSurfaceView('care-operations-inbox');

    expect(result).toEqual({ ok: false, previousViewedAt: null });
  });

  it('degrades to "nothing new" on a network throw', async () => {
    vi.mocked(apiFetchJson).mockRejectedValue(new Error('network down'));

    const result = await touchSurfaceView('care-operations-inbox');

    expect(result).toEqual({ ok: false, previousViewedAt: null });
  });
});
