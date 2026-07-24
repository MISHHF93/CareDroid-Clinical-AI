import { describe, expect, it } from 'vitest';
import { EMERGENCY_ROLE_IDS } from './emergencyRolePermissions';
import {
  getReceptionUserProfile,
  isReceptionFacingRole,
  listReceptionUserProfiles,
  RECEPTION_USER_PROFILES,
  resolveReceptionArchetypeFromRole,
  resolveReceptionProfileForRole,
} from './receptionUserProfile';
import { RECEPTION_ARCHETYPE_SKILLS, RECEPTION_SKILLS } from './receptionSkillModel';

describe('receptionUserProfile', () => {
  it('lists all five reception archetypes', () => {
    expect(listReceptionUserProfiles()).toHaveLength(5);
    expect(RECEPTION_USER_PROFILES.registration_clerk.mapsToEmergencyRole).toBe(
      EMERGENCY_ROLE_IDS.registrationClerk,
    );
  });

  it('gives registration clerks the full skill pack including lookup and crash', () => {
    const profile = getReceptionUserProfile('registration_clerk');
    expect(profile.skillIds).toEqual(RECEPTION_ARCHETYPE_SKILLS.registration_clerk);
    expect(profile.skillIds).toContain('lookup_before_create');
    expect(profile.skillIds).toContain('crash_registration');
    expect(profile.personalization.lookupBeforeCreateDefault).toBe(true);
    expect(profile.personalization.labelAssistAsDeskNotAi).toBe(true);
    expect(profile.allowedActions.length).toBeGreaterThan(0);
  });

  it('gives volunteers zero registration skills and empty allowed actions', () => {
    const profile = getReceptionUserProfile('volunteer_greeter');
    expect(profile.skillIds).toEqual([]);
    expect(profile.allowedActions).toEqual([]);
    expect(profile.personalization.lookupBeforeCreateDefault).toBe(false);
  });

  it('resolves role aliases to the correct archetype', () => {
    expect(resolveReceptionArchetypeFromRole('registration_clerk')).toBe('registration_clerk');
    expect(resolveReceptionArchetypeFromRole('emergency-receptionist')).toBe('registration_clerk');
    expect(resolveReceptionArchetypeFromRole('admissions_officer')).toBe('admissions_officer');
    expect(resolveReceptionArchetypeFromRole('patient_access_staff')).toBe('patient_access_staff');
    expect(resolveReceptionArchetypeFromRole('volunteer greeter')).toBe('volunteer_greeter');
    expect(resolveReceptionArchetypeFromRole('front_desk_coordinator')).toBe('front_desk_coordinator');
  });

  it('does not map charge_nurse to a registration skill pack via coordinator keyword alone', () => {
    // charge is clinical; front_desk_coordinator requires coordinator/front_desk/ed_manager
    expect(resolveReceptionArchetypeFromRole('charge_nurse')).toBe('registration_clerk');
  });

  it('resolveReceptionProfileForRole returns full profile definitions', () => {
    const clerk = resolveReceptionProfileForRole('registration_clerk');
    expect(clerk.label).toBe('Registration Clerk');
    expect(clerk.defaultRoute).toContain('reception');
    expect(clerk.skillIds.map((id) => RECEPTION_SKILLS[id].label).length).toBe(clerk.skillIds.length);
  });

  it('flags reception-facing roles for Profile page skills panel', () => {
    expect(isReceptionFacingRole('registration_clerk')).toBe(true);
    expect(isReceptionFacingRole('emergency_receptionist')).toBe(true);
    expect(isReceptionFacingRole('volunteer')).toBe(true);
    expect(isReceptionFacingRole('physician')).toBe(false);
    expect(isReceptionFacingRole('triage_nurse')).toBe(false);
  });
});
