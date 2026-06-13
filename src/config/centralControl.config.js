import {
  EMERGENCY_ACTIONS,
  EMERGENCY_ROLE_IDS,
  normalizeEmergencyRole,
} from './emergencyRolePermissions';

export const CENTRAL_CONTROL_NODE_ID = 'ed-central-node';

export const DEFAULT_CENTRAL_CONTROL_SETTINGS = Object.freeze({
  enabled: true,
  nodeId: CENTRAL_CONTROL_NODE_ID,
  label: 'Central Node',
  dashboardAuthority: 'central-node',
  scenarioAuthority: 'central-node',
  userInputMode: 'central-escalation-input',
  dashboardDecisionIntervalSeconds: 30,
  rulesReviewIntervalMinutes: 5,
  governedRuleGroups: Object.freeze([
    'scenario-selection',
    'capacity-thresholds',
    'reassessment-intervals',
    'ems-offload-targets',
    'boarding-escalation',
    'alert-severity',
  ]),
  inputChannels: Object.freeze([
    'patient-intake',
    'ems-update',
    'reassessment-note',
    'referral-request',
    'staff-status',
    'manual-observation',
  ]),
});

export const CENTRAL_CONTROL_OPERATOR_ROLES = Object.freeze([
  EMERGENCY_ROLE_IDS.admin,
  EMERGENCY_ROLE_IDS.edManager,
  EMERGENCY_ROLE_IDS.chargeNurse,
]);

export const CENTRAL_INPUT_ROLE_PROFILES = Object.freeze({
  [EMERGENCY_ROLE_IDS.admin]: Object.freeze({
    label: 'Central administrator input',
    escalationPath: 'central-command-review',
  }),
  [EMERGENCY_ROLE_IDS.edManager]: Object.freeze({
    label: 'Operations input',
    escalationPath: 'capacity-and-flow-review',
  }),
  [EMERGENCY_ROLE_IDS.chargeNurse]: Object.freeze({
    label: 'Charge nurse input',
    escalationPath: 'department-flow-review',
  }),
  [EMERGENCY_ROLE_IDS.triageNurse]: Object.freeze({
    label: 'Triage input',
    escalationPath: 'triage-review',
  }),
  [EMERGENCY_ROLE_IDS.physician]: Object.freeze({
    label: 'Physician input',
    escalationPath: 'clinical-review',
  }),
  [EMERGENCY_ROLE_IDS.registrationClerk]: Object.freeze({
    label: 'Registration input',
    escalationPath: 'identity-and-triage-review',
  }),
  [EMERGENCY_ROLE_IDS.emsUser]: Object.freeze({
    label: 'EMS input',
    escalationPath: 'ems-handoff-review',
  }),
  [EMERGENCY_ROLE_IDS.readOnlyViewer]: Object.freeze({
    label: 'Viewer input',
    escalationPath: 'central-review',
  }),
});

export function canOperateCentralControl(role, can = () => false) {
  const normalizedRole = normalizeEmergencyRole(role);
  return (
    CENTRAL_CONTROL_OPERATOR_ROLES.includes(normalizedRole) ||
    can(EMERGENCY_ACTIONS.manageSettings) ||
    can(EMERGENCY_ACTIONS.manageCapacity)
  );
}

export function getCentralInputProfile(role) {
  const normalizedRole = normalizeEmergencyRole(role);
  return (
    CENTRAL_INPUT_ROLE_PROFILES[normalizedRole] ||
    Object.freeze({
      label: 'Department input',
      escalationPath: 'central-review',
    })
  );
}

/**
 * @param {{
 *   role?: string;
 *   can?: (action: string) => boolean;
 *   settings?: Record<string, unknown>;
 * }} input
 */
export function getCentralControlPolicy({ role, can = () => false, settings = {} } = {}) {
  const mergedSettings = {
    ...DEFAULT_CENTRAL_CONTROL_SETTINGS,
    ...(settings || {}),
  };
  const operator = canOperateCentralControl(role, can);
  const centralDashboardLocked =
    mergedSettings.enabled && mergedSettings.dashboardAuthority === 'central-node';
  const centralScenarioLocked =
    mergedSettings.enabled && mergedSettings.scenarioAuthority === 'central-node';

  return Object.freeze({
    ...mergedSettings,
    operator,
    inputProfile: getCentralInputProfile(role),
    canControlScenario: operator || !centralScenarioLocked,
    canControlDashboard: operator || !centralDashboardLocked,
    contributorMode: centralDashboardLocked && !operator,
    contributorLabel: 'Input-only contributor',
    operatorLabel: 'Central controller',
    statusLabel: mergedSettings.enabled ? 'Central control active' : 'Central control standby',
    scenarioControlLabel:
      operator || !centralScenarioLocked
        ? 'Scenario control enabled'
        : 'Scenario controlled by Central Node',
    dashboardControlLabel:
      operator || !centralDashboardLocked
        ? 'Dashboard control enabled'
        : 'Dashboard controlled by Central Node',
  });
}
