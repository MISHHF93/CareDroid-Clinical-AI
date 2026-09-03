import { useCallback } from 'react';
import { FEATURE_REGISTRY_BY_ID } from '../../lib/features/featureRegistry';
import { useEmergencyStore } from '../store/emergencyStore';

export function useFeature(featureId) {
  const flags = useEmergencyStore((state) => state.flags);
  const overrides = useEmergencyStore((state) => state.overrides);
  const tier = useEmergencyStore((state) => state.tier);
  const isEnabled = useEmergencyStore((state) => state.isEnabled);
  const toggleFeature = useEmergencyStore((state) => state.toggleFeature);
  const feature = featureId ? FEATURE_REGISTRY_BY_ID[featureId] : null;
  const enabled = featureId ? isEnabled(featureId) : true;

  const toggle = useCallback(
    (nextEnabled = !enabled) => {
      if (!featureId) return Promise.resolve(false);
      return toggleFeature(featureId, nextEnabled);
    },
    [enabled, featureId, toggleFeature],
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
