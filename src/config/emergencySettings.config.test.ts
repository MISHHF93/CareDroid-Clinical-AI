import { describe, expect, it } from 'vitest';
import {
  DEFAULT_CENTRAL_CONTROL_SETTINGS,
  DEFAULT_EMERGENCY_ALERT_RULES,
  DEFAULT_EMERGENCY_CTAS_TARGETS,
  DEFAULT_EMERGENCY_MODULES,
  EMERGENCY_CTAS_PRIORITIES,
  EMERGENCY_SETTINGS_GROUP_LABELS,
  EMERGENCY_WORKSPACE_OPTIONS,
  buildEmergencySettingsPatchFromThresholds,
} from './emergencySettings.config';

describe('CareDroid settings config', () => {
  it('unifies settings form options with default module config', () => {
    expect(DEFAULT_EMERGENCY_MODULES.map((module) => module.label)).toEqual([
      'Whiteboard',
      'Patients',
      'EMS',
      'Intake',
      'Queues',
      'Reassessment',
      'Capacity',
      'Boarding',
      'Referrals',
      'Copilot',
    ]);
    expect(EMERGENCY_WORKSPACE_OPTIONS).toEqual(
      DEFAULT_EMERGENCY_MODULES.map((module) => [module.id, module.label]),
    );
    expect(EMERGENCY_SETTINGS_GROUP_LABELS.central).toBe('Central Control Node');
    expect(DEFAULT_CENTRAL_CONTROL_SETTINGS.userInputMode).toBe('central-escalation-input');
  });

  it('keeps alert rules and CTAS priorities in one shared settings source', () => {
    expect(EMERGENCY_CTAS_PRIORITIES).toEqual(['P1', 'P2', 'P3', 'P4', 'P5']);
    expect(DEFAULT_EMERGENCY_CTAS_TARGETS).toEqual({
      P1: 0,
      P2: 15,
      P3: 30,
      P4: 60,
      P5: 120,
    });
    expect(DEFAULT_EMERGENCY_ALERT_RULES).toMatchObject({
      longWait: { enabled: true, severity: 'Warning' },
      lwbsRisk: { enabled: true, severity: 'Critical' },
    });
  });

  it('builds the canonical settings patch from shell thresholds', () => {
    expect(
      buildEmergencySettingsPatchFromThresholds({
        waitTimeWarningMin: 40,
        waitTimeCtiticalMin: 55,
        capacityWarningPct: 0.7,
        capacityOrangePct: 0.8,
        capacityRedPct: 0.92,
        emsOffloadTargetMin: 12,
        reassessP1Min: 5,
        reassessP2Min: 15,
        reassessP3Min: 30,
        reassessP4Min: 60,
        reassessP5Min: 120,
      }),
    ).toMatchObject({
      capacityThresholds: { warningPercent: 80, criticalPercent: 92 },
      emsThresholds: { offloadTargetMinutes: 12 },
      thresholds: {
        waitWarningMinutes: 40,
        waitCriticalMinutes: 55,
        capacityWarningPercent: 70,
        ctasTargets: DEFAULT_EMERGENCY_CTAS_TARGETS,
      },
    });
  });
});
