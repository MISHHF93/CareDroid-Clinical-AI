/**
 * Unified emergency display privacy — one resolver for PHI redaction across screen modes,
 * hallway monitor settings, and role-facing surfaces. Components apply policy variants; no
 * parallel render tree.
 */
import {
  CARE_DROID_SCREEN_MODE_CONFIG,
  CARE_DROID_SCREEN_MODES,
  getScreenModePhiVisibility,
  type CareDroidScreenMode,
  type ScreenModePhiVisibility,
} from './careDroidScreenModes';
import {
  normalizeWallDisplayMonitorPrivacy,
  WALL_DISPLAY_MONITOR_PRIVACY,
  type WallDisplayMonitorPrivacy,
} from './wallDisplayMonitorPrivacyModel';

export type EmergencyDisplayPrivacyTier =
  | 'public'
  | 'minimal'
  | 'restricted'
  | 'aggregate'
  | 'operational'
  | 'staff'
  | 'clinical'
  | 'none';

export type CentralNodeRedactionLevel = 'none' | 'identifiers' | 'full';

export type EmergencyDisplayPrivacyPolicy = Readonly<{
  tier: EmergencyDisplayPrivacyTier;
  source: string;
  showPatientName: boolean;
  showMrn: boolean;
  showDemographics: boolean;
  showChiefComplaint: boolean;
  showComplaintFlags: boolean;
  showVitals: boolean;
  showRoomAssignment: boolean;
  showStaffAssignment: boolean;
  showClinicalFlags: boolean;
  pseudonymizePatients: boolean;
  aggregateMetricsOnly: boolean;
  centralNodeRedaction: CentralNodeRedactionLevel;
  redactOperationalAlerts: boolean;
}>;

export type ResolveEmergencyDisplayPrivacyInput = {
  screenMode: CareDroidScreenMode;
  wallDisplayMonitorPrivacy?: WallDisplayMonitorPrivacy | string | null;
  readOnlyDisplayMode?: boolean;
  phiVisibility?: ScreenModePhiVisibility;
};

const PUBLIC_POLICY: EmergencyDisplayPrivacyPolicy = Object.freeze({
  tier: 'public',
  source: 'public waiting display',
  showPatientName: false,
  showMrn: false,
  showDemographics: false,
  showChiefComplaint: false,
  showComplaintFlags: false,
  showVitals: false,
  showRoomAssignment: false,
  showStaffAssignment: false,
  showClinicalFlags: false,
  pseudonymizePatients: true,
  aggregateMetricsOnly: true,
  centralNodeRedaction: 'full',
  redactOperationalAlerts: true,
});

const IDENTIFIER_REDACTION_BASE: EmergencyDisplayPrivacyPolicy = Object.freeze({
  tier: 'restricted',
  source: 'hallway monitor restricted privacy',
  showPatientName: false,
  showMrn: false,
  showDemographics: false,
  showChiefComplaint: false,
  showComplaintFlags: false,
  showVitals: false,
  showRoomAssignment: true,
  showStaffAssignment: false,
  showClinicalFlags: true,
  pseudonymizePatients: true,
  aggregateMetricsOnly: false,
  centralNodeRedaction: 'identifiers',
  redactOperationalAlerts: false,
});

const FULL_CLINICAL: EmergencyDisplayPrivacyPolicy = Object.freeze({
  tier: 'clinical',
  source: 'clinical screen mode',
  showPatientName: true,
  showMrn: true,
  showDemographics: true,
  showChiefComplaint: true,
  showComplaintFlags: true,
  showVitals: true,
  showRoomAssignment: true,
  showStaffAssignment: true,
  showClinicalFlags: true,
  pseudonymizePatients: false,
  aggregateMetricsOnly: false,
  centralNodeRedaction: 'none',
  redactOperationalAlerts: false,
});

const STAFF_OPERATIONAL: EmergencyDisplayPrivacyPolicy = Object.freeze({
  ...FULL_CLINICAL,
  tier: 'staff',
  source: 'staff operational screen mode',
});

const AGGREGATE_OPERATIONAL: EmergencyDisplayPrivacyPolicy = Object.freeze({
  ...IDENTIFIER_REDACTION_BASE,
  tier: 'aggregate',
  source: 'command center aggregate view',
  showClinicalFlags: false,
  aggregateMetricsOnly: true,
  centralNodeRedaction: 'identifiers',
});

const HALLWAY_OPERATIONAL: EmergencyDisplayPrivacyPolicy = Object.freeze({
  ...STAFF_OPERATIONAL,
  tier: 'operational',
  source: 'hallway monitor operational privacy',
});

