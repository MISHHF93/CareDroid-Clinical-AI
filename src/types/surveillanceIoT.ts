/**
 * Shared surveillance / IoT types — mirrors backend surveillance.types.ts for frontend consumers.
 */

export type SurveillanceDeviceStatus = 'online' | 'degraded' | 'offline' | 'maintenance';
export type SurveillanceSeverity = 'low' | 'medium' | 'high' | 'critical';
export type SurveillanceIntegrationDomain =
  | 'security'
  | 'facilities'
  | 'race_day'
  | 'equine_welfare'
  | 'hospital_ops'
  | 'audit';

export type FacilityZone = Readonly<{
  id: string;
  name: string;
  shortCode: string;
  facilityId: string;
  facilityLabel: string;
  floorId?: string;
  zoneType: string;
  privacyTier: string;
  linkedCameraIds: readonly string[];
  linkedIotDeviceIds: readonly string[];
  activeAlertCount: number;
  welfareSafeMode: boolean;
}>;

export type SurveillanceCamera = Readonly<{
  id: string;
  name: string;
  model: string;
  manufacturer: string;
  streamProtocol: string;
  status: SurveillanceDeviceStatus;
  zoneId: string;
  zoneLabel: string;
  facilityId: string;
  floorId?: string;
  recordingEnabled: boolean;
  privacyMaskApplied: boolean;
  lastHealthCheckAt: string;
  healthScore: number;
  integrationAdapter: string;
  linkedIncidentIds: readonly string[];
}>;

export type SurveillanceIotDevice = Readonly<{
  id: string;
  name: string;
  deviceClass: string;
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
}>;

export type SurveillanceHealthMetric = Readonly<{
  id: string;
  label: string;
  status: SurveillanceDeviceStatus;
  score: number;
  detail: string;
  checkedAt: string;
  domain: SurveillanceIntegrationDomain;
}>;

export type SurveillanceAlertRule = Readonly<{
  id: string;
  name: string;
  severity: SurveillanceSeverity;
  enabled: boolean;
  trigger: string;
  zoneIds: readonly string[];
  requiresApproval: boolean;
  welfareSafe: boolean;
  linkedIntegration: SurveillanceIntegrationDomain;
}>;

export type SurveillanceAlert = Readonly<{
  id: string;
  ruleId: string;
  title: string;
  detail: string;
  severity: SurveillanceSeverity;
  status: string;
  zoneId: string;
  cameraId?: string;
  iotDeviceId?: string;
  incidentId?: string;
  triggeredAt: string;
  lastObservedAt: string;
}>;

export type SurveillanceIncidentLink = Readonly<{
  id: string;
  incidentType: string;
  incidentLabel: string;
  status: string;
  linkedCameraIds: readonly string[];
  linkedIotDeviceIds: readonly string[];
  zoneId: string;
  openedAt: string;
  auditRecordId?: string;
}>;

export type SurveillanceIntegrationContract = Readonly<{
  adapterId: string;
  label: string;
  domain: SurveillanceIntegrationDomain;
  status: string;
  contractVersion: string;
  endpointHint: string;
  requiresApproval: boolean;
}>;

export type SurveillanceKpiArtifact = Readonly<{
  id: string;
  label: string;
  value: number | string;
  unit?: string;
  trend?: string;
  domain: SurveillanceIntegrationDomain;
}>;

export type SurveillanceNexusSnapshot = Readonly<{
  source: string;
  sourceLabel: string;
  demo: boolean;
  generatedAt: string;
  zones: readonly FacilityZone[];
  cameras: readonly SurveillanceCamera[];
  iotDevices: readonly SurveillanceIotDevice[];
  healthMetrics: readonly SurveillanceHealthMetric[];
  alertRules: readonly SurveillanceAlertRule[];
  alerts: readonly SurveillanceAlert[];
  incidentLinks: readonly SurveillanceIncidentLink[];
  integrationContracts: readonly SurveillanceIntegrationContract[];
  kpiArtifacts: readonly SurveillanceKpiArtifact[];
}>;
