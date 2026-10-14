import { Injectable, Logger, NotFoundException, BadRequestException } from '@nestjs/common';
import { MobilityMission, MobilityVehicle, MissionStatus } from './mobility.types';

@Injectable()
export class MobilityService {
  private readonly logger = new Logger(MobilityService.name);

  private readonly missions = new Map<string, MobilityMission>();
  private readonly vehicles = new Map<string, MobilityVehicle>();

  constructor() {
    this.seedDefaultVehicles();
    this.seedDefaultMissions();
  }

  private seedDefaultVehicles(): void {
    const defaultVehicles: MobilityVehicle[] = [
      {
        id: 'AMR-CARRIER-01',
        name: 'CareDroid Carrier Alpha (Indoor AMR)',
        type: 'hospital_indoor_amr',
        manufacturer: 'CareDroid Mobility Labs',
        model: 'AMR-500 Bio-Lock',
        operatingStatus: 'IDLE',
        batteryPercent: 94,
        currentLocation: {
          building: 'Main Hospital',
          floor: '1st Floor',
          zone: 'Central Logistics Dock',
          coordinates: { lat: 40.7558, lng: -73.9864 },
        },
        connectivity: 'ONLINE_5G',
        temperatureChamber: {
          currentCelsius: 4.1,
          targetCelsius: 4.0,
          coolingActive: true,
        },
        safetyInterlockEngaged: true,
        lastTelemetryIso: new Date().toISOString(),
      },
      {
        id: 'AMR-SURGE-02',
        name: 'CareDroid Carrier Beta (High-Speed Rover)',
        type: 'autonomous_ground_rover',
        manufacturer: 'CareDroid Mobility Labs',
        model: 'Rover-X Inter-facility',
        operatingStatus: 'STANDBY',
        batteryPercent: 88,
        currentLocation: {
          building: 'Pavilion North',
          floor: 'Ground',
          zone: 'Ambulance Bay B',
          coordinates: { lat: 40.757, lng: -73.9845 },
        },
        connectivity: 'ONLINE_5G',
        temperatureChamber: {
          currentCelsius: -19.4,
          targetCelsius: -20.0,
          coolingActive: true,
        },
        safetyInterlockEngaged: true,
        lastTelemetryIso: new Date().toISOString(),
      },
      {
        id: 'TUG-AETHON-03',
        name: 'Aethon TUG Clinical Tugger',
        type: 'hospital_indoor_amr',
        manufacturer: 'Aethon Inc.',
        model: 'T3 Autonomous Tug',
        operatingStatus: 'IDLE',
        batteryPercent: 78,
        currentLocation: {
          building: 'Main Hospital',
          floor: 'Basement',
          zone: 'Pharmacy Depot',
          coordinates: { lat: 40.7549, lng: -73.9872 },
        },
        connectivity: 'ONLINE_WIFI',
        safetyInterlockEngaged: true,
        lastTelemetryIso: new Date().toISOString(),
      },
      {
        id: 'SMART-AMB-04',
        name: 'Smart Mobile ICU Ambulance 4',
        type: 'smart_ambulance',
        manufacturer: 'Demers / CareDroid Telematics',
        model: 'Type III E-Ambulance',
        operatingStatus: 'STANDBY',
        batteryPercent: 99,
        currentLocation: {
          building: 'Station 14',
          floor: 'Ground',
          zone: 'Vehicle Bay 2',
          coordinates: { lat: 40.7512, lng: -73.991 },
        },
        connectivity: 'ONLINE_5G',
        safetyInterlockEngaged: true,
        lastTelemetryIso: new Date().toISOString(),
      },
    ];

    defaultVehicles.forEach((v) => this.vehicles.set(v.id, v));
  }

  private seedDefaultMissions(): void {
    const demoMission: MobilityMission = {
      id: 'MSN-2026-0042',
      title: 'Urgent Delivery: O-Negative Packed Red Blood Cells',
      originFacilityId: 'FAC-METRO-01',
      destinationFacilityId: 'FAC-NORTH-ICU',
      itemCategory: 'Blood Products',
      priority: 'EMERGENCY_STAT',
      status: 'VALIDATED',
      payloadDescription: '4 Units O-Neg Packed RBCs in temperature-monitored bio-lockbox',
      handlingRequirements: {
        temperatureRangeCelsius: { min: 2, max: 6 },
        requiresTamperEvidentSeal: true,
        fragile: true,
      },
      assignedVehicleId: 'AMR-CARRIER-01',
      createdAt: new Date(Date.now() - 3600000).toISOString(),
      updatedAt: new Date(Date.now() - 1800000).toISOString(),
    };

    this.missions.set(demoMission.id, demoMission);
  }

