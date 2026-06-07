import { describe, expect, it } from 'vitest';
import {
  ASSET_ACCESS_STATES,
  filterVisibleTools,
  projectToolsWithAccess,
  resolveAssetAccessState,
} from './assetAccess';
import {
  getPlatformEntitlementContext,
  setPlatformEntitlementContext,
} from './assetEntitlements';

describe('assetAccess', () => {
  it('marks locked assets when org entitlements exclude tool', () => {
    setPlatformEntitlementContext({
      organization: { id: 'org-1' },
      entitledAssetIds: ['qsofa'],
    });
    const tool = { id: 'sofa-score', lifecycleState: 'active', executorStatus: 'unsupported' };
    const { accessState } = resolveAssetAccessState(
      tool,
      getPlatformEntitlementContext(),
      'physician'
    );
    expect(accessState).toBe(ASSET_ACCESS_STATES.LOCKED);
    setPlatformEntitlementContext(null);
  });

  it('locks organization assets with empty entitlements in strict SaaS mode', () => {
    setPlatformEntitlementContext({
      organization: { id: 'org-1' },
      entitledAssetIds: [],
      strictSaasEntitlements: true,
    });
    const tool = { id: 'qsofa', lifecycleState: 'active', executorStatus: 'registered' };
    expect(resolveAssetAccessState(tool, getPlatformEntitlementContext(), 'physician').accessState).toBe(
      ASSET_ACCESS_STATES.LOCKED
    );
    setPlatformEntitlementContext(null);
  });

  it('marks assets outside the active workspace as restricted', () => {
    setPlatformEntitlementContext({
      organization: { id: 'org-1' },
      entitledAssetIds: ['qsofa', 'news2'],
      entitledPackIds: ['core-platform'],
      legacyToolAliases: ['qsofa'],
    });
    const tool = { id: 'news2', lifecycleState: 'active', executorStatus: 'registered' };
    expect(resolveAssetAccessState(tool, getPlatformEntitlementContext(), 'physician')).toEqual({
      accessState: ASSET_ACCESS_STATES.RESTRICTED,
      reasons: ['workspace'],
    });
    setPlatformEntitlementContext(null);
  });

  it('admin-only tools require admin role', () => {
    setPlatformEntitlementContext(null);
    const tool = { id: 'system-config', lifecycleState: 'active' };
    expect(resolveAssetAccessState(tool, null, 'student').accessState).toBe(
      ASSET_ACCESS_STATES.ADMIN_ONLY
    );
    expect(resolveAssetAccessState(tool, null, 'admin').accessState).toBe(ASSET_ACCESS_STATES.ALLOWED);
  });

  it('applies canonical asset lifecycle states within organization context', () => {
    const organizationContext = { organization: { id: 'org-1' } };

    expect(resolveAssetAccessState({ id: 'draft-tool', lifecycleState: 'draft' }, organizationContext, 'admin')).toEqual({
      accessState: ASSET_ACCESS_STATES.HIDDEN,
      reasons: ['draft'],
    });
    expect(resolveAssetAccessState({ id: 'beta-tool', lifecycleState: 'beta' }, null, 'admin')).toEqual({
      accessState: ASSET_ACCESS_STATES.BETA,
      reasons: ['beta'],
    });
    expect(resolveAssetAccessState({ id: 'deprecated-tool', lifecycleState: 'deprecated' }, null, 'admin')).toEqual({
      accessState: ASSET_ACCESS_STATES.RESTRICTED,
      reasons: ['deprecated'],
    });
    expect(resolveAssetAccessState({ id: 'archived-tool', lifecycleState: 'archived' }, organizationContext, 'admin')).toEqual({
      accessState: ASSET_ACCESS_STATES.HIDDEN,
      reasons: ['archived'],
    });
  });

  it('blocks disabled rollout before entitlement checks', () => {
    const tool = { id: 'dispatch-ai', lifecycleState: 'active', executorStatus: 'registered' };
    expect(
      resolveAssetAccessState(
        tool,
        {
          organization: {
            id: 'org-1',
            settings: { featureFlagOverrides: { 'fleet-command': 'disabled' } },
          },
          entitledAssetIds: ['dispatch-ai'],
          entitledPackIds: ['fleet-logistics'],
          subscriptionPlan: 'professional',
        },
        'physician'
      ).accessState
    ).toBe(ASSET_ACCESS_STATES.DISABLED);
  });

  it('marks paid features as subscription-required when plan is too low', () => {
    const tool = { id: 'simulation-suite', lifecycleState: 'active', executorStatus: 'registered' };
    expect(
      resolveAssetAccessState(
        tool,
        {
          organization: { id: 'org-1' },
          entitledAssetIds: ['simulation-suite'],
          entitledPackIds: ['research-education'],
          subscriptionPlan: 'free',
        },
        'physician'
      ).accessState
    ).toBe(ASSET_ACCESS_STATES.SUBSCRIPTION_REQUIRED);
  });

  it('honors server access decisions from platform context', () => {
    const tool = { id: 'qsofa', lifecycleState: 'active', executorStatus: 'registered' };
    expect(
      resolveAssetAccessState(
        tool,
        {
          organization: { id: 'org-1' },
          assetAccessDecisions: {
            qsofa: {
              state: 'locked',
              isVisible: true,
              isLaunchable: false,
              reason: 'asset-not-entitled',
            },
          },
        },
        'physician'
      )
    ).toMatchObject({
      accessState: ASSET_ACCESS_STATES.LOCKED,
      reasons: ['asset-not-entitled'],
    });
  });

  it('filterVisibleTools hides hidden state', () => {
    const tools = [
      { id: 'a', accessState: ASSET_ACCESS_STATES.ALLOWED },
      { id: 'b', accessState: ASSET_ACCESS_STATES.HIDDEN },
    ];
    const visible = filterVisibleTools(tools);
    expect(visible.map((t) => t.id)).toEqual(['a']);
  });

  it('projectToolsWithAccess attaches accessLabel', () => {
    setPlatformEntitlementContext(null);
    const [row] = projectToolsWithAccess(
      [{ id: 'calculators', lifecycleState: 'active', executorStatus: 'registered' }],
      null,
      'physician'
    );
    expect(row.accessLabel).toBeTruthy();
    expect(row.accessState).toBe(ASSET_ACCESS_STATES.ALLOWED);
  });

  it('restricts assets when required permission policy is not satisfied', () => {
    const tool = {
      id: 'patient-summary-ai',
      lifecycleState: 'active',
      executorStatus: 'registered',
      permissionPolicy: { permissions: ['READ_PHI', 'USE_AI_CHAT'], logic: 'all' },
    };

    expect(
      resolveAssetAccessState(
        tool,
        {
          organization: { id: 'org-1' },
          entitledAssetIds: ['patient-summary-ai'],
          workspaceState: { effectivePermissions: ['USE_AI_CHAT'] },
        },
        'physician'
      )
    ).toEqual({
      accessState: ASSET_ACCESS_STATES.RESTRICTED,
      reasons: ['permission'],
    });

    expect(
      resolveAssetAccessState(
        tool,
        {
          organization: { id: 'org-1' },
          entitledAssetIds: ['patient-summary-ai'],
          workspaceState: { effectivePermissions: ['READ_PHI', 'USE_AI_CHAT'] },
        },
        'physician'
      ).accessState
    ).toBe(ASSET_ACCESS_STATES.ALLOWED);
  });

  it('hides automation assets from roles outside the declared role visibility', () => {
    const automation = {
      id: 'automation-device-offline-maintenance',
      lifecycleState: 'active',
      executorStatus: 'registered',
      permissionPolicy: {
        allowedRoles: ['biomedical engineer', 'administrator'],
      },
    };

    expect(
      resolveAssetAccessState(
        automation,
        {
          organization: { id: 'org-1' },
          subscriptionPlan: 'institutional',
          entitledAssetIds: ['automation-device-offline-maintenance'],
          entitledPackIds: ['medical-iot-pack'],
        },
        'student'
      )
    ).toEqual({
      accessState: ASSET_ACCESS_STATES.HIDDEN,
      reasons: ['role-hidden'],
    });
    expect([
      ASSET_ACCESS_STATES.ALLOWED,
      ASSET_ACCESS_STATES.BETA,
    ]).toContain(
      resolveAssetAccessState(
        automation,
        { subscriptionPlan: 'institutional' },
        'biomedical engineer'
      ).accessState
    );
  });
});
