/**
 * CareDroid Mobility Domain Types
 * Unified interface models for Autonomous Medical Vehicles, Robotics, Perception Intelligence, and Mission Execution.
 */

export const RECOGNITION_STATES = {
  RECOGNITION_NOT_CONFIRMED: 'RECOGNITION_NOT_CONFIRMED',
  RECOGNITION_IN_PROGRESS: 'RECOGNITION_IN_PROGRESS',
  RECOGNITION_COMPLETED_NO_RELEVANT_OBJECT: 'RECOGNITION_COMPLETED_NO_RELEVANT_OBJECT',
  RELEVANT_OBJECT_DETECTED: 'RELEVANT_OBJECT_DETECTED',
  RECOGNITION_DATA_STALE: 'RECOGNITION_DATA_STALE',
  SENSOR_UNAVAILABLE: 'SENSOR_UNAVAILABLE',
  RECOGNITION_ERROR: 'RECOGNITION_ERROR',
} as const;

export type RecognitionState = (typeof RECOGNITION_STATES)[keyof typeof RECOGNITION_STATES];

export interface DetectedObject {
  id: string;
  classification: string;
  confidenceScore?: number;
  confidence?: number;
  distanceMeters: number;
  bearingDegrees?: number;
  relativeBearingDegrees?: number;
  isRelevantObject?: boolean;
  isRelevantObstacle?: boolean;
  proximityZone?: string;
  boundingBox?: {
    x: number;
    y: number;
    width: number;
    height: number;
  };
}

export interface SensorHealthStatus {
  lidar?: 'nominal' | 'degraded' | 'failed' | 'unavailable' | string;
  opticalCamera?: 'nominal' | 'degraded' | 'failed' | 'unavailable' | string;
  primaryLidar?: 'HEALTHY' | 'DEGRADED' | 'FAILED' | 'nominal' | 'failed' | 'unavailable' | string;
  opticalCameras?:
    | 'HEALTHY'
    | 'DEGRADED'
    | 'FAILED'
    | 'nominal'
    | 'failed'
    | 'unavailable'
    | string;
  depthIr?: 'nominal' | 'degraded' | 'failed' | 'unavailable' | string;
  ultrasonic?: 'nominal' | 'degraded' | 'failed' | 'unavailable' | string;
  ultrasonicArray?: 'HEALTHY' | 'DEGRADED' | 'FAILED' | string;
  imuTelemetry?: 'HEALTHY' | 'DEGRADED' | 'FAILED' | string;
  telemetryFreshnessMs?: number;
  isTelemetryStale?: boolean;
}

export interface RecognitionEvent {
  id: string;
  vehicleId: string;
  missionId?: string;
  timestampIso: string;
  state?: RecognitionState;
  recognitionState: RecognitionState;
  telemetryFreshnessMs?: number;
  directionAndCoverage?: {
    azimuthDegrees: number;
    fieldOfViewDegrees: number;
    distanceRangeMeters: number;
  };
  detectedObjects?: DetectedObject[];
  sensorHealth?: SensorHealthStatus;
  humanReadableExplanation?: string;
  explanation?: string;
  operatorAlertRequired?: boolean;
  operatorAlertTriggered?: boolean;
  safetyNote?: string;
}

export interface VehicleSensor {
  id: string;
  type: string;
  status: 'HEALTHY' | 'DEGRADED' | 'FAILED' | string;
  lastReadingIso: string;
}

export interface MobilityVehicle {
  id: string;
  name: string;
  type: 'INTERNAL_HOSPITAL_AMR' | 'DELIVERY_DRONE' | 'AUTONOMOUS_GROUND_VEHICLE' | string;
  vehicleType?: string;
  manufacturer: string;
  model: string;
  status: 'ACTIVE_MISSION' | 'IDLE_AVAILABLE' | 'MAINTENANCE' | 'STANDBY' | string;
  operatingStatus: string;
  operatingMode: 'AUTONOMOUS' | 'STANDBY' | 'MANUAL_OVERRIDE' | string;
  assignedMissionId?: string;
  currentLocation: {
    facilityId: string;
    areaOrFloor?: string;
    building?: string;
    floor?: string;
    zone?: string;
    coordinates?: {
      x?: number;
      y?: number;
      z?: number;
      latitude?: number;
      longitude?: number;
      altitudeMeters?: number;
      lat?: number;
      lng?: number;
    };
    headingDegrees?: number;
    speedMps?: number;
  };
  batteryPercent: number;
  connectivity:
    | {
        status: 'ONLINE' | 'DEGRADED' | 'OFFLINE' | string;
        protocol?: string;
        latencyMs?: number;
        lastHeartbeatIso?: string;
      }
    | string;
  payloadCapacityKg?: number;
  currentPayloadKg?: number;
  sensors?: VehicleSensor[];
  temperatureChamber?: {
    currentCelsius: number;
    targetMinCelsius?: number;
    targetMaxCelsius?: number;
    targetCelsius?: number;
    coolingActive?: boolean;
    inRange?: boolean;
  };
  safetyInterlockEngaged: boolean;
  hardwareIntegrationType?: string;
  lastTelemetryIso: string;
}

