/**
 * Cycle 64 — unit-level permission contract for EMS handoff (D3 companion).
 * Browser e2e covers success/outage/copilot; this locks role matrix expectations.
 */
import { describe, expect, it } from 'vitest';
import { presentEmergencyPermission } from './emergencyActionPresentationModel';
import { EMERGENCY_ACTIONS, EMERGENCY_ROLE_IDS } from './emergencyRolePermissions';

const ACTION = EMERGENCY_ACTIONS.completeEmsHandoff;

describe('EMS handoff permission contract', () => {
  it('allows charge_nurse to complete EMS handoff', () => {
    const presented = presentEmergencyPermission(EMERGENCY_ROLE_IDS.chargeNurse, ACTION);
    expect(presented.visible).toBe(true);
    expect(presented.enabled).toBe(true);
  });

  it('does not enable physician for completeEmsHandoff', () => {
    const presented = presentEmergencyPermission(EMERGENCY_ROLE_IDS.physician, ACTION);
    expect(presented.enabled && presented.visible).toBe(false);
  });

  it('does not enable public_display for completeEmsHandoff', () => {
    const presented = presentEmergencyPermission(EMERGENCY_ROLE_IDS.publicDisplay, ACTION);
    expect(presented.enabled && presented.visible).toBe(false);
  });
});
