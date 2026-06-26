import { describe, expect, it, vi } from 'vitest';
import {
  CENTRAL_CONTROL_NODE_ID,
  DEFAULT_CENTRAL_CONTROL_SETTINGS,
  canOperateCentralControl,
  getCentralControlPolicy,
} from './centralControl.config';
import { EMERGENCY_ACTIONS, EMERGENCY_ROLE_IDS } from './emergencyRolePermissions';

describe('central control config', () => {
  it('defines the central node as the scenario and dashboard authority', () => {
    expect(DEFAULT_CENTRAL_CONTROL_SETTINGS.nodeId).toBe(CENTRAL_CONTROL_NODE_ID);
    expect(DEFAULT_CENTRAL_CONTROL_SETTINGS.dashboardAuthority).toBe('central-node');
    expect(DEFAULT_CENTRAL_CONTROL_SETTINGS.scenarioAuthority).toBe('central-node');
    expect(DEFAULT_CENTRAL_CONTROL_SETTINGS.userInputMode).toBe('central-escalation-input');
    expect(DEFAULT_CENTRAL_CONTROL_SETTINGS.governedRuleGroups).toContain('scenario-selection');
    expect(DEFAULT_CENTRAL_CONTROL_SETTINGS.inputChannels).toContain('patient-intake');
  });

  it('allows only central operators to control scenarios by default', () => {
    expect(canOperateCentralControl(EMERGENCY_ROLE_IDS.admin)).toBe(true);
    expect(canOperateCentralControl(EMERGENCY_ROLE_IDS.chargeNurse)).toBe(true);
    expect(canOperateCentralControl(EMERGENCY_ROLE_IDS.physician)).toBe(false);

    const policy = getCentralControlPolicy({
      role: EMERGENCY_ROLE_IDS.physician,
      can: vi.fn((action) => action === EMERGENCY_ACTIONS.writeNote),
    });
    expect(policy.contributorMode).toBe(true);
    expect(policy.inputProfile).toMatchObject({
      label: 'Physician input',
      escalationPath: 'clinical-review',
    });
    expect(policy.canControlScenario).toBe(false);
    expect(policy.scenarioControlLabel).toBe('Scenario controlled by Central Node');
  });

  it('honors action permission based central control operation', () => {
    const policy = getCentralControlPolicy({
      role: EMERGENCY_ROLE_IDS.physician,
      can: vi.fn((action) => action === EMERGENCY_ACTIONS.manageCapacity),
    });

    expect(policy.operator).toBe(true);
    expect(policy.canControlDashboard).toBe(true);
    expect(policy.canControlScenario).toBe(true);
  });

  it('honors configured local role authority overrides', () => {
    const policy = getCentralControlPolicy({
      role: EMERGENCY_ROLE_IDS.physician,
      settings: {
        scenarioAuthority: 'local-role',
        dashboardAuthority: 'local-role',
      },
    });

    expect(policy.contributorMode).toBe(false);
    expect(policy.canControlDashboard).toBe(true);
    expect(policy.canControlScenario).toBe(true);
  });
});
