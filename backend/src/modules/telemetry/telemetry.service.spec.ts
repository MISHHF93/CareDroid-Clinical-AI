import { TelemetryService } from './telemetry.service';

describe('TelemetryService', () => {
  const telemetryAudit = {
    recordRead: jest.fn().mockResolvedValue(undefined),
  };
  let service: TelemetryService;

  beforeEach(() => {
    jest.clearAllMocks();
    service = new TelemetryService(telemetryAudit as any);
  });

  it('returns required Medical IoT telemetry parameters and trends', async () => {
    const result = await service.getLiveTelemetry();
    const vitalLabels = result.vitals.map((vital) => vital.label);
    const trendParameters = result.trends.map((trend) => trend.parameter);

    expect(vitalLabels).toEqual(
      expect.arrayContaining(['HR', 'SpO2', 'BP', 'RR', 'Temperature', 'Glucose', 'ECG']),
    );
    expect(trendParameters).toEqual(
      expect.arrayContaining([
        'hr',
        'spo2',
        'bp',
        'respiratory-rate',
        'temperature',
        'glucose',
        'ecg',
      ]),
    );
    expect(result.connectivityTimeline).toHaveLength(5);
    expect(telemetryAudit.recordRead).toHaveBeenCalledWith(
      undefined,
      'telemetry:vitals-live',
      expect.objectContaining({ count: 7, trendCount: 7 }),
    );
  });

  it('returns a combined dashboard snapshot', async () => {
    const snapshot = await service.getSnapshot();

    expect(snapshot.devices).toHaveLength(4);
    expect(snapshot.vitals).toHaveLength(7);
    expect(snapshot.alerts.length).toBeGreaterThan(0);
  });
});
