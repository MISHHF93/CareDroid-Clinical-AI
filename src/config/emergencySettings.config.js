import { DEFAULT_CENTRAL_CONTROL_SETTINGS } from './centralControl.config';

export { DEFAULT_CENTRAL_CONTROL_SETTINGS };

export const EMERGENCY_CTAS_PRIORITIES = Object.freeze(['P1', 'P2', 'P3', 'P4', 'P5']);

export const DEFAULT_EMERGENCY_CTAS_TARGETS = Object.freeze({
  P1: 0,
  P2: 15,
  P3: 30,
  P4: 60,
  P5: 120,
});

export const DEFAULT_EMERGENCY_MODULES = Object.freeze([
  Object.freeze({ id: 'emergency-whiteboard', label: 'Whiteboard', enabled: true }),
  Object.freeze({ id: 'emergency-patients', label: 'Patients', enabled: true }),
  Object.freeze({ id: 'ems-pipeline', label: 'EMS', enabled: true }),
  Object.freeze({ id: 'smart-intake', label: 'Intake', enabled: true }),
  Object.freeze({ id: 'queue-intelligence', label: 'Queues', enabled: true }),
  Object.freeze({ id: 'reassessment-engine', label: 'Reassessment', enabled: true }),
  Object.freeze({ id: 'capacity-intelligence', label: 'Capacity', enabled: true }),
  Object.freeze({ id: 'boarding-intelligence', label: 'Boarding', enabled: true }),
  Object.freeze({ id: 'referral-intelligence', label: 'Referrals', enabled: true }),
  Object.freeze({ id: 'ed-copilot', label: 'Copilot', enabled: true }),
]);

export const EMERGENCY_WORKSPACE_OPTIONS = Object.freeze(
  DEFAULT_EMERGENCY_MODULES.map((module) => Object.freeze([module.id, module.label])),
);

export const EMERGENCY_SETTINGS_GROUP_LABELS = Object.freeze({
  identity: 'Identity and Modules',
  ai: 'AI Settings',
  integrations: 'Integration Settings',
  provincial: 'Provincial Health Settings',
  notifications: 'Notification Settings',
  reassessment: 'Reassessment Thresholds',
  ctas: 'CTAS Wait Thresholds',
  capacity: 'Capacity Thresholds',
  ems: 'EMS Thresholds',
  boarding: 'Boarding Thresholds',
  alerts: 'Alert Rules',
  central: 'Central Control Node',
});

export const DEFAULT_EMERGENCY_ALERT_RULES = Object.freeze({
  longWait: Object.freeze({ enabled: true, severity: 'Warning' }),
  lwbsRisk: Object.freeze({ enabled: true, severity: 'Critical' }),
  reassessmentDue: Object.freeze({ enabled: true, severity: 'Warning' }),
  capacity: Object.freeze({ enabled: true, severity: 'Warning' }),
  emsCritical: Object.freeze({ enabled: true, severity: 'Critical' }),
});

export function buildEmergencySettingsPatchFromThresholds(thresholds) {
  return {
    reassessmentThresholds: {
      P1: thresholds.reassessP1Min,
      P2: thresholds.reassessP2Min,
      P3: thresholds.reassessP3Min,
      P4: thresholds.reassessP4Min,
      P5: thresholds.reassessP5Min,
    },
    capacityThresholds: {
      warningPercent: Math.round(thresholds.capacityOrangePct * 100),
      criticalPercent: Math.round(thresholds.capacityRedPct * 100),
    },
    emsThresholds: {
      offloadTargetMinutes: thresholds.emsOffloadTargetMin,
    },
    thresholds: {
      waitWarningMinutes: thresholds.waitTimeWarningMin,
      waitCriticalMinutes: thresholds.waitTimeCtiticalMin,
      capacityWarningPercent: Math.round(thresholds.capacityWarningPct * 100),
      capacityOrangePercent: Math.round(thresholds.capacityOrangePct * 100),
      capacityRedPercent: Math.round(thresholds.capacityRedPct * 100),
      emsOffloadTargetMinutes: thresholds.emsOffloadTargetMin,
      reassessmentIntervals: {
        P1: thresholds.reassessP1Min,
        P2: thresholds.reassessP2Min,
        P3: thresholds.reassessP3Min,
        P4: thresholds.reassessP4Min,
        P5: thresholds.reassessP5Min,
      },
      ctasTargets: DEFAULT_EMERGENCY_CTAS_TARGETS,
    },
  };
}
