import { FEATURE_FLAG_REGISTRY, normalizeFeatureFlagState } from './featureFlags.config';
import { ENTITLEMENT_REGISTRY, getEntitlementRuleForAsset } from './entitlements.config';
import { SEED_PLATFORM_ASSETS } from '../modules/platform-assets/data/platform-asset-seed.data';
import { FeatureFlagService } from '../modules/platform-assets/feature-flag.service';

describe('FEATURE_FLAG_REGISTRY / ENTITLEMENT_REGISTRY consistency', () => {
  it("every ENTITLEMENT_REGISTRY rule's featureFlagId points at a real, registered flag (Cycle 221 regression)", () => {
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

  it('real, DB-catalog-registered asset ids resolve to their intended entitlement rule, not a fail-open default (Cycle 222 regression)', () => {
    // EntitlementService.resolveDecisionFromContext() computes
    // `featureFlagId = rule?.featureFlagId || featureFlagService.getFeatureFlagForAsset(assetId)?.id`.
    // When BOTH lookups miss (no rule's assetIds includes this id, and no
    // flag's assetIds includes it either), featureFlagId ends up `undefined`
    // -- and FeatureFlagService.resolveState()'s very first line is
    // `if (!featureFlagId) return FeatureFlagState.ENABLED`, a deliberate
    // fail-OPEN default for "this asset has no flag at all, allow it".
    // That's correct for a genuinely flag-less asset, but 'diagnosis' (the
    // real DiagnosisAssistant.tsx tool, confirmed via toolRegistry.ts's own
    // `id: 'diagnosis'` and this repo's LEGACY_TOOL_ID_ALIASES entry
    // `'diagnosis-assistant': ['diagnosis']`) DOES have an intended rule --
    // clinical-tools-core's assetIds previously said 'diagnosis-assistant'
    // (a legacy alias, not the canonical id), so the real id 'diagnosis'
    // silently matched neither the rule nor the flag and fell through to the
    // generic fail-open default, bypassing that rule's real
    // requiredPlan/requiredPackIds gating entirely. Same shape for
    // 'clinical-documentation-assistant' (confirmed a real SEED_PLATFORM_ASSETS
    // entry via ai-workflow-pack), previously referenced as
    // 'documentation-assistant' in ai-documentation-assistant's assetIds.
    const catalogIds = new Set(SEED_PLATFORM_ASSETS.map((asset) => asset.id));
    expect(catalogIds.has('clinical-documentation-assistant')).toBe(true);

    const diagnosisRule = getEntitlementRuleForAsset('diagnosis');
    expect(diagnosisRule?.featureFlagId).toBe('clinical-tools-core');

    const featureFlagService = new FeatureFlagService();
    expect(featureFlagService.getFeatureFlagForAsset('diagnosis')?.id).toBe('clinical-tools-core');
    expect(featureFlagService.getFeatureFlagForAsset('clinical-documentation-assistant')?.id).toBe(
      'ai-documentation-assistant',
    );

    // The old, wrong ids are no longer what any real caller passes as
    // assetId, so the registries no longer need to declare them.
    expect(diagnosisRule?.assetIds).not.toContain('diagnosis-assistant');
    const docFlag = FEATURE_FLAG_REGISTRY.find((flag) => flag.id === 'ai-documentation-assistant');
    expect(docFlag?.assetIds).not.toContain('documentation-assistant');
  });
});
