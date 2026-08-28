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
  social_worker:            CANONICAL_ROUTES.emergencyPatients,
  security_officer:         CANONICAL_ROUTES.emergencyAlerts,
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
  public_waiting:           CANONICAL_ROUTES.emergencyWhiteboard,
});

// ─── Curated nav item ID lists (ordered positive allowlist) ──────────────────
// Items listed first appear at the top of the sidebar.
// Each list is verified against allowedRoles in CANONICAL_ROUTE_MAP.
// Route guards enforce actual access; this list only controls what appears in nav.

export const HOSPITAL_ROLE_NAV_IDS: Readonly<Record<string, readonly string[]>> = Object.freeze({

  // ── Cluster A: Pre-Hospital Command ────────────────────────────────────────
  dispatcher: Object.freeze([
    'dispatch', 'ems', 'fleet', 'alerts', 'collaboration', 'help',
  ]),
  ems_coordinator: Object.freeze([
    'ems', 'dispatch', 'ed-readiness', 'capacity', 'patients', 'alerts', 'fleet', 'analytics', 'collaboration', 'help',
  ]),
  paramedic: Object.freeze([
    'ems', 'patients', 'alerts', 'tools', 'collaboration', 'help',
  ]),

  // ── Cluster B: Reception & Intake ──────────────────────────────────────────
  registration_clerk: Object.freeze([
    'reception', 'patients', 'pulse', 'shift', 'alerts', 'copilot', 'collaboration', 'help',
  ]),

  // ── Cluster C: Nursing & Triage ────────────────────────────────────────────
  triage_nurse: Object.freeze([
    'triage', 'reception', 'patients', 'queues', 'reassessment', 'alerts', 'copilot', 'tools', 'collaboration', 'help',
  ]),
  registered_nurse: Object.freeze([
    'patients', 'queues', 'whiteboard', 'triage', 'reassessment', 'diagnostics',
    'handoffs', 'alerts', 'copilot', 'tools', 'shift', 'collaboration', 'help',
  ]),
  charge_nurse: Object.freeze([
    'whiteboard', 'reception', 'patients', 'queues', 'triage', 'reassessment',
    'capacity', 'hospital-map', 'handoffs', 'referrals', 'copilot', 'alerts',
    'predictive-analytics', 'analytics', 'tools', 'shift', 'collaboration', 'settings', 'help',
  ]),

  // ── Cluster D: Physicians ──────────────────────────────────────────────────
  emergency_physician: Object.freeze([
    'whiteboard', 'patients', 'copilot', 'tools', 'analytics', 'command-center',
    'alerts', 'diagnostics', 'handoffs', 'reports', 'collaboration', 'help',
  ]),
  attending_physician: Object.freeze([
    'whiteboard', 'patients', 'copilot', 'tools', 'analytics', 'command-center',
    'alerts', 'diagnostics', 'handoffs', 'reports', 'collaboration', 'help',
  ]),
  resident_physician: Object.freeze([
    'whiteboard', 'patients', 'queues', 'reassessment', 'diagnostics',
    'handoffs', 'copilot', 'alerts', 'tools', 'collaboration', 'help',
  ]),
  specialist: Object.freeze([
    'patients', 'queues', 'diagnostics', 'referrals', 'copilot', 'alerts', 'tools', 'collaboration', 'help',
  ]),

  // ── Cluster E: Ancillary Clinical ──────────────────────────────────────────
  pharmacist: Object.freeze([
    'diagnostics', 'patients', 'alerts', 'collaboration', 'help',
  ]),
  lab_technician: Object.freeze([
    'diagnostics', 'patients', 'alerts', 'collaboration', 'help',
  ]),
  radiology_technician: Object.freeze([
    'diagnostics', 'patients', 'alerts', 'collaboration', 'help',
  ]),
  social_worker: Object.freeze([
    'patients', 'alerts', 'handoffs', 'collaboration', 'help',
  ]),
  security_officer: Object.freeze([
    'alerts', 'patients', 'collaboration', 'help',
  ]),

  // ── Cluster F: Operations & Leadership ────────────────────────────────────
  patient_flow_coordinator: Object.freeze([
    'queues', 'whiteboard', 'patients', 'capacity', 'hospital-map', 'handoffs', 'reports', 'alerts', 'pulse', 'shift', 'collaboration', 'help',
  ]),
  hospital_admin: CANONICAL_PILOT_VISIBLE_NAV_IDS,
  ed_director: CANONICAL_PILOT_VISIBLE_NAV_IDS,
  quality_safety_officer: Object.freeze([
    'reports', 'analytics', 'predictive-analytics', 'executive', 'whiteboard', 'hospital-map', 'patients', 'diagnostics',
    'alerts', 'copilot', 'admin', 'audit', 'collaboration', 'help',
  ]),

  // ── Cluster G: IT & Platform ───────────────────────────────────────────────
  // 'medical-iot' intentionally excluded: its route has showInNav:false (reached via
  // Admin Ops Home instead), so curating it here would list a sidebar entry that can
  // never actually render (NAVIGATION_ITEMS filters out showInNav:false routes).
  // 'reports' (emergencyReports) and 'alerts' (emergencyAlerts, clinical
  // alert escalation) were previously curated here but aren't in
  // EMERGENCY_ROLE_DEFINITIONS.itAdmin.routes (emergencyRolePermissions.ts) --
  // that role's own comment is explicit: "deliberately excludes patient
  // whiteboard, EMS, intake, reception, and all other clinical/PHI-bearing
  // routes (data minimization: metadata only)". Removed so the sidebar
  // doesn't offer a link the role's own route allowlist would reject. This
  // drift was masked until now by a separate bug (it_admin had no self-alias
  // in normalizeEmergencyRole's ROLE_ALIASES, so it silently resolved to
  // read_only_viewer everywhere getVisibleNavigation/canAccessEmergencyRoute
  // are keyed off that normalizer -- both sides of the comparison were
  // wrong in the same way, so it never surfaced as a mismatch).
  it_admin: Object.freeze(['settings', 'admin', 'audit', 'collaboration', 'help']),
  super_admin: CANONICAL_PILOT_VISIBLE_NAV_IDS,

  // ── Cluster H: Demo / Observer ─────────────────────────────────────────────
  // Ops wall / read-only ED board keeps collab for staff briefings.
  demo_observer: Object.freeze([
    'whiteboard', 'analytics', 'collaboration', 'help',
  ]),
  // Patient-facing waiting wall — no staff Collaboration Hub.
  public_waiting: Object.freeze([
    'whiteboard', 'analytics', 'help',
  ]),
});

