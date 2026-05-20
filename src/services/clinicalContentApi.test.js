import { describe, it, expect, vi, beforeEach } from 'vitest';
import { fetchProtocols, fetchDrugs } from './clinicalContentApi';

vi.mock('./apiClient', () => ({
  apiFetchJson: vi.fn(),
  getApiErrorMessage: vi.fn((_err, res) => `HTTP ${res?.status ?? 'error'}`),
}));

import { apiFetchJson } from './apiClient';

describe('clinicalContentApi', () => {
  beforeEach(() => {
    vi.mocked(apiFetchJson).mockReset();
  });

  it('fetchProtocols returns items on success', async () => {
    vi.mocked(apiFetchJson).mockResolvedValue({
      response: { ok: true, status: 200 },
      data: { items: [{ name: 'Sepsis' }], total: 1 },
    });
    const res = await fetchProtocols({ limit: 10 });
    expect(res.ok).toBe(true);
    expect(res.items).toHaveLength(1);
    expect(apiFetchJson).toHaveBeenCalledWith('/api/protocols?limit=10');
  });

  it('fetchProtocols returns error on failure', async () => {
    vi.mocked(apiFetchJson).mockResolvedValue({
      response: { ok: false, status: 503 },
      data: {},
    });
    const res = await fetchProtocols();
    expect(res.ok).toBe(false);
    expect(res.items).toEqual([]);
    expect(res.error).toBeTruthy();
  });

  it('fetchDrugs calls /api/drugs', async () => {
    vi.mocked(apiFetchJson).mockResolvedValue({
      response: { ok: true, status: 200 },
      data: { items: [{ name: 'Warfarin' }] },
    });
    const res = await fetchDrugs({ search: 'war' });
    expect(res.ok).toBe(true);
    expect(apiFetchJson).toHaveBeenCalledWith('/api/drugs?search=war');
  });
});
