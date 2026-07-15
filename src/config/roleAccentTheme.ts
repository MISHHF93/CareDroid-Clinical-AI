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

export type RoleAccentGroupId =
  | 'reception'
  | 'triage'
  | 'nurse'
  | 'physician'
  | 'ems'
  | 'operations'
  | 'admin'
  | 'default';

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
  [EMERGENCY_ROLE_IDS.edManager]: 'operations',
  [EMERGENCY_ROLE_IDS.readOnlyViewer]: 'default',
  [EMERGENCY_ROLE_IDS.publicDisplay]: 'default',
};

/**
 * Hex values are the CareDroid Clinical Design System (CCDS) palette swatches:
 * Reception = Primary Clinical Blue, Physician = Information Blue (a distinct,
 * brighter blue so the two roles remain visually distinguishable), Triage =
 * Attention Amber, Nursing = Operational Teal, EMS = a clear green (kept off
 * the exact Success Green hex so a role accent is never visually identical to
 * a semantic "healthy" status), Administration = Neutral Gray, Operations =
 * AI Purple (reused — the CCDS brief names both as "Purple" with no second
 * hex given). "AI" itself is intentionally not a role-accent group: it isn't
 * a login role, and AI-specific surfaces already carry this exact purple via
 * --semantic-ai-assistance (see medical-color-layer.css).
 */
export const ROLE_ACCENT_GROUP_META: Record<RoleAccentGroupId, RoleAccentGroupMeta> = {
  reception: {
    id: 'reception',
    label: 'Reception',
    description: 'Patient flow and registration — CCDS Primary Clinical Blue.',
    accent: '#075985',
  },
  triage: {
    id: 'triage',
    label: 'Triage',
    description: 'Urgency and acuity — a deep amber, distinct from the Attention semantic tone.',
    accent: '#92400e',
  },
  nurse: {
    id: 'nurse',
    label: 'Nursing',
    description: 'Active patient care — CCDS Operational Teal.',
    accent: '#0f766e',
  },
  physician: {
    id: 'physician',
    label: 'Physician',
    description: 'Clinical decision support — CCDS Information Blue.',
    accent: '#175cd3',
  },
  ems: {
    id: 'ems',
    label: 'EMS Command',
    description: 'Live operational status — green, kept distinct from the Success semantic tone.',
    accent: '#16a34a',
  },
  operations: {
    id: 'operations',
    label: 'Operations',
    description: 'Hospital operations oversight — CCDS AI Purple (shared with AI surfaces).',
    accent: '#5925dc',
  },
  admin: {
    id: 'admin',
    label: 'Administration',
    description: 'Analytics and oversight — CCDS Neutral Gray.',
    accent: '#667085',
  },
  default: {
    id: 'default',
    label: 'CareDroid standard',
    description: 'Unassigned roles keep the platform default accent.',
    accent: '#075985',
  },
};

export function resolveRoleAccentKey(role: string | null | undefined): RoleAccentGroupId {
  if (!role) return 'default';
  return ROLE_ACCENT_GROUPS[role as EmergencyRoleId] || 'default';
}
