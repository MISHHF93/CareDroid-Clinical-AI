import { AssetAccessService } from './asset-access.service';
import {
  AssetAccessState,
  BackendAssetStatus,
  PlatformAssetLifecycle,
} from './enums/platform-asset.enums';
import { PlatformAsset } from './entities/platform-asset.entity';
import { User, UserRole } from '../users/entities/user.entity';
import { PlatformAssetsService } from './platform-assets.service';
import { PlatformContextService } from './platform-context.service';
import { UserPreferencesService } from '../user-profile/user-preferences.service';

function makeUser(overrides: Partial<User> = {}): User {
  return { id: 'user-1', role: UserRole.PHYSICIAN, ...overrides } as User;
}

function makeAsset(overrides: Partial<PlatformAsset> = {}): PlatformAsset {
  return {
    id: 'asset-1',
    lifecycle: PlatformAssetLifecycle.ACTIVE,
    governance: {},
    permissionPolicy: {},
    ...overrides,
  } as unknown as PlatformAsset;
}

function baseParams(overrides: Partial<Parameters<AssetAccessService['resolveAccess']>[1]> = {}) {
  return {
    user: makeUser(),
    entitled: new Set<string>(),
    hidden: new Set<string>(),
    asset: makeAsset(),
    hasOrganization: false,
    strictEntitlements: false,
    workspaceEnabled: new Set<string>(),
    pinned: new Set<string>(),
    workspaceRecommended: new Set<string>(),
    roleRecommended: new Set<string>(),
    recent: new Set<string>(),
    ...overrides,
  };
}

