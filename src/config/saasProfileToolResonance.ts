/**
 * Maps canonical SaaS profiles to tool-segmentation roles, workspace defaults, and UI resonance copy.
 */
import { resolveUserProfileCopy, type ProfileCopyStack } from './userProfileCopyModel';
import { resolveUserProfileFromSaasRole } from './userProfileCatalog';
import { normalizeSaasRole } from './saasProfileConstants';

export type SaasToolSegmentationRole =
  | 'emergency physician'
  | 'hospitalist'
  | 'cardiologist'
  | 'nurse'
  | 'ICU clinician'
  | 'pediatric clinician'
  | 'pharmacist'
  | 'fleet operator'
  | 'biomedical engineer'
  | 'administrator'
  | 'researcher'
  | 'medical student';

export type SaasToolResonance = Readonly<{
  saasRole: string;
  segmentationRole: SaasToolSegmentationRole;
  defaultWorkspace: string;
  toolsTitle?: string;
  toolsSubtitle?: string;
  operationsEyebrow?: string;
  permissionLevel: 'clinician' | 'operations' | 'admin' | 'learner' | 'research';
  clinicalAccess: boolean;
  operationsAccess: boolean;
  profileCopy: ProfileCopyStack;
}>;

const SAAS_TO_SEGMENTATION: Record<string, SaasToolSegmentationRole> = Object.freeze({
  'emergency-physician': 'emergency physician',
  'icu-physician': 'ICU clinician',
  cardiologist: 'cardiologist',
  'registration-clerk': 'nurse',
  nurse: 'nurse',
  pharmacist: 'pharmacist',
  'lab-technician': 'biomedical engineer',
  'biomedical-engineer': 'biomedical engineer',
  'fleet-operator': 'fleet operator',
  'hospital-administrator': 'administrator',
  researcher: 'researcher',
  educator: 'medical student',
  student: 'medical student',
  'compliance-officer': 'administrator',
  'platform-admin': 'administrator',
  'racetrack-admin': 'administrator',
  'race-day-operations-manager': 'fleet operator',
  steward: 'fleet operator',
  'equine-welfare-officer': 'researcher',
  veterinarian: 'emergency physician',
  'executive-leadership': 'administrator',
  'auditor-regulator': 'administrator',
});

const SAAS_DEFAULT_WORKSPACE: Record<string, string> = Object.freeze({
  'registration-clerk': 'emergency',
  'fleet-operator': 'fleet',
  'biomedical-engineer': 'hospital-operations',
  'lab-technician': 'laboratory',
  'racetrack-admin': 'trackmind',
  'race-day-operations-manager': 'trackmind',
  steward: 'trackmind',
  'equine-welfare-officer': 'trackmind',
  veterinarian: 'trackmind',
  pharmacist: 'pharmacy',
  researcher: 'research',
  educator: 'education',
  student: 'education',
});

function resolvePermissionLevel(
  saasRole: string,
  segmentationRole: SaasToolSegmentationRole,
): SaasToolResonance['permissionLevel'] {
  const adminRoles = new Set([
    'platform-admin',
    'hospital-administrator',
    'compliance-officer',
    'executive-leadership',
    'auditor-regulator',
    'racetrack-admin',
  ]);
  if (adminRoles.has(saasRole)) return 'admin';
  if (['fleet-operator', 'biomedical-engineer', 'lab-technician', 'race-day-operations-manager', 'steward'].includes(saasRole)) {
    return 'operations';
  }
  if (saasRole === 'researcher' || saasRole === 'educator') return 'research';
  if (saasRole === 'student') return 'learner';
  if (segmentationRole === 'medical student') return 'learner';
  return 'clinician';
}

export function resolveSaasToolSegmentationRole(saasRole: string | null | undefined): SaasToolSegmentationRole {
  const normalized = normalizeSaasRole(saasRole);
  return SAAS_TO_SEGMENTATION[normalized] || 'medical student';
}

export function resolveSaasToolResonance(saasRole: string | null | undefined): SaasToolResonance {
  const normalized = normalizeSaasRole(saasRole);
  const catalog = resolveUserProfileFromSaasRole(normalized);
  const profileCopy = resolveUserProfileCopy({
    saasRole: normalized,
    emergencyRoleId: catalog.emergencyRoleId,
  });
  const segmentationRole = resolveSaasToolSegmentationRole(normalized);
  const permissionLevel = resolvePermissionLevel(normalized, segmentationRole);
  const clinicalAccess = !['fleet-operator', 'biomedical-engineer', 'lab-technician', 'racetrack-admin', 'race-day-operations-manager', 'steward', 'compliance-officer', 'auditor-regulator'].includes(normalized) || normalized === 'registration-clerk';
  const operationsAccess =
    permissionLevel === 'admin' ||
    permissionLevel === 'operations' ||
    ['hospital-administrator', 'executive-leadership', 'platform-admin'].includes(normalized);

  const toolsTitle =
    normalized === 'registration-clerk'
      ? 'Front-desk tools'
      : normalized.startsWith('race') || normalized.includes('track') || normalized === 'steward' || normalized === 'veterinarian' || normalized === 'equine-welfare-officer'
        ? 'TrackMind operations tools'
        : normalized === 'fleet-operator'
          ? 'Fleet operations tools'
          : normalized === 'biomedical-engineer' || normalized === 'lab-technician'
            ? 'Hospital operations & device tools'
            : 'Medical tools';

  const toolsSubtitle = profileCopy.workspaceDescription || catalog.profileBenefits;

  return Object.freeze({
    saasRole: normalized,
    segmentationRole,
    defaultWorkspace: SAAS_DEFAULT_WORKSPACE[normalized] || catalog.allowedWorkspaces[0] || 'emergency',
    toolsTitle,
    toolsSubtitle,
    operationsEyebrow: profileCopy.workspaceEyebrow,
    permissionLevel,
    clinicalAccess: normalized === 'registration-clerk' ? false : clinicalAccess,
    operationsAccess,
    profileCopy,
  });
}

export function applySaasResonanceToToolProfile(
  baseProfile: Record<string, unknown>,
  saasRole: string | null | undefined,
): Record<string, unknown> {
  const resonance = resolveSaasToolResonance(saasRole);
  return {
    ...baseProfile,
    role: resonance.segmentationRole,
    workspace: baseProfile.workspace === 'all' ? resonance.defaultWorkspace : baseProfile.workspace,
    permissionLevel: resonance.permissionLevel,
    clinicalAccess: resonance.clinicalAccess,
    operationsAccess: resonance.operationsAccess,
    saasRole: resonance.saasRole,
    roleLabel: resonance.profileCopy.personaTitle,
  };
}
