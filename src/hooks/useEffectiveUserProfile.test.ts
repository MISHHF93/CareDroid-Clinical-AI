import { describe, expect, it, vi } from 'vitest';
import { renderHook } from '@testing-library/react';
import { useEffectiveUserProfile } from './useEffectiveUserProfile';

const identityState = vi.hoisted(() => ({
  saasProfile: { role: 'physician' },
  operationalProfile: null as { effectiveProfile?: unknown; accessSummary?: unknown } | null,
}));

vi.mock('../contexts/UserIdentityContext', () => ({
  useUserIdentity: () => identityState,
}));

describe('useEffectiveUserProfile (HEAL-323)', () => {
  it('resolves the precise workspace eyebrow for a hospital role saasProfile.role can hold directly, not the coarser catalog round-trip', () => {
    // Before HEAL-323: saasProfile.role='charge_nurse' (a real
    // EMERGENCY_ROLE_IDS value, dynamic since HEAL-195) got passed through
    // resolveUserProfileFromSaasRole -> normalizeSaasRole, which had no
    // 'charge_nurse' alias and fell through to the 'nurse' saasRole catalog
    // entry -- whose own hardcoded emergencyRoleId is 'triage_nurse', not
    // 'charge_nurse'. accessSummary.emergencyRole then carried that wrong
    // value into resolveUserProfileCopy, producing "Triage lane" instead of
    // "Charge / flow control" for an actual charge nurse.
    identityState.saasProfile = { role: 'charge_nurse' };
    identityState.operationalProfile = null;

    const { result } = renderHook(() => useEffectiveUserProfile());

    expect(result.current.profileCopy.emergencyRoleId).toBe('charge_nurse');
    expect(result.current.profileCopy.workspaceEyebrow).not.toMatch(/triage/i);
  });

  it('still resolves correctly for a plain SaaS-tier role with no matching EMERGENCY_ROLE_IDS entry', () => {
    identityState.saasProfile = { role: 'cardiologist' };
    identityState.operationalProfile = null;

    const { result } = renderHook(() => useEffectiveUserProfile());

    expect(result.current.saasRole).toBe('cardiologist');
    expect(result.current.profileCopy.emergencyRoleId).not.toBe('cardiologist');
  });

  it('prefers a real, API-sourced accessSummary.emergencyRole when the backend already supplied one', () => {
    identityState.saasProfile = { role: 'charge_nurse' };
    identityState.operationalProfile = {
      effectiveProfile: { saasRole: 'nurse' },
      accessSummary: { saasRole: 'nurse', emergencyRole: 'charge_nurse' },
    };

    const { result } = renderHook(() => useEffectiveUserProfile());

    expect(result.current.profileCopy.emergencyRoleId).toBe('charge_nurse');
  });
});
