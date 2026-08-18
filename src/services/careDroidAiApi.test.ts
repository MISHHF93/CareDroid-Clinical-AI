import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const apiFetch = vi.hoisted(() => vi.fn());
const parseApiResponse = vi.hoisted(() => vi.fn());
const getApiErrorMessage = vi.hoisted(() => vi.fn(() => 'API unavailable'));

vi.mock('./apiClient', () => ({
  apiFetch,
  parseApiResponse,
  getApiErrorMessage,
}));

import {
  transportCareDroidAINode,
  CARE_DROID_AI_NODE_PATH,
  __resetAiNodeConcurrencyStateForTests,
} from './careDroidAiApi';

describe('transportCareDroidAINode', () => {
  beforeEach(() => {
    vi.spyOn(console, 'info').mockImplementation(() => undefined);
    apiFetch.mockReset();
    parseApiResponse.mockReset();
    getApiErrorMessage.mockReturnValue('API unavailable');
    __resetAiNodeConcurrencyStateForTests();
  });

  afterEach(() => {
    vi.restoreAllMocks();
    __resetAiNodeConcurrencyStateForTests();
  });

  it('falls back to the local safe AI node when the backend request fails', async () => {
    apiFetch.mockRejectedValue(new Error('network down'));

    const response = await transportCareDroidAINode({
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

  // HEAL-347.3: patientJourneyAiDecisionService can burst 25-40+ concurrent
  // calls through this one transport function (3 intents x N patients,
  // re-triggered every ~12-13s by backend workflow-orchestration events).
  // Confirmed live that volume starves the JS event loop badly enough that
  // individual requests' own timeout stops firing on schedule -- some sat
  // neither resolved nor rejected 15+ seconds in, which meant
  // Promise.all([3 intents]) upstream never settled, so the decision cache
  // never got populated and every ~12s cycle piled more requests on top of
  // the ones already stuck. This test guards the fix: at most
  // MAX_CONCURRENT_AI_NODE_REQUESTS (4) real apiFetch calls are ever
  // in flight at once, with the rest queued until a slot frees up.
  it('caps concurrent apiFetch calls and releases queued requests as slots free up', async () => {
    const pending: Array<(value: unknown) => void> = [];
    let resolvedCount = 0;
    apiFetch.mockImplementation(
      () =>
        new Promise((resolve) => {
          pending.push(resolve as (value: unknown) => void);
        }),
    );
    parseApiResponse.mockResolvedValue({ status: 'success', data: {}, warnings: [] });

    // Drain-and-settle helper: resolves every apiFetch call currently
    // pending, then yields several microtask ticks so any newly-queued
    // call that acquires a freed slot has a chance to actually reach and
    // invoke apiFetch before the next assertion/drain.
    const resolveAllPending = async () => {
      while (resolvedCount < pending.length) {
        pending[resolvedCount]({ ok: true, status: 200 });
        resolvedCount += 1;
      }
      for (let i = 0; i < 5; i += 1) await Promise.resolve();
    };

    const baseRequest = { intent: 'wait_time_prediction' as const, input: {} };
    const calls = Array.from({ length: 6 }, () => transportCareDroidAINode(baseRequest));

    // Let the microtask queue settle so every call has had a chance to
    // either acquire a slot and call apiFetch, or queue up waiting for one.
    for (let i = 0; i < 5; i += 1) await Promise.resolve();

    expect(apiFetch).toHaveBeenCalledTimes(4);

    // Resolve one in-flight request -- a queued 5th call should now
    // acquire the freed slot and fire its own apiFetch call.
    pending[0]({ ok: true, status: 200 });
    resolvedCount = 1;
    for (let i = 0; i < 5; i += 1) await Promise.resolve();

    expect(apiFetch).toHaveBeenCalledTimes(5);

    // Drain everything else (repeatedly, since each newly-freed slot can
    // pull another queued call in) so no promise is left dangling.
    await resolveAllPending();
    await resolveAllPending();
    expect(apiFetch).toHaveBeenCalledTimes(6);
    await resolveAllPending();

    await Promise.all(calls);
  });
});
