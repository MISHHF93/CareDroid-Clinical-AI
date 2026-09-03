import { describe, expect, it } from 'vitest';
import {
  DEMO_LIVE_STATES,
  getDemoLiveStateDescription,
  getDemoLiveStateLabel,
} from './demoLiveState';

describe('demoLiveState', () => {
  it('normalizes required demo/live state labels', () => {
    expect(getDemoLiveStateLabel(DEMO_LIVE_STATES.LIVE)).toBe('Live');
    expect(getDemoLiveStateLabel(DEMO_LIVE_STATES.DEMO)).toBe('Demo');
    expect(getDemoLiveStateLabel(DEMO_LIVE_STATES.MOCK)).toBe('Mock');
    expect(getDemoLiveStateLabel(DEMO_LIVE_STATES.SIMULATED)).toBe('Simulated');
    expect(getDemoLiveStateLabel(DEMO_LIVE_STATES.BACKEND_UNAVAILABLE)).toBe('Backend unavailable');
    expect(getDemoLiveStateLabel(DEMO_LIVE_STATES.UNSUPPORTED)).toBe('Unsupported');
  });

  it('falls back unknown states to unsupported', () => {
    expect(getDemoLiveStateLabel('missing-state')).toBe('Unsupported');
    expect(getDemoLiveStateDescription('missing-state')).toMatch(
      /not yet connected to a live system/i,
    );
  });
});