describe('AssetAccessService.resolveAccess (the access-state decision engine)', () => {
  let service: AssetAccessService;

  beforeEach(() => {
    service = new AssetAccessService({} as any, {} as any, {} as any);
  });

  it('defaults to ALLOWED with no reasons for a plain active asset', () => {
    const result = service.resolveAccess('asset-1', baseParams());
    expect(result.accessState).toBe(AssetAccessState.ALLOWED);
    expect(result.reasons).toEqual([]);
  });

  it('user-hidden wins over every other check, including admin-only', () => {
    const result = service.resolveAccess(
      'asset-1',
      baseParams({
        hidden: new Set(['asset-1']),
        asset: makeAsset({ governance: { adminOnly: true } }),
        user: makeUser({ role: UserRole.STUDENT }),
      }),
    );
    expect(result.accessState).toBe(AssetAccessState.HIDDEN);
    expect(result.reasons).toEqual(['user-hidden']);
  });

  describe('admin-only gating', () => {
    it.each([
      ['governance.adminOnly', { governance: { adminOnly: true } }],
      ['governance.visibility=admin-only', { governance: { visibility: 'admin-only' } }],
      ['governance.audience=admin-only', { governance: { audience: 'admin-only' } }],
      ['permissionPolicy.adminOnly', { permissionPolicy: { adminOnly: true } }],
    ])('blocks a non-admin via %s', (_label, assetOverrides) => {
      const result = service.resolveAccess(
        'asset-1',
        baseParams({ asset: makeAsset(assetOverrides), user: makeUser({ role: UserRole.NURSE }) }),
      );
      expect(result.accessState).toBe(AssetAccessState.REQUIRES_ADMIN);
      expect(result.reasons).toEqual(['admin-only-policy']);
    });

    it('lets an admin through an admin-only asset, continuing evaluation rather than short-circuiting to ALLOWED', () => {
      const result = service.resolveAccess(
        'asset-1',
        baseParams({
          asset: makeAsset({
            governance: { adminOnly: true },
            lifecycle: PlatformAssetLifecycle.BETA,
          }),
          user: makeUser({ role: UserRole.ADMIN }),
        }),
      );
      expect(result.accessState).toBe(AssetAccessState.ALLOWED);
      expect(result.reasons).toEqual(['admin-lifecycle-override', 'beta']);
    });
  });

  it('DRAFT lifecycle hides the asset from everyone, even an admin', () => {
    const result = service.resolveAccess(
      'asset-1',
      baseParams({
        asset: makeAsset({ lifecycle: PlatformAssetLifecycle.DRAFT }),
        user: makeUser({ role: UserRole.ADMIN }),
      }),
    );
    expect(result.accessState).toBe(AssetAccessState.HIDDEN);
    expect(result.reasons).toEqual(['draft']);
  });

  it('ARCHIVED lifecycle hides the asset', () => {
    const result = service.resolveAccess(
      'asset-1',
      baseParams({ asset: makeAsset({ lifecycle: PlatformAssetLifecycle.ARCHIVED }) }),
    );
    expect(result.accessState).toBe(AssetAccessState.HIDDEN);
    expect(result.reasons).toEqual(['archived']);
  });

  it('a human-review-gated asset blocks a student but not other roles', () => {
    const asset = makeAsset({ governance: { requiresHumanReview: true } });
    const student = service.resolveAccess(
      'asset-1',
      baseParams({ asset, user: makeUser({ role: UserRole.STUDENT }) }),
    );
    expect(student.accessState).toBe(AssetAccessState.REQUIRES_REVIEW);
    expect(student.reasons).toEqual(['human-review-required']);

    const physician = service.resolveAccess(
      'asset-1',
      baseParams({ asset, user: makeUser({ role: UserRole.PHYSICIAN }) }),
    );
    expect(physician.accessState).toBe(AssetAccessState.ALLOWED);
  });

  it('an asset with no backend executor is reported as UNSUPPORTED', () => {
    const result = service.resolveAccess(
      'asset-1',
      baseParams({ asset: makeAsset({ backendStatus: BackendAssetStatus.UNSUPPORTED }) }),
    );
    expect(result.accessState).toBe(AssetAccessState.UNSUPPORTED);
    expect(result.reasons).toEqual(['no-backend-executor']);
  });

  describe('demo-labeled assets', () => {
    it('is DEMO_ONLY when the org has no entitlement gating in effect', () => {
      const result = service.resolveAccess(
        'asset-1',
        baseParams({ asset: makeAsset({ demoStatus: 'demo' }) }),
      );
      expect(result.accessState).toBe(AssetAccessState.DEMO_ONLY);
      expect(result.reasons).toEqual(['demo-labeled']);
    });

    it('flips to LOCKED instead when the org has entitlement packs and this asset is not in them', () => {
      const result = service.resolveAccess(
        'asset-1',
        baseParams({
          asset: makeAsset({ backendStatus: BackendAssetStatus.DEMO }),
          hasOrganization: true,
          entitled: new Set(['some-other-asset']),
        }),
      );
      expect(result.accessState).toBe(AssetAccessState.LOCKED);
      expect(result.reasons).toEqual(['pack-not-enabled']);
    });

    it('stays DEMO_ONLY (not LOCKED) when the org is entitled to this specific demo asset', () => {
      const result = service.resolveAccess(
        'asset-1',
        baseParams({
          asset: makeAsset({ demoStatus: 'demo' }),
          hasOrganization: true,
          entitled: new Set(['asset-1']),
        }),
      );
      expect(result.accessState).toBe(AssetAccessState.DEMO_ONLY);
    });
  });

  describe('entitlement gating for non-demo assets', () => {
    it('LOCKED when the org has entitlement packs and this asset is not among them', () => {
      const result = service.resolveAccess(
        'asset-1',
        baseParams({ hasOrganization: true, entitled: new Set(['some-other-asset']) }),
      );
      expect(result.accessState).toBe(AssetAccessState.LOCKED);
      expect(result.reasons).toEqual(['not-in-entitled-packs']);
    });

    it('LOCKED under strictEntitlements even with an empty entitled set (no implicit access)', () => {
      const result = service.resolveAccess(
        'asset-1',
        baseParams({ hasOrganization: true, strictEntitlements: true, entitled: new Set() }),
      );
      expect(result.accessState).toBe(AssetAccessState.LOCKED);
    });

    it('ALLOWED when hasOrganization is true but the org has zero entitled packs configured (open-access org)', () => {
      const result = service.resolveAccess(
        'asset-1',
        baseParams({ hasOrganization: true, strictEntitlements: false, entitled: new Set() }),
      );
      expect(result.accessState).toBe(AssetAccessState.ALLOWED);
    });

    it('ALLOWED once the asset is actually in the entitled set', () => {
      const result = service.resolveAccess(
        'asset-1',
        baseParams({ hasOrganization: true, entitled: new Set(['asset-1']) }),
      );
      expect(result.accessState).toBe(AssetAccessState.ALLOWED);
    });
  });

  it('RESTRICTED when the workspace has an explicit allow-list and this asset is not on it', () => {
    const result = service.resolveAccess(
      'asset-1',
      baseParams({ workspaceEnabled: new Set(['some-other-asset']) }),
    );
    expect(result.accessState).toBe(AssetAccessState.RESTRICTED);
    expect(result.reasons).toEqual(['workspace-not-enabled']);
  });

  it('DEPRECATED lifecycle is RESTRICTED, not hidden or blocked outright', () => {
    const result = service.resolveAccess(
      'asset-1',
      baseParams({ asset: makeAsset({ lifecycle: PlatformAssetLifecycle.DEPRECATED }) }),
    );
    expect(result.accessState).toBe(AssetAccessState.RESTRICTED);
    expect(result.reasons).toEqual(['deprecated']);
  });

  it('BETA lifecycle is ALLOWED with a beta reason tag', () => {
    const result = service.resolveAccess(
      'asset-1',
      baseParams({ asset: makeAsset({ lifecycle: PlatformAssetLifecycle.BETA }) }),
    );
    expect(result.accessState).toBe(AssetAccessState.ALLOWED);
    expect(result.reasons).toEqual(['beta']);
  });

  describe('priority ordering (only applies to ALLOWED/DEMO_ONLY states)', () => {
    it('pinned beats workspace-recommended beats role-recommended beats recent', () => {
      const all = new Set(['asset-1']);
      const pinned = service.resolveAccess(
        'asset-1',
        baseParams({ pinned: all, workspaceRecommended: all, roleRecommended: all, recent: all }),
      );
      expect(pinned.priorityReason).toBe('pinned');
      expect(pinned.priority).toBe(10);

      const workspaceRec = service.resolveAccess(
        'asset-1',
        baseParams({ workspaceRecommended: all, roleRecommended: all, recent: all }),
      );
      expect(workspaceRec.priorityReason).toBe('workspace-recommended');

      const roleRec = service.resolveAccess(
        'asset-1',
        baseParams({ roleRecommended: all, recent: all }),
      );
      expect(roleRec.priorityReason).toBe('role-recommended');

      const recent = service.resolveAccess('asset-1', baseParams({ recent: all }));
      expect(recent.priorityReason).toBe('recent');

      const none = service.resolveAccess('asset-1', baseParams());
      expect(none.priorityReason).toBe('permitted');
      expect(none.priority).toBe(50);
    });

    it('a LOCKED asset always gets priority 900/"permitted", ignoring pinned/recommended flags — you cannot pin your way past a lock', () => {
      const result = service.resolveAccess(
        'asset-1',
        baseParams({
          hasOrganization: true,
          entitled: new Set(['some-other-asset']),
          pinned: new Set(['asset-1']),
        }),
      );
      expect(result.accessState).toBe(AssetAccessState.LOCKED);
      expect(result.priority).toBe(900);
      expect(result.priorityReason).toBe('permitted');
    });
  });

  describe('effectiveAccessState (the external SaaS-facing state)', () => {
    it.each([
      [AssetAccessState.HIDDEN, 'hidden', { hidden: new Set(['asset-1']) }],
      [AssetAccessState.LOCKED, 'locked', { hasOrganization: true, entitled: new Set(['other']) }],
      [
        AssetAccessState.RESTRICTED,
        'restricted',
        { asset: makeAsset({ lifecycle: PlatformAssetLifecycle.DEPRECATED }) },
      ],
      [
        AssetAccessState.UNSUPPORTED,
        'unsupported',
        { asset: makeAsset({ backendStatus: BackendAssetStatus.UNSUPPORTED }) },
      ],
      [AssetAccessState.DEMO_ONLY, 'demo-only', { asset: makeAsset({ demoStatus: 'demo' }) }],
    ])('%s maps to effectiveAccessState "%s"', (expectedState, expectedEffective, overrides) => {
      const result = service.resolveAccess('asset-1', baseParams(overrides as any));
      expect(result.accessState).toBe(expectedState);
      expect(result.effectiveAccessState).toBe(expectedEffective);
    });

    it('an ALLOWED asset with no pin/recommendation maps to "visible", not "recommended" or "pinned"', () => {
      const result = service.resolveAccess('asset-1', baseParams());
      expect(result.effectiveAccessState).toBe('visible');
    });

    it('an ALLOWED + pinned asset maps to "pinned"', () => {
      const result = service.resolveAccess('asset-1', baseParams({ pinned: new Set(['asset-1']) }));
      expect(result.effectiveAccessState).toBe('pinned');
    });

    it('an ALLOWED + role-recommended asset maps to "recommended"', () => {
      const result = service.resolveAccess(
        'asset-1',
        baseParams({ roleRecommended: new Set(['asset-1']) }),
      );
      expect(result.effectiveAccessState).toBe('recommended');
    });

    it('an ALLOWED + merely-recent asset still maps to "visible", not "recommended"', () => {
      const result = service.resolveAccess('asset-1', baseParams({ recent: new Set(['asset-1']) }));
      expect(result.effectiveAccessState).toBe('visible');
    });
  });
});

