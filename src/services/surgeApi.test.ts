import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('./apiClient', () => ({
  apiFetchJson: vi.fn(),
  getApiErrorMessage: () => 'Request failed',
}));

import { apiFetchJson } from './apiClient';
import { fetchEmergencySurgeStatus, fetchEmergencySurgeBottlenecks } from './surgeApi';

// HEAL-347.40: emergencySurge stayed BACKEND_CAPABILITY_STATUS.DISABLED even
// though SurgeController is a real, live backend route -- guardedJson()
// short-circuited every surge call to a hardcoded null before ever reaching
// the network. This pins the fixed behavior: the capability is enabled, so
// these calls must actually reach apiFetchJson instead of short-circuiting.
describe('surgeApi (HEAL-347.40 capability gate)', () => {
  beforeEach(() => {
    vi.mocked(apiFetchJson).mockReset();
  });

  it('fetchEmergencySurgeStatus reaches the network instead of short-circuiting to null', async () => {
    vi.mocked(apiFetchJson).mockResolvedValue({
      response: { ok: true } as Response,
      data: { active: false },
    });

    const result = await fetchEmergencySurgeStatus();

    expect(apiFetchJson).toHaveBeenCalledWith('/api/emergency/surge/status', {});
    expect(result.ok).toBe(true);
    expect(result.data).toEqual({ active: false });
  });

  it('surfaces a real backend error message instead of the generic "not available yet" placeholder', async () => {
    vi.mocked(apiFetchJson).mockResolvedValue({
      response: { ok: false } as Response,
      data: {
        error:
          'Surge capacity service requires MongoDB (set ENABLE_MONGOOSE_EMERGENCY_OS=true and MONGODB_URI).',
      },
    });

    const result = await fetchEmergencySurgeBottlenecks();

    expect(apiFetchJson).toHaveBeenCalledWith('/api/emergency/surge/bottlenecks', {});
    expect(result.ok).toBe(false);
    expect(result.message).toContain('requires MongoDB');
  });
});
