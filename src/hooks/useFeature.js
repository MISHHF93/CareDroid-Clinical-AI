import { useCallback } from 'react';
import { FEATURE_REGISTRY_BY_ID } from '../../lib/features/featureRegistry';
import { useFeatureStore } from '../../store/featureStore';

export function useFeature(featureId) {
  const flags = useFeatureStore((state) => state.flags);
  const overrides = useFeatureStore((state) => state.overrides);
  const tier = useFeatureStore((state) => state.tier);
  const isEnabled = useFeatureStore((state) => state.isEnabled);
  const toggleFeature = useFeatureStore((state) => state.toggleFeature);
  const feature = featureId ? FEATURE_REGISTRY_BY_ID[featureId] : null;
  const enabled = featureId ? isEnabled(featureId) : true;

  const toggle = useCallback(
    (nextEnabled = !enabled) => {
      if (!featureId) return Promise.resolve(false);
      return toggleFeature(featureId, nextEnabled);
    },
    [enabled, featureId, toggleFeature]
  );

  return {
    enabled,
    feature,
    flags,
    overrides,
    tier,
    toggle,
  };
}

export default useFeature;
