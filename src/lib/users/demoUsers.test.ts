import { describe, it, expect } from 'vitest';
import {
  DEMO_USERS,
  getDemoUserById,
  getDemoUsersByRole,
  getDefaultDemoUser,
  DEFAULT_DEMO_USER_ID,
} from './demoUsers';
import { ALL_CAREDROID_ROLES } from './roleAccess';

describe('DEMO_USERS', () => {
  it('contains at least 16 users', () => {
    expect(DEMO_USERS.length).toBeGreaterThanOrEqual(16);
  });

  it('every user has required profile fields', () => {
    for (const user of DEMO_USERS) {
      expect(user.id).toBeTruthy();
      expect(user.employeeId).toBeTruthy();
      expect(user.fullName).toBeTruthy();
      expect(user.email).toBeTruthy();
      expect(user.role).toBeTruthy();
      expect(user.hospitalSite).toBeTruthy();
      expect(user.department).toBeTruthy();
      expect(user.permissions.length).toBeGreaterThan(0);
    }
  });

  it('every demo user role is a valid CareDroid role', () => {
    for (const user of DEMO_USERS) {
      expect(ALL_CAREDROID_ROLES).toContain(user.role);
    }
  });

  it('no two users share the same id', () => {
    const ids = DEMO_USERS.map((u) => u.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('demo_observer has only read permissions', () => {
    const observer = DEMO_USERS.find((u) => u.role === 'demo_observer');
    expect(observer).toBeDefined();
    for (const perm of observer!.permissions) {
      expect(perm).toMatch(/:read$/);
    }
  });

  it('canReceiveCriticalAlerts is false for demo_observer', () => {
    const observer = DEMO_USERS.find((u) => u.role === 'demo_observer');
    expect(observer?.canReceiveCriticalAlerts).toBe(false);
  });

  it('canReceiveCriticalAlerts is true for triage_nurse', () => {
    const nurse = DEMO_USERS.find((u) => u.role === 'triage_nurse');
    expect(nurse?.canReceiveCriticalAlerts).toBe(true);
  });

  it('canUseAIChief is true for emergency_physician', () => {
    const physician = DEMO_USERS.find((u) => u.role === 'emergency_physician');
    expect(physician?.canUseAIChief).toBe(true);
  });

  // 2026-08-08 ED Copilot AI-runtime convergence: exactly these 8 of the 16
  // demo profiles are Copilot-authorized (AI_REQUEST or AI_REVIEW). Every one
  // of them reaches the same single canonical path -- CopilotPanel.tsx ->
  // POST /api/ai/node/conversational -> ChatService.processMessage() -- there
  // is no per-role branching to any alternate AI implementation, so this list
  // is the full set that benefits from (and must be protected by) the
  // priority-change safety floor ported into handleEdCopilotPriorityChange().
  // Locks in the finding so future permission-table edits can't silently
  // change who gets Copilot access without a test failing here.
  it('exactly 8 demo profiles are Copilot-authorized (canUseAIChief)', () => {
    const authorizedIds = DEMO_USERS.filter((u) => u.canUseAIChief)
      .map((u) => u.id)
      .sort();

    expect(authorizedIds).toEqual(
      [
        'demo-maya-chen', // emergency_physician
        'demo-omar-patel', // charge_nurse
        'demo-sofia-alvarez', // triage_nurse
        'demo-aisha-morgan', // ed_director
        'demo-samuel-okafor', // specialist (cardiologist)
        'demo-elena-rossi', // specialist (neurologist)
        'demo-jordan-miles', // hospital_admin
        'demo-morgan-ellis', // quality_safety_officer
      ].sort(),
    );
  });

  it('the 8 non-Copilot-authorized demo profiles are correctly excluded', () => {
    const unauthorizedRoles = DEMO_USERS.filter((u) => !u.canUseAIChief).map((u) => u.role);

    expect(new Set(unauthorizedRoles)).toEqual(
      new Set([
        'registration_clerk',
        'patient_flow_coordinator',
        'pharmacist',
        'lab_technician',
        'radiology_technician',
        'it_admin',
        'paramedic',
        'demo_observer',
      ]),
    );
  });
});

describe('getDemoUserById', () => {
  it('returns the correct user', () => {
    const user = getDemoUserById('demo-maya-chen');
    expect(user?.fullName).toBe('Dr. Maya Chen');
    expect(user?.role).toBe('emergency_physician');
  });

  it('returns undefined for unknown id', () => {
    expect(getDemoUserById('nonexistent')).toBeUndefined();
  });
});

describe('getDemoUsersByRole', () => {
  it('returns only users with the given role', () => {
    const specialists = getDemoUsersByRole('specialist');
    expect(specialists.length).toBeGreaterThan(0);
    for (const user of specialists) {
      expect(user.role).toBe('specialist');
    }
  });
});

describe('getDefaultDemoUser', () => {
  it('returns a valid user', () => {
    const user = getDefaultDemoUser();
    expect(user.id).toBe(DEFAULT_DEMO_USER_ID);
    expect(user.role).toBeTruthy();
  });
});
