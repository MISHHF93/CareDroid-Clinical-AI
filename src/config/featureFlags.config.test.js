import { describe, expect, it } from 'vitest';
import {
  buildFeatureFlagStateMap,
  FEATURE_FLAG_CATEGORIES,
  FEATURE_FLAG_REGISTRY,
  FEATURE_FLAG_STATES,
  getFeatureFlagsByCategory,
  normalizeFeatureFlagState,
  summarizeFeatureFlags,
} from './featureFlags.config';

describe('featureFlags.config rollout registry', () => {
  it('covers all requested rollout states and categories', () => {
    expect(Object.values(FEATURE_FLAG_STATES)).toEqual([
      'enabled',
      'disabled',
      'beta',
      'experimental',
      'locked',
      'subscription-required',
      'admin-only',
    ]);
    expect(Object.values(FEATURE_FLAG_CATEGORIES)).toEqual([
      'AI',
      'Tools',
      'Calculators',
      'Simulation',
      'Maps',
      'Fleet',
      'IoT',
      'Governance',
    ]);
    for (const category of Object.values(FEATURE_FLAG_CATEGORIES)) {
      expect(FEATURE_FLAG_REGISTRY.some((flag) => flag.category === category), category).toBe(true);
    }
  });

  it('builds runtime state maps from defaults and overrides without code changes', () => {
    const stateMap = buildFeatureFlagStateMap({
      'ai-clinical-copilot': FEATURE_FLAG_STATES.DISABLED,
      'regulatory-workspace': FEATURE_FLAG_STATES.EXPERIMENTAL,
      unknown: 'enabled',
    });

    expect(stateMap['ai-clinical-copilot']).toBe(FEATURE_FLAG_STATES.DISABLED);
    expect(stateMap['regulatory-workspace']).toBe(FEATURE_FLAG_STATES.EXPERIMENTAL);
    expect(stateMap['simulation-suite']).toBe(FEATURE_FLAG_STATES.BETA);
    expect(stateMap).not.toHaveProperty('unknown');
  });

  it('normalizes invalid states and summarizes rollout posture', () => {
    expect(normalizeFeatureFlagState('not-real')).toBe(FEATURE_FLAG_STATES.DISABLED);
    expect(normalizeFeatureFlagState('hidden')).toBe(FEATURE_FLAG_STATES.DISABLED);

    const summary = summarizeFeatureFlags(
      buildFeatureFlagStateMap({
        'regulatory-workspace': 'enabled',
      })
    );

    expect(summary.total).toBe(FEATURE_FLAG_REGISTRY.length);
    expect(summary.liveRolloutCount).toBeGreaterThan(0);
    expect(summary.categoryCounts.Governance).toBeGreaterThanOrEqual(2);
    expect(summary.stateCounts.enabled).toBeGreaterThan(0);
  });

  it('groups flags by category with resolved state attached', () => {
    const grouped = getFeatureFlagsByCategory(
      buildFeatureFlagStateMap({
        'simulation-outcomes': FEATURE_FLAG_STATES.LOCKED,
      })
    );

    expect(grouped.map((group) => group.category)).toEqual(Object.values(FEATURE_FLAG_CATEGORIES));
    expect(grouped.flatMap((group) => group.flags)).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          id: 'simulation-outcomes',
          state: FEATURE_FLAG_STATES.LOCKED,
        }),
      ])
    );
  });
});
