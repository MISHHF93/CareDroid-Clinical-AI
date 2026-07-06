import { Injectable, Logger, Optional } from '@nestjs/common';
import { CollaborationHubService } from '../collaboration-hub/collaboration-hub.service';

type ClinicalAlertSeverity = 'critical' | 'high' | 'moderate' | 'low';
type ClinicalAlertStatus = 'unacknowledged' | 'acknowledged' | 'dismissed';

type ClinicalAlert = {
  id: string;
  timestamp: string;
  severity: ClinicalAlertSeverity;
  title: string;
  description: string;
  source: string;
  status: ClinicalAlertStatus;
  findings: string[];
  recommendations: string[];
  patientContext?: string;
  acknowledgedAt?: string;
  acknowledgedBy?: string;
  dismissedAt?: string;
  dismissedBy?: string;
  dismissReason?: string;
};

type AlertActionOverride = Partial<
  Pick<
    ClinicalAlert,
    'status' | 'acknowledgedAt' | 'acknowledgedBy' | 'dismissedAt' | 'dismissedBy' | 'dismissReason'
  >
>;

const BASE_ALERTS: ClinicalAlert[] = [
  {
    id: 'alert-1',
    timestamp: new Date(Date.now() - 60 * 60 * 1000).toISOString(),
    severity: 'critical',
    title: 'Critical SOFA Score',
    description: 'Patient shows signs of multiple organ dysfunction.',
    source: 'SOFA Calculator',
    status: 'unacknowledged',
    findings: ['SOFA Score: 15/24', 'Mortality risk: High'],
    recommendations: ['Review source values', 'Escalate per local sepsis and ICU protocols'],
    patientContext: 'Demo ICU census',
  },
  {
    id: 'alert-2',
    timestamp: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
    severity: 'high',
    title: 'Abnormal Lab Values',
    description: 'Three critical laboratory values detected.',
    source: 'Lab Interpreter',
    status: 'acknowledged',
    findings: ['K+: 6.8 mEq/L', 'pH: 7.25', 'HCO3-: 18 mEq/L'],
    recommendations: ['Confirm sample timing', 'Review local critical lab pathway'],
    patientContext: 'Demo emergency board',
  },
  {
    id: 'alert-3',
    timestamp: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
    severity: 'moderate',
    title: 'Kidney Dysfunction Alert',
    description: 'GFR indicates moderate to severe kidney disease.',
    source: 'eGFR Calculator',
    status: 'acknowledged',
    findings: ['eGFR: 28 mL/min/1.73m2', 'CKD Stage: 3b'],
    recommendations: [
      'Review trend and chronicity',
      'Use clinician judgment before any medication changes',
    ],
    patientContext: 'Demo outpatient review',
  },
];

function cloneAlerts(overrides: Map<string, AlertActionOverride>) {
  return BASE_ALERTS.map((alert) => ({
    ...alert,
    ...(overrides.get(alert.id) || {}),
  }));
}

function summarize(alerts: ClinicalAlert[]) {
  const counts = alerts.reduce(
    (acc, alert) => {
      acc.total += 1;
      acc.byStatus[alert.status] = (acc.byStatus[alert.status] || 0) + 1;
      acc.bySeverity[alert.severity] = (acc.bySeverity[alert.severity] || 0) + 1;
      return acc;
    },
    {
      total: 0,
      byStatus: {} as Record<string, number>,
      bySeverity: {} as Record<string, number>,
    },
  );

  return counts;
}

@Injectable()
export class ClinicalAlertsService {
  private readonly logger = new Logger(ClinicalAlertsService.name);
  private readonly overridesByUser = new Map<string, Map<string, AlertActionOverride>>();

  constructor(@Optional() private readonly collaborationHubService?: CollaborationHubService) {}

  listForUser(userId: string, organizationId?: string) {
    const alerts = cloneAlerts(this.getUserOverrides(userId));

    // Best-effort, fire-and-forget: mirror critical demo alerts into an incident
    // channel. Only fires for this hardcoded demo alert set until clinical-alerts
    // becomes a real persisted stream — see docs/DOCUMENTATION_CENTER.md known debt.
    if (organizationId) {
      void this.notifyCriticalAlerts(organizationId, alerts).catch((error) => {
        this.logger.warn(
          `Collaboration hub incident sync failed: ${error instanceof Error ? error.message : String(error)}`,
        );
      });
    }

    return {
      ok: true,
      generatedAt: new Date().toISOString(),
      mode: 'demo',
      safety:
        'Demo clinical alerts are for workflow validation only and are not a bedside alarm source.',
      alerts,
      summary: summarize(alerts),
    };
  }

  private async notifyCriticalAlerts(
    organizationId: string,
    alerts: ClinicalAlert[],
  ): Promise<void> {
    if (!this.collaborationHubService) return;
    const criticalAlerts = alerts.filter(
      (alert) => alert.severity === 'critical' && alert.status !== 'dismissed',
    );
    for (const alert of criticalAlerts) {
      const { channel, created } = await this.collaborationHubService.createIncidentChannel(
        organizationId,
        {
          title: alert.title,
          description: alert.description,
          severity: alert.severity,
          triggerType: 'clinical_alert',
          sourceId: alert.id,
        },
      );
      if (created) {
        await this.collaborationHubService.postSystemMessage(channel.id, {
          body: `${alert.title}: ${alert.description}\nFindings: ${alert.findings.join(', ')}`,
        });
      }
    }
  }

  acknowledge(userId: string, alertId: string, acknowledgedAt?: string) {
    const override: AlertActionOverride = {
      status: 'acknowledged',
      acknowledgedAt: acknowledgedAt || new Date().toISOString(),
      acknowledgedBy: userId,
    };
    const alert = this.applyOverride(userId, alertId, override);

    return {
      ok: true,
      mode: 'demo',
      alert,
      message: 'Alert acknowledged in demo clinical alert state.',
    };
  }

  dismiss(userId: string, alertId: string, reason = '', dismissedAt?: string) {
    const override: AlertActionOverride = {
      status: 'dismissed',
      dismissedAt: dismissedAt || new Date().toISOString(),
      dismissedBy: userId,
      dismissReason: reason,
    };
    const alert = this.applyOverride(userId, alertId, override);

    return {
      ok: true,
      mode: 'demo',
      alert,
      message: 'Alert dismissed in demo clinical alert state.',
    };
  }

  private getUserOverrides(userId: string) {
    if (!this.overridesByUser.has(userId)) {
      this.overridesByUser.set(userId, new Map());
    }
    return this.overridesByUser.get(userId)!;
  }

  private applyOverride(userId: string, alertId: string, override: AlertActionOverride) {
    const baseAlert = BASE_ALERTS.find((alert) => alert.id === alertId);
    if (!baseAlert) {
      return {
        id: alertId,
        timestamp: new Date().toISOString(),
        severity: 'low' as ClinicalAlertSeverity,
        title: 'Unknown alert',
        description: 'The alert was not found in the demo alert set.',
        source: 'Clinical Alerts',
        status: override.status || 'acknowledged',
        findings: [],
        recommendations: [],
        ...override,
      };
    }

    const overrides = this.getUserOverrides(userId);
    overrides.set(alertId, { ...(overrides.get(alertId) || {}), ...override });
    return { ...baseAlert, ...overrides.get(alertId) };
  }
}
