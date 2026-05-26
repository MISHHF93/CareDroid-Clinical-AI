import { DeviceRegistryService } from './device-registry.service';

describe('DeviceRegistryService', () => {
  const telemetryAudit = {
    recordRead: jest.fn().mockResolvedValue(undefined),
  };
  let service: DeviceRegistryService;

  beforeEach(() => {
    jest.clearAllMocks();
    service = new DeviceRegistryService(telemetryAudit as any);
  });

  it('returns device cards with status, battery, signal, connectivity, room, and alerts', async () => {
    const result = await service.getLiveDevices({
      user: { id: 'user-1' },
      headers: { 'user-agent': 'jest' },
    });

    expect(result.devices).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          id: 'spo2-bed-12',
          status: 'online',
          battery: 82,
          signalStrength: 91,
          connectivity: 'Wi-Fi',
          assignedRoom: 'ICU-12',
          assignedBed: 'Bed 12A',
          activeAlerts: expect.arrayContaining(['Low oxygen saturation']),
        }),
      ]),
    );
    expect(result.summary).toMatchObject({ total: 4, online: 2, warning: 1, offline: 1 });
    expect(telemetryAudit.recordRead).toHaveBeenCalledWith(
      expect.any(Object),
      'telemetry:devices-live',
      expect.objectContaining({ count: 4 }),
    );
  });
});
