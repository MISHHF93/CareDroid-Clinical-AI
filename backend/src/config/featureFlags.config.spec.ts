import { FEATURE_FLAG_REGISTRY, normalizeFeatureFlagState } from './featureFlags.config';
import { ENTITLEMENT_REGISTRY } from './entitlements.config';

describe('FEATURE_FLAG_REGISTRY / ENTITLEMENT_REGISTRY consistency', () => {
  it('every ENTITLEMENT_REGISTRY rule\'s featureFlagId points at a real, registered flag (Cycle 221 regression)', () => {
    // EntitlementService.resolveDecisionFromContext() only falls back to a
    // by-assetId flag lookup when rule.featureFlagId is falsy -- a
    // truthy-but-nonexistent id silently and permanently resolves to
    // FeatureFlagState.DISABLED via normalizeFeatureFlagState's own safe
    // fallback, making every asset in that rule unconditionally
    // isVisible:false/isLaunchable:false for every user regardless of
    // subscription tier or pack ownership. 3 rules (patient-experience-pack,
    // predictive-analytics-pack, ems-pre-arrival-pack) referenced flag ids
    // that were never added to FEATURE_FLAG_REGISTRY at all -- including
    // patient-whiteboard/patient-room-display/digital-door-sign, core
    // FREE-tier ED workflow features, not gated premium ones.
    const registeredFlagIds = new Set(FEATURE_FLAG_REGISTRY.map((flag) => flag.id));
    for (const rule of ENTITLEMENT_REGISTRY) {
      expect(registeredFlagIds.has(rule.featureFlagId)).toBe(true);
    }
  });

  it('every registered flag normalizes to a launchable (non-disabled-by-default) state, unless deliberately admin-only', () => {
    for (const flag of FEATURE_FLAG_REGISTRY) {
      const state = normalizeFeatureFlagState(flag.defaultState);
      if (flag.defaultState === 'admin-only') continue;
      expect(state).not.toBe('disabled');
    }
  });

  it('the 3 previously-missing flags resolve correctly', () => {
    const byId = Object.fromEntries(FEATURE_FLAG_REGISTRY.map((f) => [f.id, f]));
    expect(byId['patient-experience-pack']?.defaultState).toBe('enabled');
    expect(byId['patient-experience-pack']?.assetIds).toEqual([
      'patient-whiteboard',
      'patient-room-display',
      'digital-door-sign',
    ]);
    expect(byId['predictive-analytics-pack']?.defaultState).toBe('beta');
    expect(byId['ems-pre-arrival-pack']?.defaultState).toBe('beta');
  });
});
