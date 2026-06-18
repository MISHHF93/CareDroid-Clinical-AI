import { describe, expect, it } from 'vitest';
import {
  auditAlertInventory,
  classifyOperationalAlert,
  shouldRetainDerivedAlert,
  shouldToastOperationalAlert,
  triageOperationalAlerts,
} from './alertClassificationModel';

const criticalAlert = {
  id: 'alert-ems-critical-1',
  severity: 'Critical',
  type: 'EMS',
  title: 'Critical EMS inbound',
  message: 'Unit 12 inbound',
  createdAt: new Date().toISOString(),
};

describe('alertClassificationModel', () => {
  it('classifies canonical severities into four tiers', () => {
    expect(classifyOperationalAlert(criticalAlert)).toBe('critical');
    expect(
      classifyOperationalAlert({
        ...criticalAlert,
        id: 'alert-referral-unacknowledged-1',
        severity: 'Warning',
        title: 'Referral unacknowledged',
      }),
    ).toBe('high');
    expect(
      classifyOperationalAlert({
        ...criticalAlert,
        severity: 'Warning',
        title: 'Wait time approaching limit',
      }),
    ).toBe('medium');
    expect(
      classifyOperationalAlert({
        ...criticalAlert,
        severity: 'Info',
        title: 'Referral sent to Cardiology',
        id: 'alert-referral-sent-1',
      }),
    ).toBe('informational');
  });

  it('suppresses noisy derived alerts while keeping critical paths', () => {
    expect(
      shouldRetainDerivedAlert({
        id: 'alert-capacity-yellow',
        severity: 'Info',
        type: 'Capacity',
        title: 'Capacity degradation detected',
      }),
    ).toBe(false);
    expect(
      shouldRetainDerivedAlert({
        id: 'alert-reassessment-reminder-upcoming-r1',
        severity: 'Warning',
        type: 'Reassessment',
        title: 'Recheck due in 2min - Jane Doe',
      }),
    ).toBe(false);
    expect(shouldRetainDerivedAlert(criticalAlert)).toBe(true);
  });

  it('toasts only critical and high tiers', () => {
    expect(shouldToastOperationalAlert(criticalAlert)).toBe(true);
    expect(
      shouldToastOperationalAlert({
        ...criticalAlert,
        severity: 'Warning',
        title: 'Wait time approaching limit',
      }),
    ).toBe(false);
  });

  it('dedupes patient reassessment noise and audits inventory', () => {
    const triage = triageOperationalAlerts([
      criticalAlert,
      {
        id: 'alert-reassessment-deterioration-p1',
        severity: 'Critical',
        type: 'Reassessment',
        patientId: 'p1',
        title: 'Deterioration risk flagged',
        message: 'Review patient',
        createdAt: new Date().toISOString(),
      },
      {
        id: 'alert-reassessment-reminder-overdue-r1',
        severity: 'Critical',
        type: 'Reassessment',
        patientId: 'p1',
        title: 'Recheck overdue - Jane Doe',
        message: 'Due now',
        createdAt: new Date().toISOString(),
      },
      {
        id: 'alert-referral-sent-r1',
        severity: 'Info',
        type: 'Referral',
        title: 'Referral sent to Cardiology',
        message: 'Routine',
        createdAt: new Date().toISOString(),
      },
    ]);

    expect(triage.visible.length).toBeLessThan(4);
    expect(triage.counts.critical).toBeGreaterThan(0);
    expect(triage.suppressed.some((alert) => alert.id === 'alert-referral-sent-r1')).toBe(true);

    const audit = auditAlertInventory([
      criticalAlert,
      {
        id: 'alert-capacity-yellow',
        severity: 'Info',
        type: 'Capacity',
        title: 'Capacity degradation detected',
        message: 'Yellow band',
        createdAt: new Date().toISOString(),
      },
      {
        id: 'alert-referral-sent-r2',
        severity: 'Info',
        type: 'Referral',
        title: 'Referral sent to Neurology',
        message: 'Awaiting acknowledgement',
        createdAt: new Date().toISOString(),
      },
    ]);
    expect(audit.retainedCount).toBeLessThan(audit.inputCount);
  });
});
