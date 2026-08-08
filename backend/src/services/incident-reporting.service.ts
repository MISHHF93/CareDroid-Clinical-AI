import { getEnvironmentConfig } from '../config/environment.config';

export interface IncidentReportInput {
  serviceName: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  summary: string;
  patientId?: string;
  reportedBy?: string;
  metadata?: Record<string, unknown>;
}

export interface IncidentReport extends IncidentReportInput {
  id: string;
  status: 'open' | 'reviewing' | 'closed';
  reportedAt: string;
}

const MAX_STORED_INCIDENTS = 500;

export class IncidentReportingService {
  private incidents: IncidentReport[] = [];
  private readonly notificationConfig = getEnvironmentConfig().notifications;

  reportIncident(input: IncidentReportInput): IncidentReport {
    const incident: IncidentReport = {
      ...input,
      id: `incident-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      status: 'open',
      reportedAt: new Date().toISOString(),
    };
    this.incidents.push(incident);
    // Bounded like platform-telemetry.service.ts's apiDurationSamples -- this method now has
    // a real, always-on caller (ApiExceptionFilter, on every unhandled 5xx), so an unbounded
    // array here would be a genuine production memory leak over long backend uptime.
    if (this.incidents.length > MAX_STORED_INCIDENTS) {
      this.incidents = this.incidents.slice(-MAX_STORED_INCIDENTS);
    }
    return { ...incident };
  }

  listIncidents(): IncidentReport[] {
    return this.incidents.map((incident) => ({ ...incident }));
  }

  updateStatus(incidentId: string, status: IncidentReport['status']): IncidentReport | null {
    const incident = this.incidents.find((candidate) => candidate.id === incidentId);
    if (!incident) return null;
    incident.status = status;
    return { ...incident };
  }

  checkHealth() {
    return {
      status: 'ready',
      openIncidents: this.incidents.filter((incident) => incident.status !== 'closed').length,
      escalationRecipients: this.notificationConfig.incidentEscalationEmails.length,
      smsGatewayConfigured: Boolean(this.notificationConfig.surgeSmsGatewayUrl),
    };
  }
}

export const incidentReportingService = new IncidentReportingService();
