import { NotFoundException } from '@nestjs/common';
import { PlatformAssetsController } from './platform-assets.controller';

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

    const result = await controller.listAssets({ user: { id: 'user-1' } }, undefined, undefined, undefined);

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

    await expect(controller.getAsset({ user: { id: 'user-1' } }, 'locked-ai')).rejects.toBeInstanceOf(
      NotFoundException,
    );
  });
});
