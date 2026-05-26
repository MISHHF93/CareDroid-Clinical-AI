import { AlertService } from './alert.service';

describe('AlertService', () => {
  const telemetryAudit = {
    recordRead: jest.fn().mockResolvedValue(undefined),
  };
  let service: AlertService;

  beforeEach(() => {
    jest.clearAllMocks();
    service = new AlertService(telemetryAudit as any);
  });

  it('returns active device alerts with source device context', async () => {
    const result = await service.getDeviceAlerts();

    expect(result.alerts).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          id: 'spo2-low',
          severity: 'high',
          source: 'Bed 12 Pulse Oximeter',
          deviceId: 'spo2-bed-12',
          status: 'active',
        }),
      ]),
    );
    expect(telemetryAudit.recordRead).toHaveBeenCalledWith(
      undefined,
      'telemetry:device-alerts',
      expect.objectContaining({ count: 3, highSeverity: 1 }),
    );
  });
});
