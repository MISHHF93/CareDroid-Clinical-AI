import { describe, expect, it } from 'vitest';
import { EMERGENCY_OS_ROUTE_COMMANDS, EMERGENCY_OS_TOOL_COMMANDS } from './commandPalette.config';
import { getVisibleNavigation } from './unified-navigation.config';
import { CANONICAL_ROUTES } from './routes.config';
import {
  EMERGENCY_ACTIONS,
  EMERGENCY_ROLE_IDS,
  canAccessEmergencyRoute,
  canExecuteEmergencyCommand,
  getEmergencyDemoRoles,
  getEmergencyRoleDefinition,
  getEmergencyRoleHomeRoute,
  getReceptionEmbeddedIntakePath,
  getReceptionExpressCreatePath,
  getReceptionPrimaryCreatePath,
  getReceptionQuickCreatePath,
  getReceptionSmartIntakePath,
  getReceptionWalkInQuickPath,
  prefersReceptionForPatientCreate,
  shouldHideStandaloneIntakeNav,
  getNearestEmergencyRoute,
  hasEmergencyActionPermission,
  isEmergencyReadOnlyRole,
  normalizeEmergencyRole,
  resolveEmergencyRoleId,
} from './emergencyRolePermissions';
import { getDefaultScreenModeForRole } from './emergencyRoleScreenMatrix';

