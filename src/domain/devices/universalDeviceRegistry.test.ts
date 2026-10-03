import { describe, expect, it } from 'vitest';
import { UniversalDeviceRegistry } from './universalDeviceRegistry';

describe('UniversalDeviceRegistry', () => {
  it('registers and retrieves devices with default hospital devices', () => {
    const registry = new UniversalDeviceRegistry();
    const devices = registry.listDevices();
    expect(devices.length).toBeGreaterThanOrEqual(4);

    const monitor = registry.getDevice('dev-mon-ed-bay-1');
    expect(monitor).toBeDefined();
    expect(monitor?.category).toBe('vital_signs_monitor');
    expect(monitor?.location.department).toBe('Emergency Department');
  });

  it('filters devices by category and status', () => {
    const registry = new UniversalDeviceRegistry();
    const pumps = registry.listDevices({ category: 'infusion_pump' });
    expect(pumps.length).toBeGreaterThanOrEqual(1);
    expect(pumps[0].category).toBe('infusion_pump');

    const inUse = registry.listDevices({ status: 'in_use' });
    expect(inUse.length).toBeGreaterThanOrEqual(1);
  });

  it('updates telemetry and marks device status accordingly', () => {
    const registry = new UniversalDeviceRegistry();
    const deviceId = 'dev-vent-icu-02';

    registry.updateTelemetry(deviceId, {
      timestampIso: new Date().toISOString(),
      ventilation: { pipCmH2O: 35, peepCmH2O: 8, fIO2Percent: 60, tidalVolumeMl: 450 },
      alarms: [
        {
          alarmId: 'alm-pip-high',
          severity: 'critical',
          message: 'High Peak Inspiratory Pressure > 30 cmH2O',
          isSilenced: false,
        },
      ],
    });

    const updated = registry.getDevice(deviceId);
    expect(updated?.status).toBe('alarm_active');
    expect(updated?.latestTelemetry?.alarms?.length).toBe(1);
  });

  it('assigns and releases devices to patients', () => {
    const registry = new UniversalDeviceRegistry();
    const deviceId = 'dev-us-pocus-01';

    const assigned = registry.assignToPatient(deviceId, 'pt-7781', 'enc-4411');
    expect(assigned).toBe(true);

    const deviceAfterAssign = registry.getDevice(deviceId);
    expect(deviceAfterAssign?.assignedPatientId).toBe('pt-7781');
    expect(deviceAfterAssign?.status).toBe('in_use');

    const released = registry.releaseFromPatient(deviceId);
    expect(released).toBe(true);

    const deviceAfterRelease = registry.getDevice(deviceId);
    expect(deviceAfterRelease?.assignedPatientId).toBeUndefined();
    expect(deviceAfterRelease?.status).toBe('online');
  });

  it('executes device command and silences alarm', async () => {
    const registry = new UniversalDeviceRegistry();
    const deviceId = 'dev-mon-ed-bay-1';

    registry.updateTelemetry(deviceId, {
      timestampIso: new Date().toISOString(),
      alarms: [
        { alarmId: 'alm-hr', severity: 'warning', message: 'Tachycardia', isSilenced: false },
      ],
    });
    expect(registry.getDevice(deviceId)?.status).toBe('alarm_active');

    const result = await registry.executeCommand({
      deviceId,
      action: 'silence_alarm',
      issuedByUserId: 'nurse-42',
      issuedByRole: 'emergency_nurse',
    });

    expect(result.success).toBe(true);
    expect(result.message).toContain('silenced');
    const device = registry.getDevice(deviceId);
    expect(device?.latestTelemetry?.alarms?.[0].isSilenced).toBe(true);
  });

  it('calculates fleet health summary correctly', () => {
    const registry = new UniversalDeviceRegistry();
    const summary = registry.getFleetHealthSummary();

    expect(summary.totalDevices).toBeGreaterThanOrEqual(4);
    expect(summary.averageBatteryPercent).toBeGreaterThan(50);
    expect(typeof summary.online).toBe('number');
    expect(typeof summary.inUse).toBe('number');
  });
});
