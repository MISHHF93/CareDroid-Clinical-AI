/**
 * Mobility Domain Types for CareDroid Backend
 */

export type MissionPriority = 'LOW' | 'NORMAL' | 'URGENT' | 'EMERGENCY_STAT';

export type MissionStatus =
  | 'REQUESTED'
  | 'VALIDATED'
  | 'ASSIGNED'
  | 'APPROVED'
  | 'DISPATCHED'
  | 'IN_TRANSIT'
  | 'PAUSED'
  | 'ARRIVED'
  | 'DELIVERED'
  | 'COMPLETED'
  | 'CANCELLED'
  | 'ABORTED';

export interface MobilityMission {
  id: string;
  title: string;
  originFacilityId: string;
  destinationFacilityId: string;
  itemCategory: string;
  priority: MissionPriority;
  status: MissionStatus;
  payloadDescription: string;
  handlingRequirements?: {
    temperatureRangeCelsius?: { min: number; max: number };
    requiresTamperEvidentSeal?: boolean;
    fragile?: boolean;
  };
  assignedVehicleId?: string;
  responsibleOperatorId?: string;
  dispatchedAt?: string;
  completedAt?: string;
  deliveryEvidence?: {
    tamperSealIntact: boolean;
    recipientBadgeVerified: boolean;
    deliveredTemperatureCelsius: number;
  };
  operatorNotes?: string;
  createdAt: string;
  updatedAt: string;
}

export interface MobilityVehicle {
  id: string;
  name: string;
  type: string;
  manufacturer: string;
  model: string;
  operatingStatus:
    | 'IDLE'
    | 'STANDBY'
    | 'ASSIGNED'
    | 'IN_TRANSIT'
    | 'PAUSED'
    | 'MAINTENANCE'
    | 'OUT_OF_SERVICE';
  batteryPercent: number;
  currentLocation: {
    building: string;
    floor: string;
    zone: string;
    coordinates?: { lat: number; lng: number };
  };
  connectivity: 'ONLINE_5G' | 'ONLINE_WIFI' | 'DEGRADED' | 'OFFLINE';
  temperatureChamber?: {
    currentCelsius: number;
    targetCelsius: number;
    coolingActive: boolean;
  };
  safetyInterlockEngaged: boolean;
  lastTelemetryIso: string;
}

export type RecognitionState =
  | 'RECOGNITION_NOT_CONFIRMED'
  | 'RECOGNITION_IN_PROGRESS'
  | 'RECOGNITION_COMPLETED_NO_RELEVANT_OBJECT'
  | 'RELEVANT_OBJECT_DETECTED'
  | 'RECOGNITION_DATA_STALE'
  | 'SENSOR_UNAVAILABLE'
  | 'RECOGNITION_ERROR';

export interface RecognitionEvent {
  id: string;
  vehicleId: string;
  eventType: string;
  state: RecognitionState;
  direction?: 'FORWARD' | 'REAR' | 'PORT' | 'STARBOARD' | 'OMNIDIRECTIONAL';
  coverageSector?: string;
  objectClassification?: string;
  confidence?: number;
  sensorHealth?: {
    primaryOptical?: boolean;
    secondaryLidar?: boolean;
    rearSonar?: boolean;
  };
  explanation?: string;
  timestampIso: string;
}
