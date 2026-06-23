/**
 * Surveillance & IoT Nexus — canonical domain models (TrackMind + hospital ops).
 */

export interface SurveillanceRequestLike {
  user?: { id?: string; userId?: string; role?: string };
  ip?: string;
  connection?: { remoteAddress?: string };
  headers?: Record<string, string | string[] | undefined>;
}

export type SurveillanceDeviceStatus = 'online' | 'degraded' | 'offline' | 'maintenance';
export type SurveillanceSeverity = 'low' | 'medium' | 'high' | 'critical';
export type SurveillanceIntegrationDomain =
  | 'security'
  | 'facilities'
  | 'race_day'
  | 'equine_welfare'
  | 'hospital_ops'
  | 'audit';

export interface FacilityZone {
  id: string;
  name: string;
  shortCode: string;
  facilityId: string;
  facilityLabel: string;
  floorId?: string;
  zoneType: 'restricted' | 'public' | 'clinical' | 'paddock' | 'track' | 'back_of_house' | 'welfare';
  privacyTier: 'public' | 'operational' | 'restricted' | 'welfare_safe';
  geofence?: {
    coordinateSystem: string;
    polygon: ReadonlyArray<{ x: number; y: number }>;
  };
  linkedCameraIds: readonly string[];
  linkedIotDeviceIds: readonly string[];
  activeAlertCount: number;
  welfareSafeMode: boolean;
}

export interface SurveillanceCamera {
  id: string;
  name: string;
  model: string;
  manufacturer: string;
  streamProtocol: 'rtsp' | 'onvif' | 'webrtc' | 'adapter';
  status: SurveillanceDeviceStatus;
  zoneId: string;
  zoneLabel: string;
  facilityId: string;
  floorId?: string;
  x: number;
  y: number;
  recordingEnabled: boolean;
  privacyMaskApplied: boolean;
  lastHealthCheckAt: string;
  healthScore: number;
  firmwareVersion: string;
  integrationAdapter: string;
  linkedIncidentIds: readonly string[];
}

export interface SurveillanceIotDevice {
  id: string;
  name: string;
  deviceClass: 'sensor' | 'access_control' | 'environmental' | 'wearable' | 'beacon' | 'gateway';
  status: SurveillanceDeviceStatus;
  zoneId: string;
  zoneLabel: string;
  facilityId: string;
  battery?: number;
  signalStrength: number;
  lastSeenAt: string;
  freshness: string;
  telemetryLabel: string;
  integrationAdapter: string;
  linkedMedicalIotDeviceId?: string;
  linkedIncidentIds: readonly string[];
}

export interface SurveillanceHealthMetric {
  id: string;
  label: string;
  status: SurveillanceDeviceStatus;
  score: number;
  detail: string;
  checkedAt: string;
  domain: SurveillanceIntegrationDomain;
}

export interface SurveillanceAlertRule {
  id: string;
  name: string;
  severity: SurveillanceSeverity;
  enabled: boolean;
  trigger: string;
  zoneIds: readonly string[];
  requiresApproval: boolean;
  welfareSafe: boolean;
  linkedIntegration: SurveillanceIntegrationDomain;
}

export interface SurveillanceAlert {
  id: string;
  ruleId: string;
  title: string;
  detail: string;
  severity: SurveillanceSeverity;
  status: 'open' | 'acknowledged' | 'resolved';
  zoneId: string;
  cameraId?: string;
  iotDeviceId?: string;
  incidentId?: string;
  triggeredAt: string;
  lastObservedAt: string;
}

export interface SurveillanceIncidentLink {
  id: string;
  incidentType: 'security' | 'facilities' | 'race_day' | 'welfare' | 'clinical';
  incidentLabel: string;
  status: string;
  linkedCameraIds: readonly string[];
  linkedIotDeviceIds: readonly string[];
  zoneId: string;
  openedAt: string;
  auditRecordId?: string;
}

export interface SurveillanceIntegrationContract {
  adapterId: string;
  label: string;
  domain: SurveillanceIntegrationDomain;
  status: 'ready' | 'degraded' | 'disabled';
  contractVersion: string;
  endpointHint: string;
  requiresApproval: boolean;
}

export interface SurveillanceKpiArtifact {
  id: string;
  label: string;
  value: number | string;
  unit?: string;
  trend?: 'up' | 'down' | 'flat';
  domain: SurveillanceIntegrationDomain;
}

export interface SurveillanceNexusSnapshot {
  source: string;
  sourceLabel: string;
  demo: boolean;
  generatedAt: string;
  zones: FacilityZone[];
  cameras: SurveillanceCamera[];
  iotDevices: SurveillanceIotDevice[];
  healthMetrics: SurveillanceHealthMetric[];
  alertRules: SurveillanceAlertRule[];
  alerts: SurveillanceAlert[];
  incidentLinks: SurveillanceIncidentLink[];
  integrationContracts: SurveillanceIntegrationContract[];
  kpiArtifacts: SurveillanceKpiArtifact[];
}
