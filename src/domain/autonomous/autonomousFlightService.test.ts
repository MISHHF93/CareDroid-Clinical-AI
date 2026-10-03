import { describe, expect, it } from 'vitest';
import { AutonomousFlightService } from './autonomousFlightService';

describe('AutonomousFlightService', () => {
  it('registers and retrieves UAV fleet and approved corridors', () => {
    const service = new AutonomousFlightService();
    const fleet = service.listUavs();
    expect(fleet.length).toBeGreaterThanOrEqual(2);

    const corridors = service.listCorridors();
    expect(corridors.length).toBeGreaterThanOrEqual(2);
    expect(corridors[0].waypoints.length).toBeGreaterThan(0);
  });

  it('dispatches a blood product delivery flight with cold chain enabled', () => {
    const service = new AutonomousFlightService();
    const result = service.dispatchMedicalFlight({
      missionType: 'blood_product_delivery',
      originSite: 'Central Blood Logistics Center',
      destinationSite: 'Main Hospital ED Helipad',
      corridorId: 'corridor-blood-bank-ed',
      payload: {
        description: '4 Units O-Negative Packed Red Blood Cells (PRBC)',
        weightKg: 2.2,
        requiresColdChain: true,
        tempRangeCelsius: { min: 1.0, max: 6.0 },
        assignedPatientId: 'pt-trauma-101',
        clinicalUrgency: 'stat_critical',
      },
      authorizingClinicianId: 'physician-trauma-lead',
      authorizingClinicianRole: 'emergency_physician',
    });

    expect(result.success).toBe(true);
    expect(result.status).toBe('airborne_en_route');
    expect(result.estimatedEnRouteMinutes).toBeGreaterThan(0);

    const uav = service.getUav(result.aircraftId);
    expect(uav?.status).toBe('airborne_en_route');
    expect(uav?.currentTelemetry.coldChain?.integrityStatus).toBe('compliant');
  });

  it('strictly blocks non-medical / weaponized payload requests', () => {
    const service = new AutonomousFlightService();
    expect(() =>
      service.dispatchMedicalFlight({
        missionType: 'disaster_medical_reconnaissance',
        originSite: 'Site A',
        destinationSite: 'Site B',
        corridorId: 'corridor-blood-bank-ed',
        payload: {
          description: 'Tactical fire support and munitions',
          weightKg: 10,
          requiresColdChain: false,
          clinicalUrgency: 'stat_critical',
        },
        authorizingClinicianId: 'bad-actor',
        authorizingClinicianRole: 'unknown',
      }),
    ).toThrow(/SAFETY POLICY BREACH/);
  });

  it('triggers automatic Return to Base fail-safe when battery is critical', () => {
    const service = new AutonomousFlightService();
    const uavId = 'uav-lifeline-01';

    service.dispatchMedicalFlight({
      missionType: 'blood_product_delivery',
      aircraftId: uavId,
      originSite: 'Blood Bank',
      destinationSite: 'ED',
      corridorId: 'corridor-blood-bank-ed',
      payload: {
        description: 'Plasma',
        weightKg: 1,
        requiresColdChain: true,
        clinicalUrgency: 'stat_critical',
      },
      authorizingClinicianId: 'doc',
      authorizingClinicianRole: 'emergency_physician',
    });

    const res = service.updateTelemetry({
      aircraftId: uavId,
      timestampIso: new Date().toISOString(),
      position: { latitude: 43.66, longitude: -79.39, altitudeMetersAgl: 105 },
      groundSpeedKnots: 48,
      headingDegrees: 90,
      batteryPercent: 15,
      estimatedFlightMinutesRemaining: 5,
      windSpeedKnots: 10,
      gpsSatellitesLocked: 16,
      linkQualityPercent: 95,
    });

    expect(res.failSafeTriggered).toBe(true);
    expect(res.warning).toContain('Return to Base');
    expect(service.getUav(uavId)?.status).toBe('returning_to_base');
  });

  it('detects cold chain excursion when temperature exceeds limits', () => {
    const service = new AutonomousFlightService();
    const uavId = 'uav-lifeline-01';

    const res = service.updateTelemetry({
      aircraftId: uavId,
      timestampIso: new Date().toISOString(),
      position: { latitude: 43.66, longitude: -79.39, altitudeMetersAgl: 100 },
      groundSpeedKnots: 50,
      headingDegrees: 90,
      batteryPercent: 85,
      estimatedFlightMinutesRemaining: 30,
      windSpeedKnots: 5,
      gpsSatellitesLocked: 18,
      linkQualityPercent: 100,
      coldChain: {
        temperatureCelsius: 8.5,
        minAllowedCelsius: 2.0,
        maxAllowedCelsius: 6.0,
        integrityStatus: 'compliant',
        tamperSealIntact: true,
        sampleIntervalSeconds: 10,
      },
    });

    expect(res.warning).toContain('COLD CHAIN EXCURSION');
    const uav = service.getUav(uavId);
    expect(uav?.currentTelemetry.coldChain?.integrityStatus).toBe('breached');
  });
});
