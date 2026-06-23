/**
 * Surveillance & IoT Nexus integration contracts — adapter-ready payloads for TrackMind.
 */
import type { SurveillanceIntegrationDomain } from './surveillance.types';

export const SURVEILLANCE_NEXUS_CONTRACT_VERSION = '1.0.0';

export interface SurveillanceAdapterContract {
  adapterId: string;
  label: string;
  domain: SurveillanceIntegrationDomain;
  contractVersion: typeof SURVEILLANCE_NEXUS_CONTRACT_VERSION;
  payloadSchema: string;
  autonomousActionAllowed: false;
  requiredHumanApproval: boolean;
  welfareSafeRequired?: boolean;
  auditExportRequired: boolean;
}

export const SURVEILLANCE_ADAPTER_CONTRACTS: readonly SurveillanceAdapterContract[] = Object.freeze([
  {
    adapterId: 'hospital-vms-adapter',
    label: 'Hospital VMS ingest',
    domain: 'hospital_ops',
    contractVersion: SURVEILLANCE_NEXUS_CONTRACT_VERSION,
    payloadSchema: 'SurveillanceCamera[]',
    autonomousActionAllowed: false,
    requiredHumanApproval: false,
    auditExportRequired: true,
  },
  {
    adapterId: 'trackmind-raceday-vms',
    label: 'Race-day video ingest',
    domain: 'race_day',
    contractVersion: SURVEILLANCE_NEXUS_CONTRACT_VERSION,
    payloadSchema: 'SurveillanceCamera[]',
    autonomousActionAllowed: false,
    requiredHumanApproval: true,
    auditExportRequired: true,
  },
  {
    adapterId: 'trackmind-welfare-safe-vms',
    label: 'Welfare-safe video ingest',
    domain: 'equine_welfare',
    contractVersion: SURVEILLANCE_NEXUS_CONTRACT_VERSION,
    payloadSchema: 'SurveillanceCamera[]',
    autonomousActionAllowed: false,
    requiredHumanApproval: true,
    welfareSafeRequired: true,
    auditExportRequired: true,
  },
  {
    adapterId: 'facilities-bms-adapter',
    label: 'Facilities BMS IoT',
    domain: 'facilities',
    contractVersion: SURVEILLANCE_NEXUS_CONTRACT_VERSION,
    payloadSchema: 'SurveillanceIotDevice[]',
    autonomousActionAllowed: false,
    requiredHumanApproval: false,
    auditExportRequired: false,
  },
  {
    adapterId: 'trackmind-security-adapter',
    label: 'Security incident bridge',
    domain: 'security',
    contractVersion: SURVEILLANCE_NEXUS_CONTRACT_VERSION,
    payloadSchema: 'SurveillanceIncidentLink[]',
    autonomousActionAllowed: false,
    requiredHumanApproval: false,
    auditExportRequired: true,
  },
  {
    adapterId: 'surveillance-audit-adapter',
    label: 'Governed audit export',
    domain: 'audit',
    contractVersion: SURVEILLANCE_NEXUS_CONTRACT_VERSION,
    payloadSchema: 'SurveillanceNexusSnapshot',
    autonomousActionAllowed: false,
    requiredHumanApproval: true,
    auditExportRequired: true,
  },
]);
