import { ForbiddenException, NotFoundException } from '@nestjs/common';
import { PlatformAssetsController } from './platform-assets.controller';
import { UserRole } from '../users/entities/user.entity';

describe('PlatformAssetsController entitlement visibility', () => {
  function buildController() {
    const membershipRepository = { findOne: jest.fn() };
    const platformAssetsService = {
      listAssets: jest.fn().mockResolvedValue([
        { id: 'qsofa', title: 'qSOFA' },
        { id: 'locked-ai', title: 'Locked AI' },
      ]),
      getAssetById: jest.fn().mockResolvedValue({ id: 'locked-ai', title: 'Locked AI' }),
    };
    const platformContextService = {
      getContextForUser: jest.fn().mockResolvedValue({
        entitledAssetIds: ['qsofa'],
        assetAccessDecisions: {
          qsofa: { isLaunchable: true },
          'locked-ai': { isLaunchable: false },
        },
      }),
    };
    const controller = new PlatformAssetsController(
      membershipRepository as any,
      platformAssetsService as any,
      platformContextService as any,
      {} as any,
      {} as any,
      {} as any,
      {} as any,
      {} as any,
      {} as any,
      {} as any,
      {} as any,
    );

    return { controller, platformAssetsService, platformContextService };
  }

  it('lists only entitled launchable assets for the current user', async () => {
    const { controller, platformAssetsService } = buildController();

    const result = await controller.listAssets(
      { user: { id: 'user-1' } },
      undefined,
      undefined,
      undefined,
    );

    expect(platformAssetsService.listAssets).toHaveBeenCalledWith({
      query: undefined,
      assetType: undefined,
      packId: undefined,
      lifecycle: undefined,
    });
    expect(result).toEqual([{ id: 'qsofa', title: 'qSOFA' }]);
  });

  it('hides asset detail when the asset is not entitled', async () => {
    const { controller } = buildController();

    await expect(
      controller.getAsset({ user: { id: 'user-1' } }, 'locked-ai'),
    ).rejects.toBeInstanceOf(NotFoundException);
  });
});

describe('PlatformAssetsController.setRoleProfile authorization', () => {
  function buildController() {
    const platformAssetsService = { updateUserRoleProfile: jest.fn().mockResolvedValue({ roleProfileId: 'emergency-physician' }) };
    const controller = new PlatformAssetsController(
      {} as any,
      platformAssetsService as any,
      {} as any,
      {} as any,
      {} as any,
      {} as any,
      {} as any,
      {} as any,
      {} as any,
      {} as any,
      {} as any,
    );
    return { controller, platformAssetsService };
  }

  it('rejects role-profile self-assignment for a user with no role-management permission', async () => {
    const { controller, platformAssetsService } = buildController();

    // roleProfileId drives real READ_PHI/WRITE_PHI/EXPORT_PHI grants via
    // hasSaasProfilePermission in AuthorizationGuard -- a STUDENT account
    // (no clinical PHI access by role) must not be able to grant itself
    // 'emergency-physician' just by calling this endpoint.
    await expect(
      controller.setRoleProfile(
        { user: { id: 'user-1', role: UserRole.STUDENT } },
        'emergency-physician',
      ),
    ).rejects.toBeInstanceOf(ForbiddenException);
    expect(platformAssetsService.updateUserRoleProfile).not.toHaveBeenCalled();
  });

  it('allows role-profile assignment for an admin', async () => {
    const { controller, platformAssetsService } = buildController();

    const result = await controller.setRoleProfile(
      { user: { id: 'user-1', role: UserRole.ADMIN } },
      'emergency-physician',
    );

    expect(platformAssetsService.updateUserRoleProfile).toHaveBeenCalledWith(
      'user-1',
      'emergency-physician',
    );
    expect(result).toEqual({ roleProfileId: 'emergency-physician' });
  });
});
