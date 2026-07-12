/**
 * CareDroid role accent theme — one accent per role group, layered on top of CDL.
 * Semantic tones (critical/warning/success/ai_assistance) never vary by role;
 * only the brand-chrome accent (links, primary buttons, focus rings, active nav,
 * hovers) does. See src/styles/role-accent-theme.css for the CSS layer this drives
 * and src/hooks/useRoleAccentTheme.ts for how the active role gets stamped onto the DOM.
 *
 * Keyed by EMERGENCY_ROLE_IDS (src/config/emergencyRolePermissions.ts) — the
 * collapsed 12-value role set `useEmergencyRolePermissions().role` actually
 * resolves to at runtime, not the 24-value HospitalRole RBAC/demo-data schema.
 */
import { EMERGENCY_ROLE_IDS } from './emergencyRolePermissions';

export type RoleAccentGroupId = 'reception' | 'triage' | 'nurse' | 'physician' | 'ems' | 'admin' | 'default';

export type RoleAccentGroupMeta = {
  id: RoleAccentGroupId;
  label: string;
  description: string;
  accent: string;
};

type EmergencyRoleId = (typeof EMERGENCY_ROLE_IDS)[keyof typeof EMERGENCY_ROLE_IDS];

/** Every emergency-permission role id, mapped to its accent group. Roles not
 * named in the brief (read-only/public display) stay on `default` rather than
 * getting an invented, undocumented palette. */
export const ROLE_ACCENT_GROUPS: Record<EmergencyRoleId, RoleAccentGroupId> = {
  [EMERGENCY_ROLE_IDS.registrationClerk]: 'reception',
  [EMERGENCY_ROLE_IDS.triageNurse]: 'triage',
  [EMERGENCY_ROLE_IDS.chargeNurse]: 'nurse',
  [EMERGENCY_ROLE_IDS.physician]: 'physician',
  [EMERGENCY_ROLE_IDS.emsUser]: 'ems',
  [EMERGENCY_ROLE_IDS.dispatcher]: 'ems',
  [EMERGENCY_ROLE_IDS.emsCoordinator]: 'ems',
  [EMERGENCY_ROLE_IDS.admin]: 'admin',
  [EMERGENCY_ROLE_IDS.itAdmin]: 'admin',
  [EMERGENCY_ROLE_IDS.edManager]: 'admin',
  [EMERGENCY_ROLE_IDS.readOnlyViewer]: 'default',
  [EMERGENCY_ROLE_IDS.publicDisplay]: 'default',
};

export const ROLE_ACCENT_GROUP_META: Record<RoleAccentGroupId, RoleAccentGroupMeta> = {
  reception: {
    id: 'reception',
    label: 'Reception',
    description: 'Patient flow and registration — canonical medical blue.',
    accent: '#0284c7',
  },
  triage: {
    id: 'triage',
    label: 'Triage',
    description: 'Urgency and acuity — amber, distinct from the warning semantic tone.',
    accent: '#a35a12',
  },
  nurse: {
    id: 'nurse',
    label: 'Nursing',
    description: 'Active patient care — dusty rose.',
    accent: '#a8456a',
  },
  physician: {
    id: 'physician',
    label: 'Physician',
    description: 'Clinical decision support — desaturated navy.',
    accent: '#1e3a5f',
  },
  ems: {
    id: 'ems',
    label: 'EMS Command',
    description: 'Live operational status — cyan.',
    accent: '#0e7490',
  },
  admin: {
    id: 'admin',
    label: 'Administration',
    description: 'Analytics and oversight — slate.',
    accent: '#475569',
  },
  default: {
    id: 'default',
    label: 'CareDroid standard',
    description: 'Unassigned roles keep the platform default accent.',
    accent: '#0ea5e9',
  },
};

export function resolveRoleAccentKey(role: string | null | undefined): RoleAccentGroupId {
  if (!role) return 'default';
  return ROLE_ACCENT_GROUPS[role as EmergencyRoleId] || 'default';
}
