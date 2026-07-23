/**
 * ED staff → Collaboration Hub wiring.
 * Focused on emergency department staff profiles (demo role switcher + emergency RBAC),
 * not hospital-wide ancillary roles.
 */
import { CANONICAL_ROUTES } from './routes.config';
import { EMERGENCY_ROLE_IDS, normalizeEmergencyRole } from './emergencyRolePermissions';
import { getVisibleNavigation } from './unified-navigation.config';
import { canAccessEmergencyRoute } from './emergencyRolePermissions';
import { CURATED_DEMO_ROLE_VIEWS } from './demoPersonaModel';

/** Curated ED staff workflow profiles (excludes public waiting wall). */
export const ED_STAFF_EMERGENCY_ROLE_IDS = Object.freeze([
  EMERGENCY_ROLE_IDS.registrationClerk,
  EMERGENCY_ROLE_IDS.triageNurse,
  EMERGENCY_ROLE_IDS.chargeNurse,
  EMERGENCY_ROLE_IDS.physician,
  EMERGENCY_ROLE_IDS.edManager,
  EMERGENCY_ROLE_IDS.emsUser,
  EMERGENCY_ROLE_IDS.dispatcher,
  EMERGENCY_ROLE_IDS.emsCoordinator,
  EMERGENCY_ROLE_IDS.readOnlyViewer,
] as const);

/** Preferred collab channel slug for each ED staff role (desk-demo + deep links). */
export const ED_STAFF_COLLAB_CHANNEL_BY_ROLE: Readonly<Record<string, string>> = Object.freeze({
  [EMERGENCY_ROLE_IDS.registrationClerk]: 'reception',
  [EMERGENCY_ROLE_IDS.triageNurse]: 'triage',
  [EMERGENCY_ROLE_IDS.chargeNurse]: 'charge_nurses',
  [EMERGENCY_ROLE_IDS.physician]: 'physicians',
  [EMERGENCY_ROLE_IDS.edManager]: 'hospital_operations',
  [EMERGENCY_ROLE_IDS.emsUser]: 'ems',
  [EMERGENCY_ROLE_IDS.dispatcher]: 'ems',
  [EMERGENCY_ROLE_IDS.emsCoordinator]: 'ems',
  [EMERGENCY_ROLE_IDS.readOnlyViewer]: 'emergency_department',
  [EMERGENCY_ROLE_IDS.admin]: 'administration',
});

export function isEdStaffEmergencyRole(role: string | null | undefined): boolean {
  const normalized = normalizeEmergencyRole(role);
  return (ED_STAFF_EMERGENCY_ROLE_IDS as readonly string[]).includes(normalized);
}

/** Staff (not public wall) who should see Collaboration Hub in day-to-day ED work. */
export function edStaffShouldSeeCollaboration(role: string | null | undefined): boolean {
  const normalized = normalizeEmergencyRole(role);
  if (normalized === EMERGENCY_ROLE_IDS.publicDisplay) return false;
  return canAccessEmergencyRoute(normalized, CANONICAL_ROUTES.emergencyCollaboration);
}

export function resolveEdStaffCollabChannelSlug(role: string | null | undefined): string {
  const normalized = normalizeEmergencyRole(role);
  return ED_STAFF_COLLAB_CHANNEL_BY_ROLE[normalized] || 'emergency_department';
}

export function buildEdStaffCollaborationPath(role: string | null | undefined): string {
  const slug = resolveEdStaffCollabChannelSlug(role);
  return `${CANONICAL_ROUTES.emergencyCollaboration}?channel=${encodeURIComponent(slug)}`;
}

export function edStaffNavIncludesCollaboration(role: string | null | undefined): boolean {
  return getVisibleNavigation(role).some((item) => item.id === 'collaboration');
}

/** Curated demo ED lanes that are real staff (not public display). */
export function listCuratedEdStaffRoleViews() {
  return CURATED_DEMO_ROLE_VIEWS.filter(
    (view) => view.emergencyRoleId !== EMERGENCY_ROLE_IDS.publicDisplay,
  );
}

export function assertEdStaffCollaborationWiring(): {
  role: string;
  nav: boolean;
  route: boolean;
  channel: string;
}[] {
  return ED_STAFF_EMERGENCY_ROLE_IDS.map((role) => ({
    role,
    nav: edStaffNavIncludesCollaboration(role),
    route: canAccessEmergencyRoute(role, CANONICAL_ROUTES.emergencyCollaboration),
    channel: resolveEdStaffCollabChannelSlug(role),
  }));
}
