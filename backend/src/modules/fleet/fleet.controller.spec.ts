import { ForbiddenException } from '@nestjs/common';
import { FleetController } from './fleet.controller';

describe('FleetController entitlement guard', () => {
  const req = {
    user: { id: 'user-1', role: 'physician' },
    tenantContext: {
      organizationId: 'org-1',
      workspaceId: 'ws-1',
      subscriptionPlan: 'professional',
    },
  };

  const buildController = () => {
    const fleetService = {
      getActiveRoutes: jest.fn().mockResolvedValue([]),
      getFleetAlerts: jest.fn().mockResolvedValue([]),
      getFleetSnapshot: jest.fn().mockResolvedValue({}),
    };
    const vehicleTrackingService = {
      getLiveVehicles: jest.fn().mockResolvedValue([]),
    };
    const entitlementService = {
      assertLaunchAllowed: jest.fn().mockResolvedValue({ isLaunchable: true }),
    };
    return {
      controller: new FleetController(
        fleetService as any,
        vehicleTrackingService as any,
        entitlementService as any,
      ),
      fleetService,
      vehicleTrackingService,
      entitlementService,
    };
  };

  it('checks fleet-dashboard entitlement before returning snapshot', async () => {
    const { controller, entitlementService, fleetService } = buildController();

    await controller.getFleetSnapshot(req as any);

    expect(entitlementService.assertLaunchAllowed).toHaveBeenCalledWith(
      expect.objectContaining({ assetId: 'fleet-dashboard', strictEntitlements: true }),
    );
    expect(fleetService.getFleetSnapshot).toHaveBeenCalled();
  });

  it('blocks fleet endpoints when entitlement service rejects access', async () => {
    const { controller, entitlementService, vehicleTrackingService } = buildController();
    entitlementService.assertLaunchAllowed.mockRejectedValue(
      new ForbiddenException('Feature access denied: pack-required'),
    );

    await expect(controller.getFleetVehicles(req as any)).rejects.toBeInstanceOf(ForbiddenException);
    expect(vehicleTrackingService.getLiveVehicles).not.toHaveBeenCalled();
  });
});