export type MissionPriority = 'LOW' | 'NORMAL' | 'URGENT' | 'CRITICAL' | 'EMERGENCY_STAT';

export type MissionStatus =
  | 'REQUESTED'
  | 'VALIDATED'
  | 'ASSIGNED'
  | 'APPROVED'
  | 'DISPATCHED'
  | 'EN_ROUTE'
  | 'IN_TRANSIT'
  | 'READY_FOR_DISPATCH'
  | 'PAUSED'
  | 'ARRIVED'
  | 'DELIVERED'
  | 'COMPLETED'
  | 'CANCELLED'
  | 'ABORTED';

export type OperatorActionType =
  | 'APPROVE'
  | 'ASSIGN_VEHICLE'
  | 'DISPATCH'
  | 'PAUSE'
  | 'RESUME'
  | 'REASSIGN'
  | 'REROUTE'
  | 'RETURN_TO_BASE'
  | 'CANCEL'
  | 'ABORT'
  | 'VERIFY_HANDOFF'
  | 'VERIFY_DELIVERY'
  | 'CLEAR_ALERT'
  | 'ACKNOWLEDGE_ALERT'
  | 'ENGAGE_INTERLOCK'
  | 'DISENGAGE_INTERLOCK';

export interface DeliveryEvidence {
  recipientId?: string;
  recipientName?: string;
  recipientBadgeVerified?: boolean;
  tamperSealIntact: boolean;
  deliveredTemperatureCelsius?: number;
  temperatureAtDeliveryCelsius?: number;
  signatureDataUri?: string;
  notes?: string;
  timestampIso?: string;
  verifiedAtIso?: string;
  verifiedByStaffId?: string;
  verificationMethod?: string;
  secureOtpOrCode?: string;
}

export interface MissionFacility {
  facilityId: string;
  facilityName: string;
  contactPhone?: string;
  locationDescription?: string;
}

export interface MissionWaypoint {
  waypointId: string;
  label: string;
  isCompleted: boolean;
  estimatedArrivalIso?: string;
}

export interface MissionCustodyRecord {
  timestampIso: string;
  actorId: string;
  actorName: string;
  role: string;
  actionTaken: string;
  notes?: string;
  locationSnapshot?: string;
}

export interface MissionAuditRecord {
  timestampIso: string;
  performedBy: string;
  action: string;
  rationale?: string;
}

export interface MobilityMission {
  id: string;
  requestingOrganization?: string;
  title?: string;
  originFacility?: MissionFacility;
  originFacilityId?: string;
  destinationFacility?: MissionFacility;
  destinationFacilityId?: string;
  itemCategory: string;
  priority: MissionPriority;
  status: MissionStatus;
  payloadDescription?: string;
  payload?: {
    itemDescription?: string;
    description?: string;
    quantity?: string;
    type?: string;
    weightKg: number;
    requiresTemperatureControl?: boolean;
    temperatureRequirement?: {
      targetCelsius: number;
      minCelsius: number;
      maxCelsius: number;
      ambientTolerableMinutes?: number;
    };
    temperatureRangeCelsius?: {
      min: number;
      max: number;
    };
    tamperEvidentSealId?: string;
    hazardousCategory?: string;
    hazardousOrBiohazard?: boolean;
    chainOfCustodyRequired?: boolean;
    requiresTamperEvidentSeal?: boolean;
    fragile?: boolean;
  };
  assignedVehicleId?: string;
  responsibleOperatorId?: string;
  dispatchedAt?: string;
  completedAt?: string;
  estimatedCompletionIso?: string;

  plannedRoute?: {
    waypoints: MissionWaypoint[];
    estimatedDistanceMeters: number;
    estimatedDurationMinutes: number;
  };
  chainOfCustody?: MissionCustodyRecord[];
  operationalAlerts?: Array<{
    id: string;
    severity: 'INFO' | 'WARNING' | 'CRITICAL';
    message: string;
    timestampIso: string;
  }>;
  recognitionEvents?: RecognitionEvent[];
  auditHistory?: MissionAuditRecord[];
  deliveryEvidence?: DeliveryEvidence;
  operatorNotes?: string;
  createdAtIso?: string;
  updatedAtIso?: string;
  createdAt?: string;
  updatedAt?: string;
}
