import { describe, expect, it } from 'vitest';
import {
  auditAlertInventory,
  classifyOperationalAlert,
  countActionableAlerts,
  isAlertActionable,
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
    // Referral-sent notifications are dropped by shouldRetainDerivedAlert
    // before triage runs, so they never appear in visible or suppressed —
    // they're excluded from the alert stream entirely, not merely suppressed.
    expect(triage.visible.some((alert) => alert.id === 'alert-referral-sent-r1')).toBe(false);
    expect(triage.all.some((alert) => alert.id === 'alert-referral-sent-r1')).toBe(false);

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

  // HEAL-098: Sidebar's Alerts badge and OperationalAlarmDock's chip previously computed
  // "needs attention" from two different, silently-diverging filters (unread-only vs.
  // unacknowledged-plus-medium-tier), so the same alert list showed two different numbers
  // on screen simultaneously. Both now share this one canonical definition.
  describe('countActionableAlerts / isAlertActionable (HEAL-098 canonical badge count)', () => {
    it('counts an untouched critical alert as actionable', () => {
      expect(isAlertActionable(criticalAlert)).toBe(true);
      expect(countActionableAlerts([criticalAlert])).toBe(1);
    });

    it('excludes an alert cleared via the Sidebar Alerts panel (read=true)', () => {
      const readAlert = { ...criticalAlert, read: true, dismissed: false, acknowledged: false };
      expect(isAlertActionable(readAlert)).toBe(false);
    });

    it('excludes an alert cleared via OperationalAlarmDock (acknowledged=true) even though it was never marked read', () => {
      // This is the exact drift that caused 77 (dock) vs 75 (sidebar): the dock's
      // old filter only checked `acknowledged`, and the sidebar's old filter only
      // checked `read`, so clearing an alert through one surface left the other
      // surface's count unchanged.
      const acknowledgedOnly = {
        ...criticalAlert,
        read: false,
        dismissed: false,
        acknowledged: true,
      };
      expect(isAlertActionable(acknowledgedOnly)).toBe(false);
    });

    it('excludes medium-tier alerts from the badge count (matches the sidebar panel, not the dock-only medium inclusion)', () => {
      const mediumAlert = {
        ...criticalAlert,
        id: 'alert-medium-1',
        severity: 'Warning',
        title: 'Wait time approaching limit',
        read: false,
        dismissed: false,
        acknowledged: false,
      };
      expect(classifyOperationalAlert(mediumAlert)).toBe('medium');
      expect(isAlertActionable(mediumAlert)).toBe(false);
    });

    it('excludes dismissed alerts', () => {
      const dismissedAlert = {
        ...criticalAlert,
        read: false,
        dismissed: true,
        acknowledged: false,
      };
      expect(isAlertActionable(dismissedAlert)).toBe(false);
    });
  });
});
