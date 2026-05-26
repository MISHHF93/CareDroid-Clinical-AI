import { VehicleTrackingService } from './vehicle-tracking.service';

describe('VehicleTrackingService', () => {
  const fleetAudit = {
    recordRead: jest.fn().mockResolvedValue(undefined),
  };
  let service: VehicleTrackingService;

  beforeEach(() => {
    jest.clearAllMocks();
    service = new VehicleTrackingService(fleetAudit as any);
  });

  it('returns live vehicle markers with ETA, status, alerts, and utilization summary', async () => {
    const result = await service.getLiveVehicles({
      user: { id: 'user-1' },
      headers: { 'user-agent': 'jest' },
    });

    expect(result.vehicles).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          id: 'VH-101',
          status: 'occupied',
          etaMinutes: 18,
          utilizationPercent: 88,
          mapPosition: { x: 38, y: 28 },
        }),
      ]),
    );
    expect(result.summary).toMatchObject({
      totalVehicles: 5,
      activeVehicles: 3,
      activeRoutes: 2,
      delayedRoutes: 1,
      averageUtilizationPercent: expect.any(Number),
      averageEtaMinutes: expect.any(Number),
    });
    expect(fleetAudit.recordRead).toHaveBeenCalledWith(
      expect.any(Object),
      'fleet:vehicles-live',
      expect.objectContaining({ count: 5, staleVehicles: 1, offlineVehicles: 1 }),
    );
  });
});
