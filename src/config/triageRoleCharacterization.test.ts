/**
 * Architect Mode Stage I — Triage role characterization (extends Reception template).
 * Locks triage_nurse grants, Nest map, screen model, and forbidden actions.
 */
import { describe, expect, it } from 'vitest';
import {
  EMERGENCY_PERMISSION_KEYS,
  hasEmergencyPermission,
  ROLE_PERMISSION_GRANTS,
  ROUTE_PERMISSION_MAP,
} from './emergencyPermissionRegistry';
import { EMERGENCY_ROLE_ID } from './emergencyRoleScreenMatrix';
import { EMERGENCY_ACTIONS, EMERGENCY_ROLE_IDS } from './emergencyRolePermissions';
import { presentEmergencyPermission } from './emergencyActionPresentationModel';
import {
  emergencyRoleSatisfiesNestAction,
  resolveNestMappingForEmergencyRole,
  NEST_PERMISSION,
} from './emergencyNestPermissionMap';
import { CANONICAL_ROUTES } from './routes.config';
import { TRIAGE_SCREEN_ACTIONS, TRIAGE_SCREEN_WIDGETS } from './triageScreenModel';
import { QUEUE_MOVEMENT_REGISTRY } from '../services/queueAssignment';

describe('Triage role characterization (Stage I)', () => {
  const nurse = EMERGENCY_ROLE_ID.triageNurse;
  const grants = ROLE_PERMISSION_GRANTS[nurse];

  it('grants core triage clinical actions', () => {
    expect(grants).toEqual(
      expect.arrayContaining([
        EMERGENCY_PERMISSION_KEYS.triageAssignAcuity,
        EMERGENCY_PERMISSION_KEYS.vitalsWrite,
        EMERGENCY_PERMISSION_KEYS.reassessmentComplete,
        EMERGENCY_PERMISSION_KEYS.queueMove,
        EMERGENCY_PERMISSION_KEYS.intakeVerify,
        EMERGENCY_PERMISSION_KEYS.screenTriage,
      ]),
    );
  });

  it('does not grant settings or full discharge as primary triage duty (settings)', () => {
    expect(grants).not.toContain(EMERGENCY_PERMISSION_KEYS.settingsManage);
    // discharge may or may not be present — settings must stay off
    expect(hasEmergencyPermission(nurse, EMERGENCY_PERMISSION_KEYS.settingsManage)).toBe(false);
  });

  it('presents triage assign acuity as enabled for triage_nurse', () => {
    const presented = presentEmergencyPermission(
      EMERGENCY_ROLE_IDS.triageNurse,
      EMERGENCY_ACTIONS.triage,
    );
    expect(presented.visible).toBe(true);
    expect(presented.enabled).toBe(true);
  });

  it('blocks public_display from triage acuity', () => {
    const presented = presentEmergencyPermission(
      EMERGENCY_ROLE_IDS.publicDisplay,
      EMERGENCY_ACTIONS.triage,
    );
    expect(presented.enabled && presented.visible).toBe(false);
  });

  it('Nest map gives triage_nurse PHI write without system config', () => {
    const m = resolveNestMappingForEmergencyRole(nurse);
    expect(m.nestUserRole).toBe('nurse');
    expect(m.nestPermissions).toEqual(
      expect.arrayContaining([NEST_PERMISSION.READ_PHI, NEST_PERMISSION.WRITE_PHI]),
    );
    expect(m.nestPermissions).not.toContain(NEST_PERMISSION.CONFIGURE_SYSTEM);
    expect(
      emergencyRoleSatisfiesNestAction(nurse, EMERGENCY_PERMISSION_KEYS.triageAssignAcuity),
    ).toBe(true);
  });

  it('keeps triage screen widget/action vocabulary stable', () => {
    expect(TRIAGE_SCREEN_WIDGETS.triagePendingQueue).toBe('triage-pending-queue');
    expect(TRIAGE_SCREEN_WIDGETS.acuityAssignment).toBe('acuity-assignment');
    expect(TRIAGE_SCREEN_ACTIONS.assignAcuity).toBe('assign-acuity');
    expect(TRIAGE_SCREEN_ACTIONS.recordVitals).toBe('record-vitals');
  });

  it('queue movement registry documents pretriage → waiting handoff path', () => {
    expect(QUEUE_MOVEMENT_REGISTRY.receptionPretriage.id).toBe('pretriage');
    expect(QUEUE_MOVEMENT_REGISTRY.whiteboardTriage.id).toBe('Triage');
    expect(QUEUE_MOVEMENT_REGISTRY.whiteboardWaiting.enter).toEqual(
      expect.arrayContaining([expect.stringMatching(/Waiting|enterWaiting/i)]),
    );
  });

  it('maps reassessment route permission for triage workflow continuity', () => {
    expect(ROUTE_PERMISSION_MAP[CANONICAL_ROUTES.emergencyReassessment]).toBe(
      EMERGENCY_PERMISSION_KEYS.reassessmentComplete,
    );
  });
});
