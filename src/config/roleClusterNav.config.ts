/**
 * Role Cluster Navigation — single source of truth for per-role home routes and
 * curated sidebar nav ordering.
 *
 * Each of the 21 hospital roles belongs to one of 8 clusters. Each role gets:
 *   - homeRoute   — where the user lands after login or on '/'
 *   - navItemIds  — ordered positive allowlist for the sidebar (6-16 items)
 *
 * Nav item IDs match CANONICAL_ROUTE_MAP route IDs. Only routes the role can
 * actually access (per allowedRoles in routes.config.ts) are listed.
 * The route guard enforces access; this config only controls visibility and order.
 *
 * Emergency role IDs (the 11-role legacy system) are mapped to hospital roles
 * via EMERGENCY_TO_HOSPITAL_ROLE so legacy callers continue to resolve correctly.
 */

import { CANONICAL_PILOT_VISIBLE_NAV_IDS, CANONICAL_ROUTES, TRIAGE_PRETRIAGE_ROUTE } from './routes.config';

// ─── Home routes (per hospital role) ─────────────────────────────────────────

export const HOSPITAL_ROLE_HOME_ROUTES: Readonly<Record<string, string>> = Object.freeze({
  // Cluster A — Pre-Hospital Command
  dispatcher:               CANONICAL_ROUTES.emergencyDispatch,
  ems_coordinator:          CANONICAL_ROUTES.emergencyEms,
  paramedic:                CANONICAL_ROUTES.emergencyEms,
  // Cluster B — Reception & Intake
  registration_clerk:       CANONICAL_ROUTES.emergencyReception,
  // Cluster C — Nursing & Triage
  triage_nurse:             TRIAGE_PRETRIAGE_ROUTE,
  registered_nurse:         CANONICAL_ROUTES.emergencyQueues,
  charge_nurse:             CANONICAL_ROUTES.emergencyWhiteboard,
  // Cluster D — Physicians
  emergency_physician:      CANONICAL_ROUTES.emergencyWhiteboard,
  attending_physician:      CANONICAL_ROUTES.emergencyWhiteboard,
  resident_physician:       CANONICAL_ROUTES.emergencyWhiteboard,
  specialist:               CANONICAL_ROUTES.emergencyPatients,
  // Cluster E — Ancillary Clinical
  pharmacist:               CANONICAL_ROUTES.emergencyDiagnostics,
  lab_technician:           CANONICAL_ROUTES.emergencyDiagnostics,
  radiology_technician:     CANONICAL_ROUTES.emergencyDiagnostics,
  // Cluster F — Operations & Leadership
  patient_flow_coordinator: CANONICAL_ROUTES.emergencyQueues,
  hospital_admin:           CANONICAL_ROUTES.emergencyAnalytics,
  ed_director:              CANONICAL_ROUTES.emergencyWhiteboard,
  quality_safety_officer:   CANONICAL_ROUTES.emergencyReports,
  // Cluster G — IT & Platform
  it_admin:                 CANONICAL_ROUTES.emergencySettings,
  super_admin:              CANONICAL_ROUTES.emergencySettings,
  // Cluster H — Demo / Observer
  demo_observer:            CANONICAL_ROUTES.emergencyWhiteboard,
});

// ─── Curated nav item ID lists (ordered positive allowlist) ──────────────────
// Items listed first appear at the top of the sidebar.
// Each list is verified against allowedRoles in CANONICAL_ROUTE_MAP.
// Route guards enforce actual access; this list only controls what appears in nav.

