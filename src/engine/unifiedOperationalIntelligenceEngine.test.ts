import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  getLastUnifiedOperationalIntelligenceBackendEvent,
  handleUnifiedOperationalIntelligenceBackendEvent,
  queueUnifiedOperationalIntelligenceEvent,
  scheduleUnifiedOperationalIntelligenceRefresh,
} from './unifiedOperationalIntelligenceEngine';

describe('unifiedOperationalIntelligenceEngine', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it('ignores non-trigger backend events', () => {
    handleUnifiedOperationalIntelligenceBackendEvent('unknown_event');
    expect(getLastUnifiedOperationalIntelligenceBackendEvent()).toBeUndefined();
  });

  it('queues trigger events and schedules debounced refresh', () => {
    queueUnifiedOperationalIntelligenceEvent('journey_state_changed', { patientId: 'p-1' });
    scheduleUnifiedOperationalIntelligenceRefresh('journey_state_changed');
    expect(getLastUnifiedOperationalIntelligenceBackendEvent()).toBe('journey_state_changed');
  });

  it('routes websocket trigger events through the handler', () => {
    handleUnifiedOperationalIntelligenceBackendEvent('capacity_updated', { score: 68 });
    expect(getLastUnifiedOperationalIntelligenceBackendEvent()).toBe('capacity_updated');
  });
});

// HEAL-100: the 4 backend operational-intelligence routes require VIEW_OBSERVABILITY,
// which PHYSICIAN/NURSE never hold -- this engine is mounted app-wide (AppShell) for
// every role, so every non-admin session got a guaranteed, endlessly-repeating 403 on
// every realtime event. Uses a fresh module instance (vi.resetModules) so the
// module-level "permissionDenied" flag this test sets doesn't leak into the tests above.
describe('unifiedOperationalIntelligenceEngine — 403 back-off (HEAL-100)', () => {
  beforeEach(() => {
    vi.resetModules();
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.doUnmock('../services/emergencyOsApi');
  });

  // vi.resetModules() gives the dynamically-imported engine a fresh copy of every
  // module it imports, including the store -- setState on the statically-imported
  // `useEmergencyStore` above would land on a different instance, so each test
  // re-imports the store dynamically and mutates that instance instead.
  async function markBackendAvailable() {
    const { useEmergencyStore: freshStore } = await import('../store/emergencyStore');
    freshStore.setState({ backendAvailable: true } as Partial<
      ReturnType<typeof freshStore.getState>
    >);
  }

  it('stops retrying after a 403 instead of repeating the doomed request on every event', async () => {
    // Matches the real shape thrown by emergencyOsApi.ts's requestEmergencyJson --
    // a plain Error with a `.status` property, not apiClient.ts's ApiResponseError
    // class (that class is never actually thrown on this call path).
    const forbidden = () => {
      const error: any = new Error('You do not have permission to access this resource.');
      error.status = 403;
      return error;
    };
    const fetchSnapshot = vi.fn().mockRejectedValue(forbidden());
    const evaluate = vi.fn().mockRejectedValue(forbidden());
    vi.doMock('../services/emergencyOsApi', async (importOriginal) => ({
      ...(await importOriginal<typeof import('../services/emergencyOsApi')>()),
      fetchOperationalIntelligenceSnapshot: fetchSnapshot,
      evaluateOperationalIntelligence: evaluate,
    }));
    await markBackendAvailable();

    const engine = await import('./unifiedOperationalIntelligenceEngine');

    await engine.refreshUnifiedOperationalIntelligenceFromBackend('engine_start');
    expect(fetchSnapshot).toHaveBeenCalledTimes(1);

    // Further realtime events must not queue or trigger another request once denied.
    engine.handleUnifiedOperationalIntelligenceBackendEvent('journey_state_changed', {
      patientId: 'p-1',
    });
    await engine.refreshUnifiedOperationalIntelligenceFromBackend('journey_state_changed');

    expect(fetchSnapshot).toHaveBeenCalledTimes(1);
    expect(evaluate).not.toHaveBeenCalled();
  });

  it('keeps retrying on a non-403 failure (transient/network errors are not permission denials)', async () => {
    const fetchSnapshot = vi.fn().mockRejectedValue(new Error('network error'));
    vi.doMock('../services/emergencyOsApi', async (importOriginal) => ({
      ...(await importOriginal<typeof import('../services/emergencyOsApi')>()),
      fetchOperationalIntelligenceSnapshot: fetchSnapshot,
      evaluateOperationalIntelligence: vi.fn(),
    }));
    await markBackendAvailable();

    const engine = await import('./unifiedOperationalIntelligenceEngine');

    await engine.refreshUnifiedOperationalIntelligenceFromBackend('engine_start');
    await engine.refreshUnifiedOperationalIntelligenceFromBackend('engine_start');

    expect(fetchSnapshot).toHaveBeenCalledTimes(2);
  });
});
