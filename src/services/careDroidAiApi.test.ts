import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const apiFetch = vi.hoisted(() => vi.fn());
const parseApiResponse = vi.hoisted(() => vi.fn());
const getApiErrorMessage = vi.hoisted(() => vi.fn(() => 'API unavailable'));

vi.mock('./apiClient', () => ({
  apiFetch,
  parseApiResponse,
  getApiErrorMessage,
}));

import { requestCareDroidAI, CARE_DROID_AI_NODE_PATH } from './careDroidAiApi';

describe('requestCareDroidAI', () => {
  beforeEach(() => {
    vi.spyOn(console, 'info').mockImplementation(() => undefined);
    apiFetch.mockReset();
    parseApiResponse.mockReset();
    getApiErrorMessage.mockReturnValue('API unavailable');
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('falls back to the local safe AI node when the backend request fails', async () => {
    apiFetch.mockRejectedValue(new Error('network down'));

    const response = await requestCareDroidAI({
      intent: 'wait_time_prediction',
      input: {
        queueLength: 8,
        doctorsOnDuty: 2,
        nursesAvailable: 4,
        bedsAvailable: 1,
        averageTreatmentTime: 40,
        currentCapacity: 92,
        criticalCases: 2,
      },
    });

    expect(apiFetch).toHaveBeenCalledWith(
      CARE_DROID_AI_NODE_PATH,
      expect.objectContaining({ method: 'POST' }),
    );
    expect(response.status).toBe('success');
    expect(response.data.estimatedWaitTime).toBeTruthy();
    expect(response.warnings.join(' ')).toContain('safe local fallback');
  });
});
