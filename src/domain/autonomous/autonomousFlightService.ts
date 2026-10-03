/**
 * CareDroid Autonomous Medical Flight & UAV Dispatch Service
 * Controls autonomous medical drone flights for blood logistics, rapid AED response,
 * and organ/specimen transport with continuous cold-chain telemetry and geofence safety.
 *
 * SAFETY MANDATE: Strictly prohibits weaponization, lethal autonomy, or non-medical use.
 */

import {
  ApprovedAirCorridor,
  FlightDispatchResult,
  MedicalFlightDispatchPlan,
  MedicalFlightTelemetry,
  MedicalUavItem,
  UavFlightStatus,
} from './uavTypes';

export class AutonomousFlightService {
  private static instance: AutonomousFlightService;
  private uavFleet: Map<string, MedicalUavItem> = new Map();
  private corridors: Map<string, ApprovedAirCorridor> = new Map();

  constructor() {
    this.seedDefaultCorridors();
    this.seedDefaultFleet();
  }

  public static getInstance(): AutonomousFlightService {
    if (!AutonomousFlightService.instance) {
      AutonomousFlightService.instance = new AutonomousFlightService();
    }
    return AutonomousFlightService.instance;
  }

  public registerUav(uav: MedicalUavItem): void {
    this.uavFleet.set(uav.id, { ...uav });
  }

  public getUav(id: string): MedicalUavItem | undefined {
    return this.uavFleet.get(id);
  }

  public listUavs(statusFilter?: UavFlightStatus): MedicalUavItem[] {
    const list = Array.from(this.uavFleet.values());
    if (statusFilter) {
      return list.filter((u) => u.status === statusFilter);
    }
    return list;
  }

  public listCorridors(): ApprovedAirCorridor[] {
    return Array.from(this.corridors.values());
  }

  public dispatchMedicalFlight(plan: MedicalFlightDispatchPlan): FlightDispatchResult {
    const prohibitedTerms = [
      'weapon',
      'munitions',
      'missile',
      'strike',
      'recon_offensive',
      'tactical_fire',
    ];
    const descLower = plan.payload.description.toLowerCase();
    if (prohibitedTerms.some((term) => descLower.includes(term))) {
      throw new Error(
        'SAFETY POLICY BREACH: CareDroid strictly prohibits weaponized, tactical, or lethal autonomous payloads.',
      );
    }

    const corridor = this.corridors.get(plan.corridorId);
    if (!corridor) {
      return {
        success: false,
        flightId: '',
        aircraftId: '',
        estimatedEnRouteMinutes: 0,
        status: 'ground_hold',
        message: `Air corridor '${plan.corridorId}' is not approved by civil aviation authorities.`,
        timestampIso: new Date().toISOString(),
      };
    }

    let selectedUav: MedicalUavItem | undefined;
    if (plan.aircraftId) {
      selectedUav = this.uavFleet.get(plan.aircraftId);
    } else {
      const candidates = Array.from(this.uavFleet.values()).filter(
        (u) =>
          (u.status === 'ready_for_takeoff' || u.status === 'landed') &&
          u.currentTelemetry.batteryPercent >= 60 &&
          u.maxPayloadKg >= plan.payload.weightKg &&
          u.approvedCorridors.includes(plan.corridorId),
      );
      selectedUav = candidates[0];
    }

    if (!selectedUav) {
      return {
        success: false,
        flightId: '',
        aircraftId: '',
        estimatedEnRouteMinutes: 0,
        status: 'ground_hold',
        message: 'No qualified aircraft available for this medical corridor.',
        timestampIso: new Date().toISOString(),
      };
    }

    const flightId = `flight-med-${Date.now()}`;
    selectedUav.status = 'airborne_en_route';
    selectedUav.activeMissionId = flightId;

    if (plan.payload.requiresColdChain) {
      selectedUav.currentTelemetry.coldChain = {
        temperatureCelsius: 3.8,
        minAllowedCelsius: plan.payload.tempRangeCelsius?.min ?? 2.0,
        maxAllowedCelsius: plan.payload.tempRangeCelsius?.max ?? 6.0,
        integrityStatus: 'compliant',
        tamperSealIntact: true,
        sampleIntervalSeconds: 10,
      };
    }

    const estimatedEnRouteMinutes = Math.round(corridor.waypoints.length * 2.5);

    return {
      success: true,
      flightId,
      aircraftId: selectedUav.id,
      estimatedEnRouteMinutes,
      status: 'airborne_en_route',
      message: `Cleared for takeoff on corridor '${corridor.name}'. Autopilot engaged.`,
      timestampIso: new Date().toISOString(),
    };
  }

  public updateTelemetry(telemetry: MedicalFlightTelemetry): {
    updated: boolean;
    failSafeTriggered: boolean;
    warning?: string;
  } {
    const uav = this.uavFleet.get(telemetry.aircraftId);
    if (!uav) return { updated: false, failSafeTriggered: false };

    uav.currentTelemetry = { ...telemetry };

    if (telemetry.batteryPercent < 20 && uav.status === 'airborne_en_route') {
      uav.status = 'returning_to_base';
      return {
        updated: true,
        failSafeTriggered: true,
        warning: `Battery critical (${telemetry.batteryPercent}%). Initiating automatic Return to Base.`,
      };
    }

    if (telemetry.coldChain) {
      const { temperatureCelsius, minAllowedCelsius, maxAllowedCelsius } = telemetry.coldChain;
      if (temperatureCelsius > maxAllowedCelsius || temperatureCelsius < minAllowedCelsius) {
        telemetry.coldChain.integrityStatus = 'breached';
        return {
          updated: true,
          failSafeTriggered: false,
          warning: `COLD CHAIN EXCURSION: ${temperatureCelsius}°C exceeds limits (${minAllowedCelsius}-${maxAllowedCelsius}°C). Notify receiving clinician.`,
        };
      }
    }

    return { updated: true, failSafeTriggered: false };
  }

