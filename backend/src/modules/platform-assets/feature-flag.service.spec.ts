import { FeatureFlagState } from '../../config/featureFlags.config';
import { FeatureFlagService } from './feature-flag.service';

describe('FeatureFlagService', () => {
  let service: FeatureFlagService;

  beforeEach(() => {
    service = new FeatureFlagService();
  });

  it('resolves tenant, workspace, role, beta, and internal flag scopes', () => {
    const settings = {
      featureFlagPlatform: {
        tenantFlags: { 'ai-clinical-copilot': FeatureFlagState.DISABLED },
        workspaceFlags: {
          'workspace-1': { 'ai-clinical-copilot': FeatureFlagState.ENABLED },
        },
        roleFlags: {
          clinician: { 'ai-clinical-copilot': FeatureFlagState.LOCKED },
        },
        betaFlags: { 'simulation-suite': FeatureFlagState.BETA },
        internalFlags: { 'regulatory-workspace': FeatureFlagState.ENABLED },
      },
    };

    expect(service.resolveState('ai-clinical-copilot', settings)).toBe(
      FeatureFlagState.DISABLED,
    );
    expect(
      service.resolveState('ai-clinical-copilot', settings, { workspaceId: 'workspace-1' }),
    ).toBe(FeatureFlagState.ENABLED);
    expect(
      service.resolveState('ai-clinical-copilot', settings, { userRole: 'clinician' }),
    ).toBe(FeatureFlagState.LOCKED);
    expect(service.resolveState('simulation-suite', settings)).toBe(FeatureFlagState.BETA);
    expect(service.resolveState('regulatory-workspace', settings)).toBe(
      FeatureFlagState.ADMIN_ONLY,
    );
    expect(
      service.resolveState('regulatory-workspace', settings, { includeInternal: true }),
    ).toBe(FeatureFlagState.ENABLED);
  });

  it('applies scoped flag updates and exposes a management model', () => {
    const nextSettings = service.applyUpdate(
      {},
      {
        scope: 'workspace',
        flagId: 'simulation-suite',
        state: FeatureFlagState.DISABLED,
        workspaceId: 'education',
        updatedBy: 'user-1',
      },
    );

    expect(nextSettings.workspaceFlags.education['simulation-suite']).toBe(
      FeatureFlagState.DISABLED,
    );
    expect(nextSettings.updatedBy).toBe('user-1');

    const model = service.buildManagementModel({
      organizationId: 'org-1',
      organizationName: 'Demo Org',
      settings: { featureFlagPlatform: nextSettings },
      workspaceDefaults: [{ id: 'education', name: 'Education' }],
      roleProfiles: [{ id: 'administrator', label: 'Administrator' }],
    });

    expect(model.supportedScopes).toEqual(
      expect.arrayContaining(['tenant', 'workspace', 'role', 'beta', 'internal']),
    );
    expect(model.workspaces).toEqual([expect.objectContaining({ id: 'education' })]);
    expect(model.roles).toEqual(expect.arrayContaining(['administrator']));
    expect(
      model.flags.find((flag) => flag.id === 'simulation-suite')?.scopes.workspaces.education,
    ).toBe(FeatureFlagState.DISABLED);
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
