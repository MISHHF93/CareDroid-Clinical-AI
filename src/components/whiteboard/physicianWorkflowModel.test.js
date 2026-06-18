import { describe, expect, it } from 'vitest';
import { EMERGENCY_ROLE_IDS } from '../../config/emergencyRolePermissions';
import {
  PHYSICIAN_NAV_EXCLUDED_IDS,
  PHYSICIAN_WORKFLOW_LAUNCHERS,
  physicianCardActionIds,
  resolvePatientCardWorkflowProfile,
} from './physicianWorkflowModel';

describe('physicianWorkflowModel', () => {
  it('catalogs existing physician workflow launchers', () => {
    const ids = PHYSICIAN_WORKFLOW_LAUNCHERS.map((entry) => entry.id);
    expect(ids).toEqual(['review', 'advance', 'reassess', 'refer', 'discharge', 'copilot']);
  });

  it('resolves physician card workflow profile', () => {
    expect(
      resolvePatientCardWorkflowProfile({
        roleId: EMERGENCY_ROLE_IDS.physician,
        canMutateWhiteboard: false,
      }),
    ).toBe('physician');
    expect(
      resolvePatientCardWorkflowProfile({
        roleId: EMERGENCY_ROLE_IDS.chargeNurse,
        canMutateWhiteboard: true,
      }),
    ).toBe('charge');
    expect(
      resolvePatientCardWorkflowProfile({
        roleId: EMERGENCY_ROLE_IDS.physician,
        displayMode: true,
      }),
    ).toBe('none');
  });

  it('lists physician card actions without boarding', () => {
    expect(physicianCardActionIds('physician')).not.toContain('board');
    expect(PHYSICIAN_NAV_EXCLUDED_IDS).toContain('referrals');
  });
});
