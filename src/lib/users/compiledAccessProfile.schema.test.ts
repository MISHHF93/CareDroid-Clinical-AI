import { describe, expect, it } from 'vitest';
import {
  isUsableCompiledAccessProfile,
  parseCompiledAccessProfile,
} from './compiledAccessProfile.schema';
import { getVisibleNavigation } from '../../config/unified-navigation.config';
import { compileCareDroidAccessProfile } from './canonicalAccess';

describe('parseCompiledAccessProfile', () => {
  it('rejects the exact shape that crashed the AppShell (user present, role missing)', () => {
    // Reproduced live on 2026-08-31: a stored profile of this shape passed the
    // old `if (attached?.user)` gate, then getVisibleNavigation dereferenced
    // profile.role.hospitalRole and threw from inside AppShellFrame.
    const stored = { user: { role: 'physician' } };

    const result = parseCompiledAccessProfile(stored);

    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.reason).toMatch(/role/);
  });

  it('rejects a profile whose role carries neither hospitalRole nor emergencyRoleId', () => {
    const result = parseCompiledAccessProfile({ user: {}, role: { saasRole: 'clinician' } });

    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.reason).toMatch(/hospitalRole|emergencyRoleId/);
  });

  it('accepts a profile carrying either role identifier, and passes extra fields through', () => {
    const access = { navigationAccess: [], routeAccess: [], permissions: [] };
    expect(
      isUsableCompiledAccessProfile({ user: {}, role: { hospitalRole: 'charge_nurse' }, ...access }),
    ).toBe(true);
    expect(
      isUsableCompiledAccessProfile({ user: {}, role: { emergencyRoleId: 'triage_nurse' }, ...access }),
    ).toBe(true);

    // Extra members must survive -- this schema validates the load-bearing
    // fields, it is not a mirror of the full compiled-profile type.
    const rich = {
      user: { id: 'u1' },
      role: { hospitalRole: 'physician', emergencyRoleId: 'physician' },
      permissions: ['READ_PHI'],
      navigationAccess: [],
      routeAccess: [],
      adminAccess: false,
    };
    const parsed = parseCompiledAccessProfile(rich);
    expect(parsed.ok).toBe(true);
    if (parsed.ok) expect(parsed.profile).toBe(rich);
  });

  it('accepts every profile compileCareDroidAccessProfile actually produces', () => {
    // The risk of tightening a gate is rejecting legitimate sessions. This
    // pins the schema to the real producer, so if compileCareDroidAccessProfile
    // ever stops emitting a field the schema requires, this fails here rather
    // than silently discarding real profiles and recompiling them at runtime.
    for (const role of [
      'physician',
      'charge_nurse',
      'triage_nurse',
      'registration_clerk',
      'ed_manager',
      'admin',
      'read_only_viewer',
      'public_display',
    ]) {
      const compiled = compileCareDroidAccessProfile({ role } as never);
      const parsed = parseCompiledAccessProfile(compiled);
      expect(parsed.ok ? 'ok' : `${role}: ${parsed.reason}`).toBe('ok');
    }
  });

  it('rejects non-objects instead of throwing', () => {
    for (const value of [null, undefined, 'physician', 42, []]) {
      expect(parseCompiledAccessProfile(value).ok).toBe(false);
    }
  });
});

describe('getVisibleNavigation resilience', () => {
  it('degrades to role-based navigation instead of throwing on a malformed compiled profile', () => {
    // Even if a malformed profile reaches this exported function from one of
    // its other call sites, navigation must not take the shell down with it.
    expect(() =>
      getVisibleNavigation('physician', { compiledProfile: { user: {} } as never }),
    ).not.toThrow();

    const items = getVisibleNavigation('physician', { compiledProfile: { user: {} } as never });
    expect(Array.isArray(items)).toBe(true);
    expect(items.length).toBeGreaterThan(0);
  });

  it('still uses the compiled profile when it is well formed', () => {
    expect(() =>
      getVisibleNavigation('physician', {
        compiledProfile: {
          user: {},
          role: { hospitalRole: 'physician', emergencyRoleId: 'physician' },
          navigationAccess: [],
          routeAccess: [],
          permissions: [],
        } as never,
      }),
    ).not.toThrow();
  });
});
