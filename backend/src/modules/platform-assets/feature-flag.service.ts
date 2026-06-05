import { Injectable } from '@nestjs/common';
import {
  FeatureFlagDefinition,
  FeatureFlagState,
  FEATURE_FLAG_REGISTRY,
  getFeatureFlagForAsset,
  normalizeFeatureFlagState,
} from '../../config/featureFlags.config';

@Injectable()
export class FeatureFlagService {
  getRegistry(): FeatureFlagDefinition[] {
    return FEATURE_FLAG_REGISTRY;
  }

  getFeatureFlagForAsset(assetId: string): FeatureFlagDefinition | undefined {
    return getFeatureFlagForAsset(assetId);
  }

  resolveState(
    featureFlagId: string | undefined,
    organizationSettings?: Record<string, any> | null,
  ): FeatureFlagState {
    if (!featureFlagId) return FeatureFlagState.ENABLED;

    const flag = FEATURE_FLAG_REGISTRY.find((item) => item.id === featureFlagId);
    const overrides =
      organizationSettings?.featureFlagOverrides ||
      organizationSettings?.featureFlags ||
      organizationSettings?.rolloutFlags ||
      {};

    return normalizeFeatureFlagState(overrides[featureFlagId] || flag?.defaultState);
  }

  resolveAssetState(
    assetId: string,
    organizationSettings?: Record<string, any> | null,
  ): FeatureFlagState {
    const flag = this.getFeatureFlagForAsset(assetId);
    return this.resolveState(flag?.id, organizationSettings);
  }

  isLaunchableState(state: FeatureFlagState): boolean {
    return [
      FeatureFlagState.ENABLED,
      FeatureFlagState.BETA,
      FeatureFlagState.EXPERIMENTAL,
    ].includes(state);
  }
}
