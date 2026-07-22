import { describe, expect, it } from 'vitest';
import { PERSONA_UX_PROFILES, getPersonaUxProfile } from './personaUxProfiles';
import type { HospitalRole } from '../../lib/users/userTypes';

describe('PERSONA_UX_PROFILES', () => {
  it('keys every entry under its own role, with no mismatches', () => {
    for (const [key, profile] of Object.entries(PERSONA_UX_PROFILES)) {
      expect(profile?.role).toBe(key as HospitalRole);
    }
  });

  it('getPersonaUxProfile returns the profile for a covered role', () => {
    expect(getPersonaUxProfile('triage_nurse')?.cognitivePriority).toBe('time-critical-triage');
    expect(getPersonaUxProfile('hospital_admin')?.informationDensity).toBe('spacious');
  });

  it('getPersonaUxProfile returns undefined for a role with no UI surface yet, rather than fabricating one', () => {
    expect(getPersonaUxProfile('demo_observer')).toBeUndefined();
    expect(getPersonaUxProfile('security_officer')).toBeUndefined();
  });

  it('every covered role has a non-empty label and at least one primary concern', () => {
    for (const profile of Object.values(PERSONA_UX_PROFILES)) {
      expect(profile?.label.length).toBeGreaterThan(0);
      expect(profile?.primaryConcerns.length).toBeGreaterThan(0);
    }
  });
});