// ─── Legacy emergency role → hospital role mapping ────────────────────────────
// Backward compat: callers that pass old 11-role emergency IDs still resolve correctly.

const EMERGENCY_TO_HOSPITAL_ROLE: Readonly<Record<string, string>> = Object.freeze({
  // 'admin' and 'ed_manager' must match src/lib/users/canonicalAccess.ts's
  // ALIAS_TO_HOSPITAL_ROLE (the authoritative, twice-bug-fixed resolver) --
  // super_admin declares 'admin' as an explicit alias, and 'ed_manager' falls
  // to hospital_admin via catalog order. This map previously disagreed with
  // both that resolver AND emergencyRolePermissions.ts's own 'ed_manager'
  // defaultRoute (/emergency/analytics, i.e. hospital_admin's home, not
  // ed_director's whiteboard) -- the same legacy string resolved to a
  // different hospital role, and thus a different home page, depending on
  // which of the two resolvers a caller happened to go through.
  admin:              'super_admin',
  ed_manager:         'hospital_admin',
  charge_nurse:       'charge_nurse',
  triage_nurse:       'triage_nurse',
  registered_nurse:   'registered_nurse',
  physician:          'emergency_physician',
  registration_clerk: 'registration_clerk',
  ems_user:           'paramedic',
  dispatcher:         'dispatcher',
  ems_coordinator:    'ems_coordinator',
  read_only_viewer:   'demo_observer',
  public_display:     'public_waiting',
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
 * Whether `role` has an explicit, curated entry in HOSPITAL_ROLE_HOME_ROUTES
 * (vs. getHomeRouteForRole()'s own generic ED-whiteboard fallback). Callers
 * chaining getHomeRouteForRole() with a further fallback (e.g. a
 * legacy-emergency-role resolver, or a reception-first default) must check
 * this FIRST -- getHomeRouteForRole() never returns falsy, so
 * `getHomeRouteForRole(role) || nextFallback` never reaches nextFallback
 * (found 2026-08-28: this exact bug in platformEntryModel.ts's
 * resolveClinicalHomeRoute silently misrouted any role absent from both
 * HOSPITAL_ROLE_HOME_ROUTES and EMERGENCY_TO_HOSPITAL_ROLE, e.g. the raw
 * SaaS role 'nurse', to the generic ED Whiteboard instead of its intended,
 * more-specific landing page).
 */
export function hasExplicitHomeRoute(role: string | null | undefined): boolean {
  const hospitalRole = resolveToHospitalRole(role);
  return Boolean(HOSPITAL_ROLE_HOME_ROUTES[hospitalRole]);
}

/**
 * Returns the ordered sidebar nav item ID allowlist for a given role.
 * Accepts both hospital role IDs (e.g. 'emergency_physician') and legacy
 * emergency role IDs (e.g. 'physician').
 * Falls back to the demo_observer list for unknown roles.
 *
 * Collaboration Hub is guaranteed for every known clinical/ops profile so
 * team channels stay reachable from the sidebar (not only via deep links).
 */
export function getNavItemIdsForRole(role: string | null | undefined): readonly string[] {
  const raw = normalizeRoleId(role);
  // Patient-facing wall never gets staff Collaboration Hub
  if (raw === 'public_display' || raw === 'public_waiting') {
    return HOSPITAL_ROLE_NAV_IDS.public_waiting;
  }
  const hospitalRole = resolveToHospitalRole(role);
  const base =
    HOSPITAL_ROLE_NAV_IDS[hospitalRole] ||
    HOSPITAL_ROLE_NAV_IDS.demo_observer ||
    Object.freeze(['collaboration', 'help']);
  if (base.includes('collaboration') || hospitalRole === 'public_waiting') return base;
  // Defensive: ED staff profiles always keep Collaboration Hub reachable
  const list = [...base];
  const helpIdx = list.indexOf('help');
  if (helpIdx >= 0) list.splice(helpIdx, 0, 'collaboration');
  else list.push('collaboration');
  return Object.freeze(list);
}

/** True when sidebar allowlist includes Collaboration Hub for this role. */
export function roleNavIncludesCollaboration(role: string | null | undefined): boolean {
  return getNavItemIdsForRole(role).includes('collaboration');
}
