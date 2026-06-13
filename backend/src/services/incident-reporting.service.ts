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

export class IncidentReportingService {
  private readonly incidents: IncidentReport[] = [];
  private readonly notificationConfig = getEnvironmentConfig().notifications;

  reportIncident(input: IncidentReportInput): IncidentReport {
    const incident: IncidentReport = {
      ...input,
      id: `incident-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      status: 'open',
      reportedAt: new Date().toISOString(),
    };
    this.incidents.push(incident);
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