const NONE_POLICY: EmergencyDisplayPrivacyPolicy = Object.freeze({
  tier: 'none',
  source: 'no patient-visible surfaces',
  showPatientName: false,
  showMrn: false,
  showDemographics: false,
  showChiefComplaint: false,
  showComplaintFlags: false,
  showVitals: false,
  showRoomAssignment: false,
  showStaffAssignment: false,
  showClinicalFlags: false,
  pseudonymizePatients: true,
  aggregateMetricsOnly: true,
  centralNodeRedaction: 'full',
  redactOperationalAlerts: true,
});

export function pseudonymizePatientId(patientId: string): string {
  const suffix = String(patientId || '').slice(-4).toUpperCase() || '0000';
  return `Patient ${suffix}`;
}

export function shouldRedactSensitiveEmergencyData(
  policy: EmergencyDisplayPrivacyPolicy,
): boolean {
  return policy.centralNodeRedaction !== 'none';
}

export function resolveEmergencyDisplayPrivacyPolicy(
  input: ResolveEmergencyDisplayPrivacyInput,
): EmergencyDisplayPrivacyPolicy {
  const screenMode = input.screenMode;
  const screenConfig = CARE_DROID_SCREEN_MODE_CONFIG[screenMode];
  const phiVisibility = input.phiVisibility ?? getScreenModePhiVisibility(screenMode);
  const monitorPrivacy = normalizeWallDisplayMonitorPrivacy(input.wallDisplayMonitorPrivacy);

  if (screenConfig?.publicDisplay || phiVisibility === 'public_redacted') {
    return PUBLIC_POLICY;
  }

  if (phiVisibility === 'none') {
    return NONE_POLICY;
  }

  if (screenMode === CARE_DROID_SCREEN_MODES.readOnlyWhiteboard || input.readOnlyDisplayMode) {
    if (monitorPrivacy === WALL_DISPLAY_MONITOR_PRIVACY.minimal) {
      return Object.freeze({
        ...PUBLIC_POLICY,
        tier: 'minimal',
        source: 'hallway monitor minimal privacy',
      });
    }
    if (monitorPrivacy === WALL_DISPLAY_MONITOR_PRIVACY.restricted) {
      return IDENTIFIER_REDACTION_BASE;
    }
    return HALLWAY_OPERATIONAL;
  }

  if (screenMode === CARE_DROID_SCREEN_MODES.commandCenter) {
    return AGGREGATE_OPERATIONAL;
  }

  if (phiVisibility === 'operational') {
    return Object.freeze({
      ...STAFF_OPERATIONAL,
      tier: 'operational',
      source: 'operational screen mode',
    });
  }

  if (phiVisibility === 'staff') {
    return STAFF_OPERATIONAL;
  }

  return FULL_CLINICAL;
}

type PatientIdentitySource = {
  id?: string;
  firstName?: string;
  lastName?: string;
  name?: string;
  mrn?: string;
};

export function formatPrivacySafePatientName(
  patient: PatientIdentitySource,
  policy: EmergencyDisplayPrivacyPolicy,
): string {
  if (policy.showPatientName && !policy.pseudonymizePatients) {
    const fullName = `${patient.firstName || ''} ${patient.lastName || ''}`.trim();
    return fullName || patient.name || patient.mrn || 'Patient';
  }
  if (policy.pseudonymizePatients && patient.id) {
    return pseudonymizePatientId(patient.id);
  }
  return 'Patient';
}

export function formatPrivacySafeMrn(
  patient: Pick<PatientIdentitySource, 'mrn'>,
  policy: EmergencyDisplayPrivacyPolicy,
): string {
  if (policy.showMrn && patient.mrn) return patient.mrn;
  return policy.showMrn ? '—' : 'Identifier hidden';
}

export function formatPrivacySafeComplaint(
  complaint: string | null | undefined,
  policy: EmergencyDisplayPrivacyPolicy,
): string {
  if (!policy.showChiefComplaint) return 'Complaint hidden for display privacy';
  return String(complaint || '').trim() || 'Complaint not recorded';
}

export function formatPrivacySafeDemographic(
  value: string | number | null | undefined,
  policy: EmergencyDisplayPrivacyPolicy,
): string {
  if (!policy.showDemographics) return '—';
  if (value === null || value === undefined || value === '') return '—';
  return String(value);
}

export function shouldRedactCentralNodeForDisplayPrivacy(
  screenMode: CareDroidScreenMode,
  monitorPrivacy?: WallDisplayMonitorPrivacy | string | null,
  readOnlyDisplayMode?: boolean,
): boolean {
  const policy = resolveEmergencyDisplayPrivacyPolicy({
    screenMode,
    wallDisplayMonitorPrivacy: monitorPrivacy,
    readOnlyDisplayMode,
  });
  return shouldRedactSensitiveEmergencyData(policy);
}
