import { describe, expect, it } from 'vitest';
import { EMERGENCY_OS_ROUTE_COMMANDS } from './commandPalette.config';
import { APP_SHELL_NAV_ITEMS } from './navigation.config';
import { CANONICAL_ROUTES } from './routes.config';
import {
  EMERGENCY_ACTIONS,
  EMERGENCY_ROLE_IDS,
  canAccessEmergencyRoute,
  canExecuteEmergencyCommand,
  getEmergencyDemoRoles,
  getNearestEmergencyRoute,
  getVisibleEmergencyNavigationItems,
  hasEmergencyActionPermission,
  isEmergencyReadOnlyRole,
  normalizeEmergencyRole,
} from './emergencyRolePermissions';

const ALL_OPERATIONAL_SIDEBAR_IDS = [
  'whiteboard',
  'patients',
  'ems',
  'intake',
  'queues',
  'reassessment',
  'capacity',
  'boarding',
  'referrals',
  'copilot',
  'tools',
];

describe('Emergency OS role-based views', () => {
  it('defines the requested demo roles with stable ids', () => {
    expect(getEmergencyDemoRoles().map((role) => role.label)).toEqual([
      'Admin',
      'ED Manager',
      'Charge Nurse',
      'Triage Nurse',
      'Physician',
      'Registration Clerk',
      'EMS User',
      'Read-Only Viewer',
    ]);
    expect(normalizeEmergencyRole('Read-Only Viewer')).toBe(EMERGENCY_ROLE_IDS.readOnlyViewer);
    expect(normalizeEmergencyRole('paramedic')).toBe(EMERGENCY_ROLE_IDS.emsUser);
  });

  it('filters Emergency OS navigation by role', () => {
    const clerkNavIds = getVisibleEmergencyNavigationItems(
      EMERGENCY_ROLE_IDS.registrationClerk,
      APP_SHELL_NAV_ITEMS,
    ).map((item) => item.id);
    expect(clerkNavIds).toEqual(ALL_OPERATIONAL_SIDEBAR_IDS);
    expect(clerkNavIds).not.toContain('settings');

    const emsNavIds = getVisibleEmergencyNavigationItems(
      EMERGENCY_ROLE_IDS.emsUser,
      APP_SHELL_NAV_ITEMS,
    ).map((item) => item.id);
    expect(emsNavIds).toEqual(ALL_OPERATIONAL_SIDEBAR_IDS);
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
      canAccessEmergencyRoute(EMERGENCY_ROLE_IDS.registrationClerk, CANONICAL_ROUTES.emergencyEms),
    ).toBe(true);
    expect(
      canAccessEmergencyRoute(EMERGENCY_ROLE_IDS.emsUser, CANONICAL_ROUTES.emergencyTools),
    ).toBe(true);
    expect(
      getNearestEmergencyRoute(
        EMERGENCY_ROLE_IDS.registrationClerk,
        CANONICAL_ROUTES.emergencySettings,
      ),
    ).toBe(CANONICAL_ROUTES.emergencyIntake);
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
  });

  it('filters route commands to role-accessible destinations', () => {
    const byId = Object.fromEntries(
      EMERGENCY_OS_ROUTE_COMMANDS.map((command) => [command.id, command]),
    );
    expect(byId['open-analytics']).toBeUndefined();
    expect(canExecuteEmergencyCommand(EMERGENCY_ROLE_IDS.readOnlyViewer, byId['open-analytics'])).toBe(false);
    expect(byId['open-settings']).toBeUndefined();
    expect(
      canExecuteEmergencyCommand(EMERGENCY_ROLE_IDS.readOnlyViewer, byId['open-settings']),
    ).toBe(false);
    expect(canExecuteEmergencyCommand(EMERGENCY_ROLE_IDS.emsUser, byId['open-ems'])).toBe(true);
    expect(canExecuteEmergencyCommand(EMERGENCY_ROLE_IDS.emsUser, byId['open-intake'])).toBe(true);
    expect(canExecuteEmergencyCommand(EMERGENCY_ROLE_IDS.emsUser, byId['open-tools'])).toBe(true);
  });
});
