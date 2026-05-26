import { NotFoundException } from '@nestjs/common';
import { AuditAction } from '../audit/entities/audit-log.entity';
import { DeviceLocationService } from './device-location.service';

describe('DeviceLocationService', () => {
  const auditService = {
    log: jest.fn().mockResolvedValue(undefined),
  };
  let service: DeviceLocationService;

  beforeEach(() => {
    jest.clearAllMocks();
    service = new DeviceLocationService(auditService as any);
  });

  it('filters device locations by floor, status, and device search', async () => {
    const result = await service.getDeviceLocations(
      { user: { id: 'user-1' }, headers: { 'user-agent': 'jest' } },
      { floorId: 'floor-2', status: 'offline', q: 'telemetry patch' },
    );

    expect(result.devices).toEqual([
      expect.objectContaining({
        id: 'ecg-icu-15',
        status: 'offline',
        location: expect.objectContaining({ coordinateSystem: 'svg-viewbox-1000x620' }),
      }),
    ]);
    expect(result.alerts).toEqual(
      expect.arrayContaining([expect.objectContaining({ deviceId: 'ecg-icu-15' })]),
    );
    expect(auditService.log).toHaveBeenCalledWith(
      expect.objectContaining({
        userId: 'user-1',
        action: AuditAction.CLINICAL_DATA_ACCESS,
        resource: 'hospital-map:device-locations',
        phiAccessed: true,
      }),
    );
  });

  it('returns a detail drawer payload for a device', async () => {
    const result = await service.getDeviceDetail('spo2-icu-12');

    expect(result.device).toMatchObject({
      id: 'spo2-icu-12',
      roomId: 'icu-12',
      activeAlerts: [expect.objectContaining({ title: 'Low oxygen saturation' })],
    });
    expect(result.device.telemetry).toEqual(
      expect.arrayContaining([expect.objectContaining({ parameter: 'spo2' })]),
    );
  });

  it('raises for unknown devices', async () => {
    await expect(service.getDeviceDetail('not-real')).rejects.toThrow(NotFoundException);
  });
});
