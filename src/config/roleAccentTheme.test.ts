import { describe, expect, it } from 'vitest';
import { EMERGENCY_ROLE_IDS } from './emergencyRolePermissions';
import { ROLE_ACCENT_GROUP_META, ROLE_ACCENT_GROUPS, resolveRoleAccentKey } from './roleAccentTheme';

describe('roleAccentTheme', () => {
  it('maps every EMERGENCY_ROLE_IDS value to a defined accent group', () => {
    for (const roleId of Object.values(EMERGENCY_ROLE_IDS)) {
      expect(ROLE_ACCENT_GROUPS[roleId]).toBeDefined();
      expect(ROLE_ACCENT_GROUP_META[ROLE_ACCENT_GROUPS[roleId]]).toBeDefined();
    }
  });

  it('resolves the roles named in the brief to their intended group', () => {
    expect(resolveRoleAccentKey(EMERGENCY_ROLE_IDS.registrationClerk)).toBe('reception');
    expect(resolveRoleAccentKey(EMERGENCY_ROLE_IDS.triageNurse)).toBe('triage');
    expect(resolveRoleAccentKey(EMERGENCY_ROLE_IDS.chargeNurse)).toBe('nurse');
    expect(resolveRoleAccentKey(EMERGENCY_ROLE_IDS.physician)).toBe('physician');
    expect(resolveRoleAccentKey(EMERGENCY_ROLE_IDS.emsUser)).toBe('ems');
    expect(resolveRoleAccentKey(EMERGENCY_ROLE_IDS.dispatcher)).toBe('ems');
    expect(resolveRoleAccentKey(EMERGENCY_ROLE_IDS.emsCoordinator)).toBe('ems');
    expect(resolveRoleAccentKey(EMERGENCY_ROLE_IDS.admin)).toBe('admin');
    expect(resolveRoleAccentKey(EMERGENCY_ROLE_IDS.itAdmin)).toBe('admin');
    expect(resolveRoleAccentKey(EMERGENCY_ROLE_IDS.edManager)).toBe('operations');
  });

  it('falls back to "default" for unassigned or unknown roles', () => {
    expect(resolveRoleAccentKey(EMERGENCY_ROLE_IDS.readOnlyViewer)).toBe('default');
    expect(resolveRoleAccentKey(EMERGENCY_ROLE_IDS.publicDisplay)).toBe('default');
    expect(resolveRoleAccentKey('not_a_real_role')).toBe('default');
    expect(resolveRoleAccentKey(null)).toBe('default');
    expect(resolveRoleAccentKey(undefined)).toBe('default');
  });

  it('gives every named group a distinct accent hex, except two deliberate overlaps', () => {
    const hexes = Object.values(ROLE_ACCENT_GROUP_META).map((meta) => meta.accent);
    // Deliberate overlaps: 'default' === 'reception' (Reception uses the
    // platform-standard accent, not a separate skin — see role-accent-theme.css's
    // own header comment); 'operations' === AI Purple (the CCDS brief names both
    // "Operations" and "AI" as the same Purple, with no second hex given).
    const distinctGroupHexes = Object.values(ROLE_ACCENT_GROUP_META)
      .filter((meta) => meta.id !== 'operations' && meta.id !== 'default')
      .map((meta) => meta.accent);
    expect(new Set(distinctGroupHexes).size).toBe(distinctGroupHexes.length);
    expect(hexes).not.toContain('#b54708'); // --semantic-attention/--semantic-warning
    expect(hexes).not.toContain('#027a48'); // --semantic-healthy
    expect(ROLE_ACCENT_GROUP_META.default.accent).toBe(ROLE_ACCENT_GROUP_META.reception.accent);
    expect(ROLE_ACCENT_GROUP_META.operations.accent).toBe('#5925dc');
  });
});
