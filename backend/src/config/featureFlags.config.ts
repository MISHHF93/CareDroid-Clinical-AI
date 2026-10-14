import {
  FEATURE_FLAG_CATEGORIES as SHARED_FEATURE_FLAG_CATEGORIES,
  FEATURE_FLAG_STATES as SHARED_FEATURE_FLAG_STATES,
  type FeatureFlagCategoryValue,
  type FeatureFlagStateValue,
} from '../../../lib/featureFlags/constants';
import {
  FEATURE_FLAG_REGISTRY as CANONICAL_FEATURE_FLAG_REGISTRY,
  normalizeFeatureFlagState,
  getFeatureFlagForAsset,
  type FeatureFlagDefinition as CanonicalFeatureFlagDefinition,
} from '../../../lib/featureFlags/featureFlagRegistry';

export const FeatureFlagState = SHARED_FEATURE_FLAG_STATES;
export type FeatureFlagState = FeatureFlagStateValue;

export const FeatureFlagCategory = SHARED_FEATURE_FLAG_CATEGORIES;
export type FeatureFlagCategory = FeatureFlagCategoryValue;

export type FeatureFlagDefinition = CanonicalFeatureFlagDefinition;

export const FEATURE_FLAG_REGISTRY: FeatureFlagDefinition[] =
  CANONICAL_FEATURE_FLAG_REGISTRY as unknown as FeatureFlagDefinition[];

export { normalizeFeatureFlagState, getFeatureFlagForAsset };