describe('AssetAccessService.getUserAssetAccess (orchestration)', () => {
  let platformAssetsService: { listAssets: jest.Mock; resolveEntitledAssetIds: jest.Mock };
  let platformContextService: { getContextForUser: jest.Mock };
  let userPreferencesService: { getPreferences: jest.Mock };
  let service: AssetAccessService;

  function ctxWith(overrides: Record<string, unknown> = {}) {
    return {
      organization: undefined,
      workspace: undefined,
      roleProfile: undefined,
      entitledAssetIds: [],
      entitledPackIds: [],
      legacyToolAliases: [],
      strictSaasEntitlements: false,
      ...overrides,
    };
  }

  beforeEach(() => {
    platformAssetsService = { listAssets: jest.fn(), resolveEntitledAssetIds: jest.fn() };
    platformContextService = { getContextForUser: jest.fn() };
    userPreferencesService = {
      getPreferences: jest.fn().mockResolvedValue({ toolPreferences: {} }),
    };
    service = new AssetAccessService(
      platformAssetsService as unknown as PlatformAssetsService,
      platformContextService as unknown as PlatformContextService,
      userPreferencesService as unknown as UserPreferencesService,
    );
  });

  it('defaults the asset id list to the union of entitled ids and every known asset when none are requested', async () => {
    platformContextService.getContextForUser.mockResolvedValue(
      ctxWith({ entitledAssetIds: ['asset-x'] }),
    );
    platformAssetsService.listAssets.mockResolvedValue([makeAsset({ id: 'asset-y' })]);

    const result = await service.getUserAssetAccess(makeUser());

    expect(result.access.map((row) => row.assetId).sort()).toEqual(['asset-x', 'asset-y']);
  });

  it('scopes to only the requested asset ids when assetIds is passed explicitly', async () => {
    platformContextService.getContextForUser.mockResolvedValue(ctxWith());
    platformAssetsService.listAssets.mockResolvedValue([
      makeAsset({ id: 'asset-a' }),
      makeAsset({ id: 'asset-b' }),
    ]);

    const result = await service.getUserAssetAccess(makeUser(), ['asset-a']);

    expect(result.access.map((row) => row.assetId)).toEqual(['asset-a']);
  });

  it('sorts by priority first — a pinned asset comes before an unpinned one even out of alphabetical order', async () => {
    platformContextService.getContextForUser.mockResolvedValue(ctxWith());
    platformAssetsService.listAssets.mockResolvedValue([
      makeAsset({ id: 'zebra' }),
      makeAsset({ id: 'apple' }),
    ]);
    userPreferencesService.getPreferences.mockResolvedValue({
      toolPreferences: { pinnedAssetIds: ['zebra'] },
    });

    const result = await service.getUserAssetAccess(makeUser());

    expect(result.access.map((row) => row.assetId)).toEqual(['zebra', 'apple']);
  });

  it('falls back to assetId alphabetical order when priority is tied', async () => {
    platformContextService.getContextForUser.mockResolvedValue(ctxWith());
    platformAssetsService.listAssets.mockResolvedValue([
      makeAsset({ id: 'zebra' }),
      makeAsset({ id: 'apple' }),
    ]);

    const result = await service.getUserAssetAccess(makeUser());

    expect(result.access.map((row) => row.assetId)).toEqual(['apple', 'zebra']);
  });

  it('resolves legacy workspace tool-id aliases into real asset ids for the workspace-enabled restriction', async () => {
    platformContextService.getContextForUser.mockResolvedValue(
      ctxWith({ legacyToolAliases: ['medical-iot'] }),
    );
    platformAssetsService.listAssets.mockResolvedValue([
      makeAsset({ id: 'telemetry-monitoring' }),
      makeAsset({ id: 'medical-iot' }),
      makeAsset({ id: 'unrelated-asset' }),
    ]);

    const result = await service.getUserAssetAccess(makeUser());

    expect(result.accessByAssetId['telemetry-monitoring']).toBe(AssetAccessState.ALLOWED);
    expect(result.accessByAssetId['medical-iot']).toBe(AssetAccessState.ALLOWED);
    expect(result.accessByAssetId['unrelated-asset']).toBe(AssetAccessState.RESTRICTED);
  });

  it('merges pinned/hidden/recent ids from every legacy preference field, not just the current one', async () => {
    platformContextService.getContextForUser.mockResolvedValue(ctxWith());
    platformAssetsService.listAssets.mockResolvedValue([
      makeAsset({ id: 'a' }),
      makeAsset({ id: 'b' }),
      makeAsset({ id: 'c' }),
    ]);
    userPreferencesService.getPreferences.mockResolvedValue({
      toolPreferences: {
        pinnedAssetIds: ['a'],
        pinnedToolIds: ['b'],
        saasProfile: { pinnedAssets: ['c'] },
      },
    });

    const result = await service.getUserAssetAccess(makeUser());

    expect(result.pinnedAssetIds.sort()).toEqual(['a', 'b', 'c']);
  });

  it('builds accessByAssetId/effectiveAccessByAssetId as parallel lookup maps of the same access array', async () => {
    platformContextService.getContextForUser.mockResolvedValue(ctxWith());
    platformAssetsService.listAssets.mockResolvedValue([makeAsset({ id: 'a' })]);

    const result = await service.getUserAssetAccess(makeUser());

    expect(result.accessByAssetId['a']).toBe(AssetAccessState.ALLOWED);
    expect(result.effectiveAccessByAssetId['a']).toBe('visible');
  });
});