export const HOSPITAL_ROLE_NAV_IDS: Readonly<Record<string, readonly string[]>> = Object.freeze({

  // ── Cluster A: Pre-Hospital Command ────────────────────────────────────────
  dispatcher: Object.freeze([
    'dispatch', 'ems', 'fleet', 'alerts', 'help',
  ]),
  ems_coordinator: Object.freeze([
    'ems', 'dispatch', 'ed-readiness', 'capacity', 'patients', 'alerts', 'fleet', 'analytics', 'help',
  ]),
  paramedic: Object.freeze([
    'ems', 'patients', 'alerts', 'tools', 'help',
  ]),

  // ── Cluster B: Reception & Intake ──────────────────────────────────────────
  registration_clerk: Object.freeze([
    'reception', 'patients', 'pulse', 'shift', 'alerts', 'help',
  ]),

  // ── Cluster C: Nursing & Triage ────────────────────────────────────────────
  triage_nurse: Object.freeze([
    'triage', 'reception', 'patients', 'queues', 'reassessment', 'alerts', 'copilot', 'tools', 'help',
  ]),
  registered_nurse: Object.freeze([
    'patients', 'queues', 'whiteboard', 'triage', 'reassessment', 'diagnostics',
    'handoffs', 'alerts', 'copilot', 'tools', 'shift', 'help',
  ]),
  charge_nurse: Object.freeze([
    'whiteboard', 'reception', 'patients', 'queues', 'triage', 'reassessment',
    'capacity', 'hospital-map', 'handoffs', 'referrals', 'copilot', 'alerts',
    'predictive-analytics', 'analytics', 'tools', 'shift', 'settings', 'help',
  ]),

  // ── Cluster D: Physicians ──────────────────────────────────────────────────
  emergency_physician: Object.freeze([
    'whiteboard', 'patients', 'copilot', 'tools', 'analytics', 'command-center',
    'alerts', 'diagnostics', 'handoffs', 'reports', 'help',
  ]),
  attending_physician: Object.freeze([
    'whiteboard', 'patients', 'copilot', 'tools', 'analytics', 'command-center',
    'alerts', 'diagnostics', 'handoffs', 'reports', 'help',
  ]),
  resident_physician: Object.freeze([
    'whiteboard', 'patients', 'queues', 'reassessment', 'diagnostics',
    'handoffs', 'copilot', 'alerts', 'tools', 'help',
  ]),
  specialist: Object.freeze([
    'patients', 'queues', 'diagnostics', 'referrals', 'copilot', 'alerts', 'tools', 'help',
  ]),

  // ── Cluster E: Ancillary Clinical ──────────────────────────────────────────
  pharmacist: Object.freeze([
    'diagnostics', 'patients', 'alerts', 'help',
  ]),
  lab_technician: Object.freeze([
    'diagnostics', 'patients', 'alerts', 'help',
  ]),
  radiology_technician: Object.freeze([
    'diagnostics', 'patients', 'alerts', 'help',
  ]),

  // ── Cluster F: Operations & Leadership ────────────────────────────────────
  patient_flow_coordinator: Object.freeze([
    'queues', 'whiteboard', 'patients', 'capacity', 'hospital-map', 'handoffs', 'reports', 'alerts', 'pulse', 'shift', 'help',
  ]),
  hospital_admin: CANONICAL_PILOT_VISIBLE_NAV_IDS,
  ed_director: CANONICAL_PILOT_VISIBLE_NAV_IDS,
  quality_safety_officer: Object.freeze([
    'reports', 'analytics', 'predictive-analytics', 'executive', 'whiteboard', 'hospital-map', 'patients', 'diagnostics',
    'alerts', 'copilot', 'admin', 'audit', 'help',
  ]),

  // ── Cluster G: IT & Platform ───────────────────────────────────────────────
  it_admin: Object.freeze([
    'settings', 'admin', 'medical-iot', 'audit', 'reports', 'alerts', 'help',
  ]),
  super_admin: CANONICAL_PILOT_VISIBLE_NAV_IDS,

  // ── Cluster H: Demo / Observer ─────────────────────────────────────────────
  demo_observer: Object.freeze([
    'whiteboard', 'analytics', 'help',
  ]),
});

// ─── Legacy emergency role → hospital role mapping ────────────────────────────
// Backward compat: callers that pass old 11-role emergency IDs still resolve correctly.

const EMERGENCY_TO_HOSPITAL_ROLE: Readonly<Record<string, string>> = Object.freeze({
  admin:              'hospital_admin',
  ed_manager:         'ed_director',
  charge_nurse:       'charge_nurse',
  triage_nurse:       'triage_nurse',
  registered_nurse:   'registered_nurse',
  physician:          'emergency_physician',
  registration_clerk: 'registration_clerk',
  ems_user:           'paramedic',
  dispatcher:         'dispatcher',
  ems_coordinator:    'ems_coordinator',
  read_only_viewer:   'demo_observer',
  public_display:     'demo_observer',
});

// ─── Helpers ──────────────────────────────────────────────────────────────────

function normalizeRoleId(role: string | null | undefined): string {
  return String(role || '').trim().toLowerCase().replace(/-/g, '_');
}

function resolveToHospitalRole(role: string | null | undefined): string {
  const normalized = normalizeRoleId(role);
  if (HOSPITAL_ROLE_NAV_IDS[normalized]) return normalized;
  return EMERGENCY_TO_HOSPITAL_ROLE[normalized] || normalized;
}

/**
 * Returns the home route for a given role (hospital role ID or legacy emergency role ID).
 * Falls back to the ED whiteboard for unknown roles.
 */
export function getHomeRouteForRole(role: string | null | undefined): string {
  const hospitalRole = resolveToHospitalRole(role);
  return HOSPITAL_ROLE_HOME_ROUTES[hospitalRole] || CANONICAL_ROUTES.emergencyWhiteboard;
}

/**
 * Returns the ordered sidebar nav item ID allowlist for a given role.
 * Accepts both hospital role IDs (e.g. 'emergency_physician') and legacy
 * emergency role IDs (e.g. 'physician').
 * Falls back to the demo_observer list for unknown roles.
 */
export function getNavItemIdsForRole(role: string | null | undefined): readonly string[] {
  const hospitalRole = resolveToHospitalRole(role);
  return HOSPITAL_ROLE_NAV_IDS[hospitalRole] || HOSPITAL_ROLE_NAV_IDS.emergency_physician;
}
