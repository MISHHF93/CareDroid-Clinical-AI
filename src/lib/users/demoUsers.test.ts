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
