import { ForbiddenException } from '@nestjs/common';
import {
  assertEntitlementLaunchFromRequest,
  resolveToolCallingAssetId,
} from './entitlement-launch.util';

describe('entitlement-launch.util', () => {
  it('maps fleet and calculator tool ids to entitlement assets', () => {
    expect(resolveToolCallingAssetId('fleet-dispatch-optimizer')).toBe('fleet-dashboard');
    expect(resolveToolCallingAssetId('news2-calculator')).toBe('calculators');
    expect(resolveToolCallingAssetId('clinical-summary')).toBe('agent-clinical');
  });

  it('asserts launch through entitlement service with tenant context', async () => {
    const entitlementService = {
      assertLaunchAllowed: jest.fn().mockResolvedValue({ isLaunchable: true }),
    };

    await assertEntitlementLaunchFromRequest(
      entitlementService as any,
      {
        tenantContext: {
          organizationId: 'org-1',
          workspaceId: 'ws-emergency',
          userId: 'user-1',
          role: 'physician',
          subscriptionPlan: 'professional',
        },
      },
      'agent-clinical',
    );

    expect(entitlementService.assertLaunchAllowed).toHaveBeenCalledWith(
      expect.objectContaining({
        assetId: 'agent-clinical',
        organizationId: 'org-1',
        workspaceId: 'ws-emergency',
        strictEntitlements: true,
      }),
    );
  });

  it('propagates forbidden responses from entitlement service', async () => {
    const entitlementService = {
      assertLaunchAllowed: jest
        .fn()
        .mockRejectedValue(new ForbiddenException('Feature access denied: pack-required')),
    };

    await expect(
      assertEntitlementLaunchFromRequest(
        entitlementService as any,
        { user: { id: 'user-1' } },
        'fleet-dashboard',
      ),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });
});
