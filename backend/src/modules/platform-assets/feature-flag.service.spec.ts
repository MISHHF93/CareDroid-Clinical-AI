import { FeatureFlagState } from '../../config/featureFlags.config';
import { FeatureFlagService } from './feature-flag.service';

describe('FeatureFlagService', () => {
  let service: FeatureFlagService;

  beforeEach(() => {
    service = new FeatureFlagService();
  });

  it('resolves defaults and organization overrides independently', () => {
    expect(service.resolveState('simulation-suite')).toBe(FeatureFlagState.BETA);
    expect(
      service.resolveState('simulation-suite', {
        featureFlagOverrides: { 'simulation-suite': FeatureFlagState.DISABLED },
      }),
    ).toBe(FeatureFlagState.DISABLED);
  });

  it('maps legacy hidden override input to disabled', () => {
    expect(
      service.resolveState('regulatory-workspace', {
        featureFlags: { 'regulatory-workspace': 'hidden' },
      }),
    ).toBe(FeatureFlagState.DISABLED);
  });

  it('resolves feature flags by asset id', () => {
    expect(service.getFeatureFlagForAsset('dispatch-ai')?.id).toBe('fleet-command');
    expect(service.resolveAssetState('regulatory')).toBe(FeatureFlagState.ADMIN_ONLY);
  });
});