  public listMissions(): MobilityMission[] {
    return Array.from(this.missions.values()).sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
    );
  }

  public getMission(id: string): MobilityMission | undefined {
    return this.missions.get(id);
  }

  public async createMission(
    params: {
      title?: string;
      originFacilityId?: string;
      destinationFacilityId?: string;
      originFacility?: { facilityId?: string; facilityName?: string };
      destinationFacility?: { facilityId?: string; facilityName?: string };
      itemCategory?: string;
      priority?: any;
      payloadDescription?: string;
      payload?: {
        itemDescription?: string;
        quantity?: string;
        weightKg?: number;
        temperatureRequirement?: any;
        tamperEvidentSealId?: string;
      };
      handlingRequirements?: {
        temperatureRangeCelsius?: { min: number; max: number };
        requiresTamperEvidentSeal?: boolean;
        fragile?: boolean;
      };
      operatorNotes?: string;
      requestingOrganization?: string;
    },
    _reqContext?: any,
  ): Promise<MobilityMission> {
    const missionId = `MSN-${Date.now().toString(36).toUpperCase()}-${Math.random().toString(36).substring(2, 5).toUpperCase()}`;

    const mission: MobilityMission = {
      id: missionId,
      title: params.title || `Medical Delivery: ${params.itemCategory || 'Supplies'}`,
      originFacilityId:
        params.originFacilityId || params.originFacility?.facilityId || 'FAC-ORIGIN-01',
      destinationFacilityId:
        params.destinationFacilityId || params.destinationFacility?.facilityId || 'FAC-DEST-01',
      itemCategory: params.itemCategory || 'Pharmaceuticals',
      priority: params.priority || 'NORMAL',
      status: 'VALIDATED',
      payloadDescription:
        params.payloadDescription ||
        params.payload?.itemDescription ||
        'Medical payload in secure lockbox',
      handlingRequirements: params.handlingRequirements || {
        temperatureRangeCelsius: params.payload?.temperatureRequirement
          ? {
              min: params.payload.temperatureRequirement.minCelsius,
              max: params.payload.temperatureRequirement.maxCelsius,
            }
          : { min: 2, max: 8 },
        requiresTamperEvidentSeal: true,
      },
      operatorNotes: params.operatorNotes,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    this.missions.set(missionId, mission);
    return mission;
  }

  public async assignVehicle(
    missionId: string,
    vehicleId: string,
    operatorId?: string,
  ): Promise<MobilityMission> {
    const mission = this.missions.get(missionId);
    if (!mission) throw new NotFoundException(`Mission ${missionId} not found`);

    const vehicle = this.vehicles.get(vehicleId);
    if (!vehicle) throw new NotFoundException(`Vehicle ${vehicleId} not found`);

    mission.assignedVehicleId = vehicleId;
    mission.responsibleOperatorId = operatorId;
    mission.status = 'ASSIGNED';
    mission.updatedAt = new Date().toISOString();

    vehicle.operatingStatus = 'ASSIGNED';
    vehicle.lastTelemetryIso = new Date().toISOString();

    return mission;
  }

  public async approveMission(
    missionId: string,
    operatorId: string,
    notes?: string,
  ): Promise<MobilityMission> {
    const mission = this.missions.get(missionId);
    if (!mission) throw new NotFoundException(`Mission ${missionId} not found`);

    mission.status = 'APPROVED';
    mission.responsibleOperatorId = operatorId;
    if (notes)
      mission.operatorNotes = `${mission.operatorNotes ? mission.operatorNotes + ' | ' : ''}${notes}`;
    mission.updatedAt = new Date().toISOString();

    return mission;
  }

  public async dispatchMission(missionId: string, operatorId?: string): Promise<MobilityMission> {
    const mission = this.missions.get(missionId);
    if (!mission) throw new NotFoundException(`Mission ${missionId} not found`);

    mission.status = 'IN_TRANSIT';
    mission.dispatchedAt = new Date().toISOString();
    mission.updatedAt = new Date().toISOString();
    if (operatorId) mission.responsibleOperatorId = operatorId;

    if (mission.assignedVehicleId) {
      const vehicle = this.vehicles.get(mission.assignedVehicleId);
      if (vehicle) {
        vehicle.operatingStatus = 'IN_TRANSIT';
        vehicle.lastTelemetryIso = new Date().toISOString();
      }
    }

    return mission;
  }

  public async completeMission(
    missionId: string,
    operatorId?: string,
    deliveryEvidence?: {
      tamperSealIntact: boolean;
      recipientBadgeVerified: boolean;
      deliveredTemperatureCelsius: number;
    },
  ): Promise<MobilityMission> {
    const mission = this.missions.get(missionId);
    if (!mission) throw new NotFoundException(`Mission ${missionId} not found`);

    mission.status = 'COMPLETED';
    mission.completedAt = new Date().toISOString();
    mission.updatedAt = new Date().toISOString();
    if (deliveryEvidence) mission.deliveryEvidence = deliveryEvidence;

    if (mission.assignedVehicleId) {
      const vehicle = this.vehicles.get(mission.assignedVehicleId);
      if (vehicle) {
        vehicle.operatingStatus = 'IDLE';
        vehicle.lastTelemetryIso = new Date().toISOString();
      }
    }

    return mission;
  }

  public listVehicles(): MobilityVehicle[] {
    return Array.from(this.vehicles.values());
  }

  public getVehicle(vehicleId: string): MobilityVehicle | undefined {
    return this.vehicles.get(vehicleId);
  }
}
