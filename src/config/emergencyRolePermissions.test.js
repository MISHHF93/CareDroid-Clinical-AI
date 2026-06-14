import { describe, expect, it } from 'vitest';
import { EMERGENCY_OS_ROUTE_COMMANDS, EMERGENCY_OS_TOOL_COMMANDS } from './commandPalette.config';
import { APP_SHELL_NAV_ITEMS } from './navigation.config';
import { CANONICAL_ROUTES } from './routes.config';
import {
  EMERGENCY_ACTIONS,
  EMERGENCY_ROLE_IDS,
  canAccessEmergencyRoute,
  canExecuteEmergencyCommand,
  getEmergencyDemoRoles,
  getEmergencyRoleDefinition,
  getNearestEmergencyRoute,
  getVisibleEmergencyNavigationItems,
  hasEmergencyActionPermission,
  isEmergencyReadOnlyRole,
  normalizeEmergencyRole,
} from './emergencyRolePermissions';

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
    expect(clerkNavIds).toEqual(['whiteboard', 'patients', 'intake', 'queues', 'tools']);
    expect(clerkNavIds).not.toContain('settings');

    const emsNavIds = getVisibleEmergencyNavigationItems(
      EMERGENCY_ROLE_IDS.emsUser,
      APP_SHELL_NAV_ITEMS,
    ).map((item) => item.id);
    expect(emsNavIds).toEqual(['whiteboard', 'patients', 'ems', 'capacity', 'tools']);
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
    ).toBe(false);
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
    expect(canExecuteEmergencyCommand(EMERGENCY_ROLE_IDS.emsUser, byId['open-intake'])).toBe(false);
    expect(canExecuteEmergencyCommand(EMERGENCY_ROLE_IDS.emsUser, byId['open-tools'])).toBe(true);
  });

  it('keeps role route fixtures aligned across sidebar, direct access, and commands', () => {
    for (const { id: role } of getEmergencyDemoRoles()) {
      const definition = getEmergencyRoleDefinition(role);
      const visibleNav = getVisibleEmergencyNavigationItems(role, APP_SHELL_NAV_ITEMS);

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
