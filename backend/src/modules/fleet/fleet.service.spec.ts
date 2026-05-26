import { FleetService } from './fleet.service';

describe('FleetService', () => {
  const fleetAudit = {
    recordRead: jest.fn().mockResolvedValue(undefined),
  };
  let service: FleetService;

  beforeEach(() => {
    jest.clearAllMocks();
    service = new FleetService(fleetAudit as any);
  });

  it('returns route lines for the live map', async () => {
    const result = await service.getActiveRoutes();

    expect(result.routes).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          id: 'route-north',
          vehicleId: 'VH-101',
          status: 'active',
          etaMinutes: 18,
          path: expect.arrayContaining([expect.objectContaining({ x: 38, y: 28 })]),
        }),
      ]),
    );
    expect(fleetAudit.recordRead).toHaveBeenCalledWith(
      undefined,
      'fleet:routes-active',
      expect.objectContaining({ count: 3, delayedRoutes: 1 }),
    );
  });

  it('returns fleet alerts and combined snapshots', async () => {
    const alerts = await service.getFleetAlerts();
    const snapshot = await service.getFleetSnapshot();

    expect(alerts.alerts).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ vehicleId: 'VH-312', title: 'Low energy' }),
      ]),
    );
    expect(snapshot.vehicles).toHaveLength(5);
    expect(snapshot.routes).toHaveLength(3);
    expect(snapshot.summary.activeAlerts).toBe(snapshot.alerts.length);
  });
});
