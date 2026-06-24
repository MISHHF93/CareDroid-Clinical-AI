import { describe, expect, it } from 'vitest';
import {
  applySimulationTransparencyOverride,
  buildPlatformFeatureTransparency,
  mapEnhancementMaturityToTransparency,
  summarizePlatformFeatureTransparency,
} from './platformFeatureTransparency';

describe('platformFeatureTransparency', () => {
  it('maps enhancement maturity to transparency statuses', () => {
    expect(mapEnhancementMaturityToTransparency('live')).toBe('live');
    expect(mapEnhancementMaturityToTransparency('partial')).toBe('partial');
    expect(mapEnhancementMaturityToTransparency('demo')).toBe('demo');
    expect(mapEnhancementMaturityToTransparency('planned')).toBe('planned');
  });

  it('downgrades live and partial features to demo while simulation is active', () => {
    expect(applySimulationTransparencyOverride('live', true)).toBe('demo');
    expect(applySimulationTransparencyOverride('partial', true)).toBe('demo');
    expect(applySimulationTransparencyOverride('planned', true)).toBe('planned');
    expect(applySimulationTransparencyOverride('live', false)).toBe('live');
  });

  it('builds transparency entries for major platform surfaces', () => {
    const entries = buildPlatformFeatureTransparency({
      simulationActive: true,
      includeRegistryFeatures: false,
      includeFeatureFlags: false,
    });

    expect(entries.length).toBeGreaterThan(10);
    expect(entries.some((entry) => entry.id === 'whiteboard-operational-icons')).toBe(true);
    expect(entries.some((entry) => entry.effectiveStatus === 'demo')).toBe(true);
  });

  it('summarizes effective transparency counts', () => {
    const entries = buildPlatformFeatureTransparency({ simulationActive: true });
    const summary = summarizePlatformFeatureTransparency(entries);
    const total = summary.live + summary.demo + summary.partial + summary.planned;
    expect(total).toBe(entries.length);
  });
});