describe('CareDroid role-based views', () => {
  it('merges tenant permission overrides into action checks', () => {
    expect(
      hasEmergencyActionPermission(
        EMERGENCY_ROLE_IDS.readOnlyViewer,
        EMERGENCY_ACTIONS.createPatient,
        { [EMERGENCY_ROLE_IDS.readOnlyViewer]: [EMERGENCY_ACTIONS.createPatient] },
      ),
    ).toBe(true);
  });

  it('maps platform roleProfileId to CareDroid role via org settings', () => {
    const emergencyOs = {
      roles: {
        defaultRoleProfileId: 'physician',
        emergencyRoleMapping: {
          nurse: 'triage_nurse',
          physician: 'physician',
          'clinic-administrator': 'admin',
        },
      },
    };
    expect(
      resolveEmergencyRoleId({ profile: { roleProfileId: 'nurse' } }, emergencyOs),
    ).toBe(EMERGENCY_ROLE_IDS.triageNurse);
    expect(
      resolveEmergencyRoleId({ profile: { roleProfileId: 'clinic-administrator' } }, emergencyOs),
    ).toBe(EMERGENCY_ROLE_IDS.admin);
    expect(resolveEmergencyRoleId({ role: 'Registration Clerk' }, emergencyOs)).toBe(
      EMERGENCY_ROLE_IDS.registrationClerk,
    );
  });

  it('defines the requested demo roles with stable ids', () => {
    expect(getEmergencyDemoRoles().map((role) => role.label)).toEqual([
      'Admin',
      'IT Admin',
      'ED Manager',
      'Charge Nurse',
      'Triage Nurse',
      'Physician',
      'Registration Clerk',
      'EMS User',
      'Dispatcher',
      'EMS Coordinator',
      'Read-Only Display',
      'Public Display',
    ]);
    expect(normalizeEmergencyRole('Read-Only Viewer')).toBe(EMERGENCY_ROLE_IDS.readOnlyViewer);
    expect(normalizeEmergencyRole('Read-Only Display')).toBe(EMERGENCY_ROLE_IDS.readOnlyViewer);
    expect(normalizeEmergencyRole('public display')).toBe(EMERGENCY_ROLE_IDS.publicDisplay);
    expect(normalizeEmergencyRole('paramedic')).toBe(EMERGENCY_ROLE_IDS.emsUser);
    expect(normalizeEmergencyRole('np')).toBe(EMERGENCY_ROLE_IDS.physician);
    expect(normalizeEmergencyRole('flow nurse')).toBe(EMERGENCY_ROLE_IDS.chargeNurse);
    expect(normalizeEmergencyRole('receptionist')).toBe(EMERGENCY_ROLE_IDS.registrationClerk);
  });

  it('fails closed to readOnlyViewer for an unrecognized role string, not physician (Cycle 219)', () => {
    // Used to default to EMERGENCY_ROLE_IDS.physician (full clinical write
    // access) for any input that matched none of ROLE_ALIASES' ~50 explicit
    // aliases, including a genuine typo or stale value — the opposite of
    // least privilege, and inconsistent with canonicalAccess.ts's
    // resolveHospitalRole(), which already fails safely to demo_observer
    // (emergencyRoleId 'read_only_viewer') for the identical situation.
    // demoPersonaModel.ts's applyDemoRoleView() calls this function directly,
    // so seeding a genuinely unrecognized role used to silently grant
    // physician-level access instead of the safe default either system
    // resolves an unknown role to elsewhere.
    expect(normalizeEmergencyRole('totally-unrecognized-xyz')).toBe(EMERGENCY_ROLE_IDS.readOnlyViewer);
    expect(normalizeEmergencyRole('')).toBe(EMERGENCY_ROLE_IDS.readOnlyViewer);
  });

  it('round-trips 8 more real HospitalRole values through normalizeEmergencyRole instead of falling to read_only_viewer (HEAL-208)', () => {
    // super_admin/hospital_admin/ed_director/emergency_physician/
    // attending_physician/resident_physician/specialist/
    // patient_flow_coordinator all had no ROLE_ALIASES entry -- same gap
    // class as HEAL-203's it_admin fix, just for 8 more of the 23 real
    // HospitalRole values (src/lib/users/userTypes.ts). Live-tested via
    // HEAL-207's Playwright walk: hospital_admin landed on the generic
    // read-only whiteboard instead of its real analytics dashboard.
    // Mappings sourced directly from CANONICAL_ROLE_CATALOG
    // (src/lib/users/canonicalAccess.ts), the same already-authored
    // per-role emergencyRoleId table this codebase already uses elsewhere.
    expect(normalizeEmergencyRole('super_admin')).toBe(EMERGENCY_ROLE_IDS.admin);
    expect(normalizeEmergencyRole('hospital_admin')).toBe(EMERGENCY_ROLE_IDS.edManager);
    expect(normalizeEmergencyRole('ed_director')).toBe(EMERGENCY_ROLE_IDS.edManager);
    expect(normalizeEmergencyRole('emergency_physician')).toBe(EMERGENCY_ROLE_IDS.physician);
    expect(normalizeEmergencyRole('attending_physician')).toBe(EMERGENCY_ROLE_IDS.physician);
    expect(normalizeEmergencyRole('resident_physician')).toBe(EMERGENCY_ROLE_IDS.physician);
    expect(normalizeEmergencyRole('specialist')).toBe(EMERGENCY_ROLE_IDS.physician);
    expect(normalizeEmergencyRole('patient_flow_coordinator')).toBe(EMERGENCY_ROLE_IDS.edManager);
  });

  it('still fails closed to readOnlyViewer for the 6 HospitalRole values CANONICAL_ROLE_CATALOG itself maps there (HEAL-208)', () => {
    // lab_technician, pharmacist, social_worker, security_officer,
    // quality_safety_officer, and demo_observer are NOT missing aliases --
    // CANONICAL_ROLE_CATALOG (canonicalAccess.ts) already deliberately maps
    // all 6 to emergencyRoleId 'read_only_viewer', so their current
    // fail-closed-via-the-catch-all behavior is already correct, not a gap.
    // Pinned here so a future round doesn't "fix" these 6 into ROLE_ALIASES
    // without re-checking that source of truth first.
    expect(normalizeEmergencyRole('lab_technician')).toBe(EMERGENCY_ROLE_IDS.readOnlyViewer);
    expect(normalizeEmergencyRole('pharmacist')).toBe(EMERGENCY_ROLE_IDS.readOnlyViewer);
    expect(normalizeEmergencyRole('social_worker')).toBe(EMERGENCY_ROLE_IDS.readOnlyViewer);
    expect(normalizeEmergencyRole('security_officer')).toBe(EMERGENCY_ROLE_IDS.readOnlyViewer);
    expect(normalizeEmergencyRole('quality_safety_officer')).toBe(EMERGENCY_ROLE_IDS.readOnlyViewer);
    expect(normalizeEmergencyRole('demo_observer')).toBe(EMERGENCY_ROLE_IDS.readOnlyViewer);
  });

  it('round-trips it_admin through normalizeEmergencyRole instead of falling to read_only_viewer (HEAL-203)', () => {
    // it_admin had no self-alias in ROLE_ALIASES -- every OTHER canonical
    // EMERGENCY_ROLE_IDS value round-trips through its own normalizer, but
    // 'it_admin' silently fell through to the readOnlyViewer fail-closed
    // default (Cycle 219's own safe-default mechanism, working exactly as
    // designed, just on the wrong input). Consequence: getEmergencyRoleDefinition
    // ('it_admin') returned read_only_viewer's routes/actions/label instead
    // of IT Admin's own -- IT Admin lost access to Settings/Integrations/
    // Audit/Admin Ops (their actual job) while gaining the whiteboard route
    // their own role definition explicitly excludes ("deliberately excludes
    // patient whiteboard... data minimization: metadata only").
    expect(normalizeEmergencyRole('it_admin')).toBe(EMERGENCY_ROLE_IDS.itAdmin);
    expect(normalizeEmergencyRole('IT Admin')).toBe(EMERGENCY_ROLE_IDS.itAdmin);
    expect(normalizeEmergencyRole('it-admin')).toBe(EMERGENCY_ROLE_IDS.itAdmin);

    const definition = getEmergencyRoleDefinition(EMERGENCY_ROLE_IDS.itAdmin);
    expect(definition.label).toBe('IT Admin');
    expect(definition.routes).toContain(CANONICAL_ROUTES.emergencySettings);
    expect(definition.routes).not.toContain(CANONICAL_ROUTES.emergencyWhiteboard);
    expect(isEmergencyReadOnlyRole(EMERGENCY_ROLE_IDS.itAdmin)).toBe(false);
    expect(
      hasEmergencyActionPermission(EMERGENCY_ROLE_IDS.itAdmin, EMERGENCY_ACTIONS.createPatient),
    ).toBe(false);
  });

  it('ed_manager and it_admin both lack createPatient, so Header cannot fall back to a role-blind "not read-only" check (HEAL-203)', () => {
    // Header.tsx's "New Patient" button used to be enabled by
    // `canCreatePatient || (centralControl.enabled && !emergencyRole.readOnly)`
    // -- centralControl.enabled is an org-wide toggle unrelated to the
    // current role, so any role that (a) lacks EMERGENCY_ACTIONS.createPatient
    // in its own definition but (b) also lacks an explicit readOnly:true flag
    // got an enabled button that navigated straight into the real patient-
    // creation flow. ed_manager is the clearest live case: it has no
    // readOnly flag and its own actions list has no createPatient. Pin both
    // here so Header.tsx's fix (now `canSubmitCentralIntake = canCreatePatient`)
    // can't silently regress back to the org-wide fallback.
    expect(
      hasEmergencyActionPermission(EMERGENCY_ROLE_IDS.edManager, EMERGENCY_ACTIONS.createPatient),
    ).toBe(false);
    expect(isEmergencyReadOnlyRole(EMERGENCY_ROLE_IDS.edManager)).toBe(false);
    expect(
      hasEmergencyActionPermission(EMERGENCY_ROLE_IDS.itAdmin, EMERGENCY_ACTIONS.createPatient),
    ).toBe(false);
    expect(isEmergencyReadOnlyRole(EMERGENCY_ROLE_IDS.itAdmin)).toBe(false);
  });

  it('exposes default screen modes from the role-screen matrix', () => {
    expect(getDefaultScreenModeForRole(EMERGENCY_ROLE_IDS.triageNurse)).toBe('TRIAGE_SCREEN');
    expect(getDefaultScreenModeForRole(EMERGENCY_ROLE_IDS.registrationClerk)).toBe(
      'RECEPTION_SCREEN',
    );
  });

  it('filters CareDroid navigation by role', () => {
    const clerkNavIds = getVisibleNavigation(EMERGENCY_ROLE_IDS.registrationClerk).map(
      (item) => item.id,
    );
    expect(clerkNavIds).toContain('reception');
    expect(clerkNavIds).toContain('patients');
    expect(clerkNavIds).not.toContain('whiteboard');
    expect(clerkNavIds).not.toContain('settings');
    expect(clerkNavIds).not.toContain('queues');
    expect(clerkNavIds).not.toContain('tools');
    expect(clerkNavIds).not.toContain('platform');

    expect(
      canAccessEmergencyRoute(EMERGENCY_ROLE_IDS.registrationClerk, CANONICAL_ROUTES.emergencyQueues),
    ).toBe(false);
    expect(
      canAccessEmergencyRoute(EMERGENCY_ROLE_IDS.registrationClerk, CANONICAL_ROUTES.emergencyTools),
    ).toBe(false);
    expect(
      canAccessEmergencyRoute(EMERGENCY_ROLE_IDS.registrationClerk, CANONICAL_ROUTES.workspace),
    ).toBe(false);

    const emsNavIds = getVisibleNavigation(EMERGENCY_ROLE_IDS.emsUser).map((item) => item.id);
    expect(emsNavIds).toEqual(['ems', 'patients', 'alerts', 'tools', 'collaboration', 'help']);
    expect(emsNavIds).not.toContain('settings');
  });

  it('guards page access and falls back to nearest permitted page', () => {
    expect(
      canAccessEmergencyRoute(EMERGENCY_ROLE_IDS.admin, CANONICAL_ROUTES.emergencySettings),
    ).toBe(true);
    expect(
      canAccessEmergencyRoute(
        EMERGENCY_ROLE_IDS.readOnlyViewer,
        CANONICAL_ROUTES.emergencySettings,
      ),
    ).toBe(false);
    expect(
      canAccessEmergencyRoute(
        EMERGENCY_ROLE_IDS.registrationClerk,
        CANONICAL_ROUTES.emergencyWhiteboard,
      ),
    ).toBe(false);
    expect(
      canAccessEmergencyRoute(EMERGENCY_ROLE_IDS.registrationClerk, CANONICAL_ROUTES.emergencyEms),
    ).toBe(false);
    expect(
      canAccessEmergencyRoute(EMERGENCY_ROLE_IDS.emsUser, CANONICAL_ROUTES.emergencyTools),
    ).toBe(true);
    expect(
      getNearestEmergencyRoute(
        EMERGENCY_ROLE_IDS.registrationClerk,
        CANONICAL_ROUTES.emergencySettings,
      ),
    ).toBe(CANONICAL_ROUTES.emergencyReception);
    expect(getEmergencyRoleHomeRoute(EMERGENCY_ROLE_IDS.registrationClerk)).toBe(
      CANONICAL_ROUTES.emergencyReception,
    );
    expect(getEmergencyRoleHomeRoute(EMERGENCY_ROLE_IDS.triageNurse)).toContain('queue=pretriage');
    expect(getEmergencyRoleHomeRoute(EMERGENCY_ROLE_IDS.chargeNurse)).toBe(
      CANONICAL_ROUTES.emergencyWhiteboard,
    );
    expect(getEmergencyRoleHomeRoute(EMERGENCY_ROLE_IDS.physician)).toBe(
      CANONICAL_ROUTES.emergencyWhiteboard,
    );
    expect(getEmergencyRoleHomeRoute('public display')).toContain('display=waiting-room');
    expect(getEmergencyRoleHomeRoute(EMERGENCY_ROLE_IDS.readOnlyViewer)).toContain(
      'display=readonly',
    );
    expect(prefersReceptionForPatientCreate(EMERGENCY_ROLE_IDS.registrationClerk)).toBe(true);
    expect(prefersReceptionForPatientCreate(EMERGENCY_ROLE_IDS.triageNurse)).toBe(true);
    expect(prefersReceptionForPatientCreate(EMERGENCY_ROLE_IDS.physician)).toBe(false);
    expect(prefersReceptionForPatientCreate(EMERGENCY_ROLE_IDS.emsUser)).toBe(false);
    expect(shouldHideStandaloneIntakeNav(EMERGENCY_ROLE_IDS.triageNurse)).toBe(true);
    expect(getReceptionSmartIntakePath()).toContain('/emergency/reception?');
    expect(getReceptionSmartIntakePath()).toContain('intake=1');
    expect(getReceptionSmartIntakePath()).toContain('autostart=1');
    expect(getReceptionQuickCreatePath()).toBe(getReceptionEmbeddedIntakePath());
    expect(getReceptionPrimaryCreatePath(EMERGENCY_ROLE_IDS.registrationClerk)).toBe(
      getReceptionExpressCreatePath(),
    );
    expect(getReceptionPrimaryCreatePath(EMERGENCY_ROLE_IDS.chargeNurse)).toBe(
      getReceptionEmbeddedIntakePath(),
    );
    expect(getReceptionEmbeddedIntakePath()).toContain('intake=1');
    expect(getReceptionWalkInQuickPath()).toContain('quickCreate=1');
    expect(
      getNearestEmergencyRoute(EMERGENCY_ROLE_IDS.emsUser, CANONICAL_ROUTES.emergencySettings),
    ).toBe(CANONICAL_ROUTES.emergencyEms);
  });

  it('keeps mutating action gates separate from read-only visibility', () => {
    expect(isEmergencyReadOnlyRole(EMERGENCY_ROLE_IDS.readOnlyViewer)).toBe(true);
    expect(
      hasEmergencyActionPermission(
        EMERGENCY_ROLE_IDS.readOnlyViewer,
        EMERGENCY_ACTIONS.createPatient,
      ),
    ).toBe(false);
    expect(
      hasEmergencyActionPermission(
        EMERGENCY_ROLE_IDS.readOnlyViewer,
        EMERGENCY_ACTIONS.manageReferral,
      ),
    ).toBe(false);
    expect(
      hasEmergencyActionPermission(
        EMERGENCY_ROLE_IDS.readOnlyViewer,
        EMERGENCY_ACTIONS.viewAnalytics,
      ),
    ).toBe(true);
    expect(
      hasEmergencyActionPermission(EMERGENCY_ROLE_IDS.triageNurse, EMERGENCY_ACTIONS.verifyIntake),
    ).toBe(true);
    expect(
      hasEmergencyActionPermission(EMERGENCY_ROLE_IDS.registrationClerk, EMERGENCY_ACTIONS.triage),
    ).toBe(false);
    expect(getEmergencyRoleDefinition(EMERGENCY_ROLE_IDS.physician).defaultRoute).toBe(
      CANONICAL_ROUTES.emergencyWhiteboard,
    );
  });

  it('filters route commands to role-accessible destinations', () => {
    const byId = Object.fromEntries(
      EMERGENCY_OS_ROUTE_COMMANDS.map((command) => [command.id, command]),
    );
    expect(byId['open-analytics']).toBeDefined();
    expect(canExecuteEmergencyCommand(EMERGENCY_ROLE_IDS.readOnlyViewer, byId['open-analytics'])).toBe(true);
    expect(byId['open-settings']).toBeDefined();
    expect(
      canExecuteEmergencyCommand(EMERGENCY_ROLE_IDS.readOnlyViewer, byId['open-settings']),
    ).toBe(false);
    expect(canExecuteEmergencyCommand(EMERGENCY_ROLE_IDS.emsUser, byId['open-ems'])).toBe(true);
    expect(canExecuteEmergencyCommand(EMERGENCY_ROLE_IDS.emsUser, byId['open-intake'])).toBe(false);
    expect(canExecuteEmergencyCommand(EMERGENCY_ROLE_IDS.emsUser, byId['open-tools'])).toBe(true);
  });

  it('keeps role route fixtures aligned across sidebar, direct access, and commands', () => {
    for (const { id: role } of getEmergencyDemoRoles()) {
      const definition = getEmergencyRoleDefinition(role);
      const visibleNav = getVisibleNavigation(role);

      for (const item of visibleNav) {
        expect(canAccessEmergencyRoute(role, item.path), `${role}:${item.id}`).toBe(true);
      }

      for (const command of EMERGENCY_OS_ROUTE_COMMANDS) {
        const target = command.build?.()?.path;
        if (!target) continue;
        expect(canExecuteEmergencyCommand(role, command), `${role}:${command.id}`).toBe(
          canAccessEmergencyRoute(role, target),
        );
      }

      for (const command of EMERGENCY_OS_TOOL_COMMANDS) {
        expect(canExecuteEmergencyCommand(role, command), `${role}:${command.id}`).toBe(
          definition.routes.includes(CANONICAL_ROUTES.emergencyTools),
        );
      }
    }
  });
});
