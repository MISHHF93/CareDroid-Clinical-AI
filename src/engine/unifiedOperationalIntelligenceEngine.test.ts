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