/**
 * CareDroid Healthcare & Emergency Mission Intelligence Types
 * Defines comprehensive mission structures for hospital surge operations, mass-casualty
 * incidents, hospital evacuations, mobile clinics, and humanitarian response.
 */

export type HealthcareMissionType =
  | 'hospital_emergency_operations'
  | 'hospital_evacuation'
  | 'mass_casualty_response'
  | 'critical_ambulance_transfer'
  | 'remote_clinic_deployment'
  | 'medical_supply_logistics'
  | 'disaster_response'
  | 'humanitarian_assistance'
  | 'search_and_rescue_medical'
  | 'approved_defence_medical_support';

export type MissionOperationalStatus =
  | 'planning'
  | 'briefing'
  | 'active'
  | 'surge_escalated'
  | 'holding'
  | 'completed'
  | 'aborted';

export type MissionSeverityLevel = 'routine' | 'elevated' | 'critical' | 'catastrophic';

export interface MissionObjective {
  id: string;
  title: string;
  description: string;
  priority: 'low' | 'medium' | 'high' | 'critical';
  status: 'pending' | 'in_progress' | 'completed' | 'deferred';
  assignedTeam: string;
  completionPercent: number;
}

export interface MissionPatientCase {
  patientId: string;
  triageAcuity: 'ESI-1' | 'ESI-2' | 'ESI-3' | 'ESI-4' | 'ESI-5';
  chiefComplaint: string;
  assignedVehicleOrBay: string;
  status: 'awaiting_triage' | 'in_transit' | 'stabilizing' | 'transferred' | 'admitted';
}

export interface MissionAssetAllocation {
  assetId: string;
  assetType:
    | 'ambulance'
    | 'medical_drone'
    | 'hospital_robot'
    | 'portable_ventilator'
    | 'mobile_cart';
  name: string;
  status: 'en_route' | 'on_scene' | 'returning' | 'available';
  fuelOrBatteryPercent: number;
}

export interface MissionPersonnel {
  userId: string;
  fullName: string;
  role: string;
  isIncidentCommander: boolean;
  team: string;
}

export interface MissionTimelineEvent {
  eventId: string;
  timestampIso: string;
  authorId: string;
  authorRole: string;
  summary: string;
  details?: Record<string, unknown>;
  provenanceHash: string;
}

export interface HealthcareMission {
  id: string;
  codeName: string;
  type: HealthcareMissionType;
  status: MissionOperationalStatus;
  severity: MissionSeverityLevel;
  location: {
    siteName: string;
    coordinates?: { latitude: number; longitude: number };
    address?: string;
  };
  commanderUserId: string;
  commanderRole: string;
  objectives: MissionObjective[];
  patients: MissionPatientCase[];
  allocatedAssets: MissionAssetAllocation[];
  personnel: MissionPersonnel[];
  timeline: MissionTimelineEvent[];
  startedAtIso: string;
  completedAtIso?: string;
  readinessScorePercent: number;
  safetyBriefingConfirmed: boolean;
}
