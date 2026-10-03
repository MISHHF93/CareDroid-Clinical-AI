/**
 * CareDroid Vendor-Neutral Hospital Robotics Types
 * Defines robot fleet models, navigation coordinates, safety interlocks,
 * and delivery payloads for logistics, telepresence, and diagnostic robots.
 */

export type HospitalRobotType =
  | 'hospital_logistics'
  | 'telepresence'
  | 'supply_replenishment'
  | 'mobile_diagnostic'
  | 'emergency_response'
  | 'smart_stretcher'
  | 'autonomous_mobility';

export type RobotOperationalStatus =
  | 'docked'
  | 'navigating'
  | 'servicing_task'
  | 'charging'
  | 'fault'
  | 'emergency_stopped'
  | 'manual_override';

export type RobotAdapterProtocol = 'ros2_dds' | 'rest_bridge' | 'websocket' | 'mqtt';

export interface RobotCoordinates {
  building: string;
  floor: string;
  zone: string;
  xMeters: number;
  yMeters: number;
  headingDegrees: number;
}

export interface RobotSafetyInterlocks {
  obstacleDetected: boolean;
  emergencyStopActive: boolean;
  lidarHealthy: boolean;
  tamperDetected: boolean;
  safeSpeedLimitMetersPerSecond: number;
}

export interface RobotPayload {
  payloadType:
    | 'medications'
    | 'lab_specimens'
    | 'blood_products'
    | 'surgical_supplies'
    | 'linen'
    | 'diagnostic_tool';
  description: string;
  isSecureCompartmentLocked: boolean;
  requiresPinOrBadgeToUnlock: boolean;
  assignedPatientId?: string;
  dispatchRequestId: string;
  originLocation: string;
  destinationLocation: string;
}

export interface HospitalRobotItem {
  id: string;
  name: string;
  type: HospitalRobotType;
  manufacturer: string;
  model: string;
  status: RobotOperationalStatus;
  batteryPercent: number;
  isCharging: boolean;
  currentLocation: RobotCoordinates;
  targetDestination?: { zone: string; room: string };
  adapterProtocol: RobotAdapterProtocol;
  safety: RobotSafetyInterlocks;
  currentPayload?: RobotPayload;
  activeTaskId?: string;
}

export interface RobotDispatchCommand {
  robotId?: string;
  robotType?: HospitalRobotType;
  destinationZone: string;
  destinationRoom: string;
  payload?: RobotPayload;
  priority: 'routine' | 'urgent' | 'stat_emergency';
  requestingUserId: string;
  requestingUserRole: string;
}

export interface RobotDispatchResult {
  success: boolean;
  taskId: string;
  dispatchedRobotId?: string;
  estimatedArrivalSeconds: number;
  message: string;
  timestampIso: string;
}
