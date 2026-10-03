/**
 * CareDroid Autonomous Medical Flight & UAV Types
 * Defines specifications for medical supply drones, blood product transport,
 * AED delivery, and disaster medical reconnaissance.
 *
 * SAFETY MANDATE: This platform strictly prohibits weaponization, targeting,
 * ordnance guidance, offensive electronic warfare, and lethal autonomy.
 */

export type MedicalUavMissionType =
  | 'blood_product_delivery'
  | 'aed_rapid_response'
  | 'antivenom_specimen_transport'
  | 'organ_transport'
  | 'disaster_medical_reconnaissance'
  | 'communications_relay'
  | 'search_and_rescue_medical';

export type UavFlightStatus =
  | 'preflight_check'
  | 'ready_for_takeoff'
  | 'airborne_en_route'
  | 'hovering_delivery'
  | 'returning_to_base'
  | 'landed'
  | 'ground_hold'
  | 'emergency_failsafe_landing'
  | 'aborted';

export interface GpsCoordinates {
  latitude: number;
  longitude: number;
  altitudeMetersAgl: number;
}

export interface ColdChainMonitoring {
  temperatureCelsius: number;
  minAllowedCelsius: number;
  maxAllowedCelsius: number;
  integrityStatus: 'compliant' | 'warning' | 'breached';
  tamperSealIntact: boolean;
  sampleIntervalSeconds: number;
}

export interface MedicalFlightTelemetry {
  aircraftId: string;
  timestampIso: string;
  position: GpsCoordinates;
  groundSpeedKnots: number;
  headingDegrees: number;
  batteryPercent: number;
  estimatedFlightMinutesRemaining: number;
  windSpeedKnots: number;
  gpsSatellitesLocked: number;
  coldChain?: ColdChainMonitoring;
  linkQualityPercent: number;
}

export interface ApprovedAirCorridor {
  corridorId: string;
  name: string;
  originName: string;
  destinationName: string;
  minAltitudeMetersAgl: number;
  maxAltitudeMetersAgl: number;
  waypoints: GpsCoordinates[];
  emergencyLandingSites: Array<{ name: string; coordinates: GpsCoordinates }>;
}

export interface MedicalUavItem {
  id: string;
  callsign: string;
  tailNumber: string;
  model: string;
  maxPayloadKg: number;
  cruisingSpeedKnots: number;
  status: UavFlightStatus;
  currentTelemetry: MedicalFlightTelemetry;
  approvedCorridors: string[];
  activeMissionId?: string;
  homeBaseLocation: GpsCoordinates;
}

export interface MedicalFlightDispatchPlan {
  missionType: MedicalUavMissionType;
  aircraftId?: string;
  originSite: string;
  destinationSite: string;
  corridorId: string;
  payload: {
    description: string;
    weightKg: number;
    requiresColdChain: boolean;
    tempRangeCelsius?: { min: number; max: number };
    assignedPatientId?: string;
    clinicalUrgency: 'routine' | 'stat_critical';
  };
  authorizingClinicianId: string;
  authorizingClinicianRole: string;
}

export interface FlightDispatchResult {
  success: boolean;
  flightId: string;
  aircraftId: string;
  estimatedEnRouteMinutes: number;
  status: UavFlightStatus;
  message: string;
  timestampIso: string;
}
