import { describe, expect, it } from 'vitest';
import { buildDemoMedicalIotSnapshot } from './medicalIotService';

describe('medicalIotService', () => {
  it('builds fallback telemetry with required Medical IoT vitals and trends', () => {
    const snapshot = buildDemoMedicalIotSnapshot(new Date('2026-05-24T05:00:00.000Z'));

    expect(snapshot.devices).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          name: 'Bed 12 Pulse Oximeter',
          status: 'online',
          battery: 82,
          signalStrength: 91,
          connectivity: 'Wi-Fi',
          assignedRoom: 'ICU-12',
          activeAlerts: ['Low oxygen saturation'],
        }),
      ])
    );
    expect(snapshot.vitals.map((vital) => vital.label)).toEqual(
      expect.arrayContaining(['HR', 'SpO2', 'BP', 'RR', 'Temperature', 'Glucose', 'ECG'])
    );
    expect(snapshot.trends.map((trend) => trend.parameter)).toEqual(
      expect.arrayContaining(['hr', 'spo2', 'bp', 'respiratory-rate', 'temperature', 'glucose', 'ecg'])
    );
  });
});
