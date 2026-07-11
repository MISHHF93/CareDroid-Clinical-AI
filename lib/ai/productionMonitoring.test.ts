import { afterEach, describe, expect, it } from 'vitest';
import {
  getAiMonitorSnapshot,
  recordAiMonitorEvent,
  resetAiMonitor,
} from './productionMonitoring';

describe('productionMonitoring', () => {
  afterEach(() => {
    resetAiMonitor();
  });

  it('records counters and recent events', () => {
    resetAiMonitor();
    recordAiMonitorEvent('unsupported_tool', { toolId: 'fake-tool' });
    recordAiMonitorEvent('retrieval_miss', { queryPreview: 'xyz' });
    recordAiMonitorEvent('unsupported_tool', { toolId: 'other' });

    const snap = getAiMonitorSnapshot();
    expect(snap.counts.unsupported_tool).toBe(2);
    expect(snap.counts.retrieval_miss).toBe(1);
    expect(snap.lastEvents[0]?.type).toBe('unsupported_tool');
    expect(snap.lastEvents.some((e) => e.type === 'retrieval_miss')).toBe(true);
  });
});
