import { DigitalTwinService } from './digital-twin.service';

describe('DigitalTwinService', () => {
  const fleetService = {
    getFleetSnapshot: jest.fn(),
  };
  const platformAssetsService = {
    getOrganizationEntitlements: jest.fn(),
  };

  let service: DigitalTwinService;

  beforeEach(() => {
    jest.clearAllMocks();
    service = new DigitalTwinService(fleetService as any, platformAssetsService as any);
    fleetService.getFleetSnapshot.mockResolvedValue({
      vehicles: [{ id: 'amb-1', name: 'Ambulance 1', status: 'available', eta: '4 min' }],
    });
  });

  it('labels snapshots without organization context as demo contracts', async () => {
    const snapshot = await service.getSnapshot();

    expect(snapshot.organizationId).toBeNull();
    expect(snapshot.source).toMatchObject({
      mode: 'demo',
      status: 'demo_contract',
      demoData: true,
      liveDataAvailable: false,
      organizationScoped: false,
    });
    expect(snapshot.capabilities).toMatchObject({
      hospitalMap: true,
      occupancy: true,
      iot: true,
      fleet: true,
      alerts: true,
    });
    expect(platformAssetsService.getOrganizationEntitlements).not.toHaveBeenCalled();
  });

  it('marks organization snapshots as contract-ready demo data when digital twin packs are entitled', async () => {
    platformAssetsService.getOrganizationEntitlements.mockResolvedValue([
      { packId: 'digital-twin-pack' },
      { packId: 'medical-iot-pack' },
    ]);

    const snapshot = await service.getSnapshot('org-1');

    expect(platformAssetsService.getOrganizationEntitlements).toHaveBeenCalledWith('org-1');
    expect(snapshot.source).toMatchObject({
      mode: 'organization',
      status: 'organization_contract_ready',
      demoData: true,
      liveDataAvailable: false,
      organizationScoped: true,
      entitlementPackIds: ['digital-twin-pack', 'medical-iot-pack'],
    });
    expect(snapshot.sourceLabel).toMatch(/live data not connected/i);
    expect(snapshot.capabilities).toMatchObject({
      hospitalMap: true,
      occupancy: true,
      iot: true,
      fleet: false,
      alerts: true,
    });
    expect(snapshot.dataContracts).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          domain: 'fleet',
          sourceMode: 'organization',
          status: 'not-entitled',
        }),
      ]),
    );
  });
});