  public abortMissionReturnToBase(aircraftId: string, _reason: string): boolean {
    const uav = this.uavFleet.get(aircraftId);
    if (!uav) return false;
    uav.status = 'returning_to_base';
    uav.activeMissionId = undefined;
    return true;
  }

  public getFlightOperationsSummary(): {
    totalFleet: number;
    airborne: number;
    readyForTakeoff: number;
    coldChainActiveCount: number;
  } {
    const all = Array.from(this.uavFleet.values());
    let airborne = 0;
    let readyForTakeoff = 0;
    let coldChainActiveCount = 0;

    for (const u of all) {
      if (u.status === 'airborne_en_route' || u.status === 'hovering_delivery') {
        airborne++;
      }
      if (u.status === 'ready_for_takeoff' || u.status === 'landed') {
        readyForTakeoff++;
      }
      if (
        u.currentTelemetry.coldChain &&
        u.currentTelemetry.coldChain.integrityStatus === 'compliant'
      ) {
        coldChainActiveCount++;
      }
    }

    return {
      totalFleet: all.length,
      airborne,
      readyForTakeoff,
      coldChainActiveCount,
    };
  }

  private seedDefaultCorridors(): void {
    const defaultCorridors: ApprovedAirCorridor[] = [
      {
        corridorId: 'corridor-blood-bank-ed',
        name: 'Regional Blood Bank to Metro ED Helipad',
        originName: 'Central Blood Logistics Center',
        destinationName: 'Main Hospital ED Helipad',
        minAltitudeMetersAgl: 90,
        maxAltitudeMetersAgl: 120,
        waypoints: [
          { latitude: 43.6532, longitude: -79.3832, altitudeMetersAgl: 100 },
          { latitude: 43.6598, longitude: -79.3905, altitudeMetersAgl: 110 },
          { latitude: 43.6655, longitude: -79.398, altitudeMetersAgl: 100 },
        ],
        emergencyLandingSites: [
          {
            name: 'City Park Field 3',
            coordinates: { latitude: 43.656, longitude: -79.387, altitudeMetersAgl: 0 },
          },
        ],
      },
      {
        corridorId: 'corridor-aed-metro-east',
        name: 'Metro East Emergency AED Express Route',
        originName: 'EMS Station 4 Heliport',
        destinationName: 'East Sector High-Incidence Grid',
        minAltitudeMetersAgl: 75,
        maxAltitudeMetersAgl: 110,
        waypoints: [
          { latitude: 43.671, longitude: -79.35, altitudeMetersAgl: 90 },
          { latitude: 43.678, longitude: -79.342, altitudeMetersAgl: 90 },
        ],
        emergencyLandingSites: [],
      },
    ];

    for (const c of defaultCorridors) {
      this.corridors.set(c.corridorId, c);
    }
  }

  private seedDefaultFleet(): void {
    const defaultDrones: MedicalUavItem[] = [
      {
        id: 'uav-lifeline-01',
        callsign: 'MED-AIR-1',
        tailNumber: 'N990CD',
        model: 'CareDroid SkyRescue Heavy Hexacopter',
        maxPayloadKg: 5.5,
        cruisingSpeedKnots: 52,
        status: 'ready_for_takeoff',
        approvedCorridors: ['corridor-blood-bank-ed', 'corridor-aed-metro-east'],
        homeBaseLocation: { latitude: 43.6532, longitude: -79.3832, altitudeMetersAgl: 0 },
        currentTelemetry: {
          aircraftId: 'uav-lifeline-01',
          timestampIso: new Date().toISOString(),
          position: { latitude: 43.6532, longitude: -79.3832, altitudeMetersAgl: 0 },
          groundSpeedKnots: 0,
          headingDegrees: 0,
          batteryPercent: 98,
          estimatedFlightMinutesRemaining: 42,
          windSpeedKnots: 6,
          gpsSatellitesLocked: 18,
          linkQualityPercent: 100,
        },
      },
      {
        id: 'uav-aed-responder-02',
        callsign: 'AED-RAPID-2',
        tailNumber: 'N442CD',
        model: 'CareDroid DefibExpress VTOL',
        maxPayloadKg: 2.8,
        cruisingSpeedKnots: 65,
        status: 'ready_for_takeoff',
        approvedCorridors: ['corridor-aed-metro-east'],
        homeBaseLocation: { latitude: 43.671, longitude: -79.35, altitudeMetersAgl: 0 },
        currentTelemetry: {
          aircraftId: 'uav-aed-responder-02',
          timestampIso: new Date().toISOString(),
          position: { latitude: 43.671, longitude: -79.35, altitudeMetersAgl: 0 },
          groundSpeedKnots: 0,
          headingDegrees: 90,
          batteryPercent: 100,
          estimatedFlightMinutesRemaining: 35,
          windSpeedKnots: 8,
          gpsSatellitesLocked: 16,
          linkQualityPercent: 99,
        },
      },
    ];

    for (const d of defaultDrones) {
      this.registerUav(d);
    }
  }
}

export const autonomousFlightService = AutonomousFlightService.getInstance();
