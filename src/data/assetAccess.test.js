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
    const tool = { id: 'audit-logs', lifecycleState: 'admin-only' };
    expect(resolveAssetAccessState(tool, null, 'student').accessState).toBe(
      ASSET_ACCESS_STATES.REQUIRES_ADMIN
    );
    expect(resolveAssetAccessState(tool, null, 'admin').accessState).toBe(ASSET_ACCESS_STATES.ALLOWED);
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
});
